import request from "supertest";
import { describe, expect, it } from "vitest";
import { Category } from "../models/Category";
import { Seller } from "../models/Seller";
import { addProduct, makeBrand, makeCategory } from "./public-fixtures";
import { app, createAdminAgent, createSellerUser } from "./helpers";

type Card = { name: string; slug: string };

const names = (body: { data: { items: Card[] } }) => body.data.items.map((item) => item.name);
const get = (path: string) => request(app).get(path);

async function setup() {
  const { seller } = await createSellerUser("ACTIVE");
  const category = await makeCategory("Shoes");
  return { seller, category };
}

describe("visibility", () => {
  it("lists only public products and answers 404 for everything else", async () => {
    const { seller, category } = await setup();
    const inactive = await makeCategory("Retired", { isActive: false });
    const parentOff = await makeCategory("Parent Off", { isActive: false });
    const childOfOff = await makeCategory("Child Of Off", { parent: parentOff._id });

    const visible = await addProduct(seller._id, category._id, { name: "Visible" });
    const hidden = [
      await addProduct(seller._id, category._id, { name: "Draft", status: "DRAFT" }),
      await addProduct(seller._id, category._id, { name: "Pending", status: "PENDING_REVIEW" }),
      await addProduct(seller._id, category._id, { name: "Rejected", status: "REJECTED" }),
      await addProduct(seller._id, category._id, { name: "Hidden", status: "HIDDEN" }),
      await addProduct(seller._id, category._id, { name: "Deleted", deletedAt: new Date() }),
      await addProduct(seller._id, category._id, { name: "Suspended", isSellerActive: false }),
      await addProduct(seller._id, inactive._id, { name: "Inactive Category" }),
      await addProduct(seller._id, childOfOff._id, { name: "Inactive Parent" }),
    ];

    const list = await get("/api/products?limit=50").expect(200);
    expect(names(list.body)).toEqual(["Visible"]);

    await get(`/api/products/${visible.slug}`).expect(200);
    for (const product of hidden) await get(`/api/products/${product.slug}`).expect(404);
  });

  it("follows a seller's suspension and reactivation", async () => {
    const { seller, category } = await setup();
    const product = await addProduct(seller._id, category._id, { name: "Seller Item" });
    const admin = await createAdminAgent();

    await admin
      .patch(`/api/admin/sellers/${seller.id}/suspend`)
      .send({ reason: "Policy violation" })
      .expect(200);
    expect(names((await get("/api/products").expect(200)).body)).toEqual([]);
    await get(`/api/products/${product.slug}`).expect(404);
    await get(`/api/stores/${seller.slug}`).expect(404);

    await admin.patch(`/api/admin/sellers/${seller.id}/reactivate`).expect(200);
    expect(names((await get("/api/products").expect(200)).body)).toEqual(["Seller Item"]);
    await get(`/api/products/${product.slug}`).expect(200);
  });

  it("never exposes private data", async () => {
    const { seller, category } = await setup();
    const product = await addProduct(seller._id, category._id, {
      name: "Secret Stock",
      stock: 37,
      variants: [{ price: 1000, stock: 37 }],
    });

    const list = await get("/api/products").expect(200);
    const detail = await get(`/api/products/${product.slug}`).expect(200);
    const home = await get("/api/home").expect(200);
    const store = await get(`/api/stores/${seller.slug}`).expect(200);

    const forbidden =
      /"sku"|"stock"|"totalStock"|"lowStockThreshold"|"moderat|"publicId"|"deletedAt"|"isSellerActive"|"user"|"tinNumber"|"phone"|"status"/i;
    for (const response of [list, detail, home, store]) {
      expect(JSON.stringify(response.body)).not.toMatch(forbidden);
    }
    expect(JSON.stringify(detail.body)).not.toContain("37");
  });
});

describe("filters", () => {
  it("filters by category, including a top-level category's subcategories", async () => {
    const { seller } = await setup();
    const men = await makeCategory("Men");
    const shoes = await makeCategory("Men Shoes", { parent: men._id });
    const shirts = await makeCategory("Men Shirts", { parent: men._id });
    const women = await makeCategory("Women");

    await addProduct(seller._id, shoes._id, { name: "Sneaker" });
    await addProduct(seller._id, shirts._id, { name: "Shirt" });
    await addProduct(seller._id, women._id, { name: "Dress" });

    expect(names((await get("/api/products?category=men").expect(200)).body).sort()).toEqual([
      "Shirt",
      "Sneaker",
    ]);
    expect(names((await get("/api/products?category=men-shoes").expect(200)).body)).toEqual(["Sneaker"]);
    expect(names((await get("/api/products?category=no-such-category").expect(200)).body)).toEqual([]);
  });

  it("filters by brand (one or several), seller, price, rating, availability and discount", async () => {
    const { seller, category } = await setup();
    const other = await createSellerUser("ACTIVE");
    const nike = await makeBrand("Nike");
    const adidas = await makeBrand("Adidas");

    await addProduct(seller._id, category._id, {
      name: "Nike Cheap",
      brand: nike._id,
      price: 1000,
      rating: 4.5,
      reviews: 10,
    });
    await addProduct(seller._id, category._id, {
      name: "Adidas Mid",
      brand: adidas._id,
      price: 3000,
      discountPercent: 20,
      rating: 3,
      reviews: 5,
    });
    await addProduct(seller._id, category._id, { name: "Plain Gone", price: 5000, stock: 0 });
    await addProduct(other.seller._id, category._id, { name: "Other Seller", price: 2000 });

    const ask = async (query: string) =>
      names((await get(`/api/products?${query}`).expect(200)).body).sort();

    expect(await ask("brand=nike")).toEqual(["Nike Cheap"]);
    expect(await ask("brand=nike,adidas")).toEqual(["Adidas Mid", "Nike Cheap"]);
    expect(await ask("brand=adidas&brand=nike")).toEqual(["Adidas Mid", "Nike Cheap"]);
    expect(await ask("brand=nope")).toEqual([]);
    expect(await ask(`seller=${other.seller.slug}`)).toEqual(["Other Seller"]);
    // Adidas Mid costs 2,400 after its 20% discount, so it is inside 2,000 to 2,500.
    expect(await ask("minPrice=2000&maxPrice=2500")).toEqual(["Adidas Mid", "Other Seller"]);
    expect(await ask("minPrice=2400")).toEqual(["Adidas Mid", "Plain Gone"]);
    expect(await ask("rating=4")).toEqual(["Nike Cheap"]);
    expect(await ask("inStock=1")).toEqual(["Adidas Mid", "Nike Cheap", "Other Seller"]);
    expect(await ask("discount=true")).toEqual(["Adidas Mid"]);
    expect(await ask("brand=adidas&discount=1&inStock=1")).toEqual(["Adidas Mid"]);
  });

  it("uses the discounted price for price filters", async () => {
    const { seller, category } = await setup();
    await addProduct(seller._id, category._id, { name: "On Sale", price: 2000, discountPercent: 50 });

    expect(names((await get("/api/products?maxPrice=1000").expect(200)).body)).toEqual(["On Sale"]);
    expect(names((await get("/api/products?minPrice=1500").expect(200)).body)).toEqual([]);
  });

  it("ignores blank values and rejects invalid queries", async () => {
    const { seller, category } = await setup();
    await addProduct(seller._id, category._id, { name: "Anything" });

    expect(
      names((await get("/api/products?q=&category=&minPrice=&rating=&sort=").expect(200)).body),
    ).toEqual(["Anything"]);

    await get("/api/products?sort=nonsense").expect(400);
    await get("/api/products?limit=500").expect(400);
    await get("/api/products?minPrice=500&maxPrice=100").expect(400);
    await get("/api/products?rating=9").expect(400);
    await get("/api/products?category=Not%20A%20Slug!").expect(400);
  });
});

describe("sorting and pagination", () => {
  async function threeProducts() {
    const { seller, category } = await setup();
    await addProduct(seller._id, category._id, { name: "Item A", price: 1000, sold: 5, rating: 3, reviews: 4 });
    await addProduct(seller._id, category._id, { name: "Item B", price: 3000, sold: 50, rating: 4.5, reviews: 9 });
    await addProduct(seller._id, category._id, { name: "Item C", price: 2000, sold: 20, rating: 4, reviews: 7 });
  }

  it.each([
    ["newest", ["Item C", "Item B", "Item A"]],
    ["price_asc", ["Item A", "Item C", "Item B"]],
    ["price_desc", ["Item B", "Item C", "Item A"]],
    ["rated", ["Item B", "Item C", "Item A"]],
    ["popular", ["Item B", "Item C", "Item A"]],
  ])("sorts by %s", async (sort, expected) => {
    await threeProducts();
    expect(names((await get(`/api/products?sort=${sort}`).expect(200)).body)).toEqual(expected);
  });

  it("defaults to newest, and relevance without a search term is newest", async () => {
    await threeProducts();
    const newest = ["Item C", "Item B", "Item A"];
    expect(names((await get("/api/products").expect(200)).body)).toEqual(newest);
    expect(names((await get("/api/products?sort=relevance").expect(200)).body)).toEqual(newest);
  });

  it("paginates and reports totals", async () => {
    const { seller, category } = await setup();
    for (let i = 1; i <= 5; i += 1) await addProduct(seller._id, category._id, { name: `Item ${i}` });

    const page3 = await get("/api/products?limit=2&page=3").expect(200);
    expect(page3.body.data.items).toHaveLength(1);
    expect(page3.body.data.pagination).toMatchObject({ page: 3, limit: 2, total: 5, totalPages: 3 });

    const beyond = await get("/api/products?limit=2&page=9").expect(200);
    expect(beyond.body.data.items).toEqual([]);
  });
});

describe("search", () => {
  async function catalogue() {
    const { seller, category } = await setup();
    await addProduct(seller._id, category._id, {
      name: "Leather Sneakers",
      description: "Comfortable everyday shoes.",
    });
    await addProduct(seller._id, category._id, {
      name: "Canvas Bag",
      description: "A durable leather trim on every seam.",
    });
    await addProduct(seller._id, category._id, { name: "Ceramic Mug", description: "Holds hot drinks." });
    return seller;
  }

  it("matches whole words and puts name matches before description matches", async () => {
    await catalogue();
    const res = await get("/api/products?q=leather").expect(200);
    expect(names(res.body)).toEqual(["Leather Sneakers", "Canvas Bag"]);
  });

  it("understands simple word forms", async () => {
    await catalogue();
    expect(names((await get("/api/products?q=sneaker").expect(200)).body)).toEqual(["Leather Sneakers"]);
  });

  it("falls back to partial matches in the name", async () => {
    await catalogue();
    expect(names((await get("/api/products?q=sneak").expect(200)).body)).toEqual(["Leather Sneakers"]);
    expect(names((await get("/api/products?q=ERAMIC").expect(200)).body)).toEqual(["Ceramic Mug"]);
  });

  it("returns an empty list for no match and survives special characters", async () => {
    await catalogue();
    expect(names((await get("/api/products?q=zzzzqqq").expect(200)).body)).toEqual([]);
    await get(`/api/products?q=${encodeURIComponent("a(b[c*.?+")}`).expect(200);
  });

  it("combines with filters and explicit sorting", async () => {
    const { seller, category } = await setup();
    await addProduct(seller._id, category._id, { name: "Leather Belt", price: 900 });
    await addProduct(seller._id, category._id, { name: "Leather Wallet", price: 1500 });

    const cheapFirst = await get("/api/products?q=leather&sort=price_asc").expect(200);
    expect(names(cheapFirst.body)).toEqual(["Leather Belt", "Leather Wallet"]);

    const capped = await get("/api/products?q=leather&maxPrice=1000").expect(200);
    expect(names(capped.body)).toEqual(["Leather Belt"]);
  });
});

describe("facets", () => {
  it("counts brands ignoring the brand filter, and keeps selected brands listed", async () => {
    const { seller, category } = await setup();
    const nike = await makeBrand("Nike");
    const adidas = await makeBrand("Adidas");
    await addProduct(seller._id, category._id, { name: "Nike One", brand: nike._id, price: 1000 });
    await addProduct(seller._id, category._id, { name: "Nike Two", brand: nike._id, price: 2000 });
    await addProduct(seller._id, category._id, { name: "Adidas One", brand: adidas._id, price: 5000 });
    await addProduct(seller._id, category._id, { name: "No Brand", price: 800 });

    const all = await get("/api/products").expect(200);
    expect(
      all.body.data.facets.brands.map((b: { name: string; count: number }) => [b.name, b.count]),
    ).toEqual([
      ["Nike", 2],
      ["Adidas", 1],
    ]);
    expect(all.body.data.facets.priceRange).toEqual({ min: 800, max: 5000 });

    // Choosing Adidas keeps it listed, and the price range ignores only the price filter.
    const picked = await get("/api/products?brand=adidas&minPrice=3000").expect(200);
    expect(names(picked.body)).toEqual(["Adidas One"]);
    expect(picked.body.data.facets.brands.map((b: { name: string }) => b.name)).toEqual(["Adidas"]);
    expect(picked.body.data.facets.priceRange).toEqual({ min: 5000, max: 5000 });
  });

  it("returns empty facets when nothing matches", async () => {
    await setup();
    const res = await get("/api/products?category=nothing-here").expect(200);
    expect(res.body.data.facets).toEqual({ brands: [], priceRange: { min: 0, max: 0 } });
  });
});

describe("product detail", () => {
  it("returns the full product with variants, trail, brand and seller", async () => {
    const { seller } = await setup();
    const men = await makeCategory("Men");
    const shoes = await makeCategory("Men Shoes", { parent: men._id });
    const brand = await makeBrand("Addis Leather");

    const product = await addProduct(seller._id, shoes._id, {
      name: "Loafer",
      brand: brand._id,
      discountPercent: 10,
      lowStockThreshold: 5,
      options: [{ name: "Size", values: ["41", "42", "43", "44"] }],
      variants: [
        { price: 2000, stock: 50, optionValues: [{ name: "Size", value: "41" }] },
        { price: 2000, stock: 3, optionValues: [{ name: "Size", value: "42" }] },
        { price: 2000, stock: 0, optionValues: [{ name: "Size", value: "43" }] },
        { price: 2000, stock: 9, optionValues: [{ name: "Size", value: "44" }], isActive: false },
      ],
    });

    const res = await get(`/api/products/${product.slug}`).expect(200);
    const body = res.body.data.product;

    expect(body).toMatchObject({
      name: "Loafer",
      discountPercent: 10,
      minFinalPrice: 1800,
      brand: { name: "Addis Leather" },
      categoryTrail: [{ name: "Men" }, { name: "Men Shoes" }],
      seller: { storeName: seller.storeName, city: "Jimma", region: "Oromia" },
    });
    expect(body.images).toHaveLength(2);

    expect(body.variants).toHaveLength(3);
    const [plenty, low, none] = body.variants;
    expect(plenty).toMatchObject({ finalPrice: 1800, inStock: true, maxQuantity: 10 });
    expect(plenty.stockLeft).toBeUndefined();
    expect(low).toMatchObject({ inStock: true, maxQuantity: 3, stockLeft: 3 });
    expect(none).toMatchObject({ inStock: false, maxQuantity: 0 });
  });

  it("shows related products from the same category first, then the same family", async () => {
    const { seller } = await setup();
    const men = await makeCategory("Men");
    const shoes = await makeCategory("Men Shoes", { parent: men._id });
    const shirts = await makeCategory("Men Shirts", { parent: men._id });
    const women = await makeCategory("Women");

    const main = await addProduct(seller._id, shoes._id, { name: "Main" });
    await addProduct(seller._id, shoes._id, { name: "Same Category" });
    await addProduct(seller._id, shirts._id, { name: "Sibling Category" });
    await addProduct(seller._id, women._id, { name: "Unrelated" });
    await addProduct(seller._id, shoes._id, { name: "Hidden One", status: "HIDDEN" });

    const res = await get(`/api/products/${main.slug}`).expect(200);
    expect(res.body.data.product.related.map((p: Card) => p.name)).toEqual([
      "Same Category",
      "Sibling Category",
    ]);
  });

  it("returns 404 for unknown and malformed slugs", async () => {
    await get("/api/products/does-not-exist").expect(404);
    await get("/api/products/Not%20A%20Slug!").expect(400);
  });
});

describe("stores", () => {
  it("shows an active seller with their visible product count", async () => {
    const { seller, category } = await setup();
    await addProduct(seller._id, category._id, { name: "One Item" });
    await addProduct(seller._id, category._id, { name: "Two Items" });
    await addProduct(seller._id, category._id, { name: "Draft Item", status: "DRAFT" });

    const res = await get(`/api/stores/${seller.slug}`).expect(200);
    expect(res.body.data.store).toMatchObject({
      storeName: seller.storeName,
      slug: seller.slug,
      productCount: 2,
      city: "Jimma",
    });
  });

  it("returns 404 for sellers who are not active, and unknown stores", async () => {
    const pending = await createSellerUser("PENDING");
    await get(`/api/stores/${pending.seller.slug}`).expect(404);
    await get("/api/stores/nope").expect(404);

    const rejected = await createSellerUser("REJECTED");
    await Seller.updateOne({ _id: rejected.seller._id }, { status: "REJECTED" });
    await get(`/api/stores/${rejected.seller.slug}`).expect(404);
  });
});

describe("categories by slug", () => {
  it("returns a category with its parent or children", async () => {
    const men = await makeCategory("Men");
    await makeCategory("Men Shoes", { parent: men._id });
    await makeCategory("Men Old", { parent: men._id, isActive: false });

    const top = await get("/api/categories/men").expect(200);
    expect(top.body.data.parent).toBeNull();
    expect(top.body.data.children.map((c: { name: string }) => c.name)).toEqual(["Men Shoes"]);

    const child = await get("/api/categories/men-shoes").expect(200);
    expect(child.body.data.parent).toMatchObject({ name: "Men" });
    expect(child.body.data.children).toEqual([]);
  });

  it("returns 404 for inactive categories and for children of an inactive parent", async () => {
    const off = await makeCategory("Off", { isActive: false });
    await makeCategory("Off Child", { parent: off._id });

    await get("/api/categories/off").expect(404);
    await get("/api/categories/off-child").expect(404);
    await get("/api/categories/missing").expect(404);
    expect(await Category.countDocuments()).toBe(2);
  });
});

describe("home", () => {
  it("builds its sections from live data and leaves out anything not public", async () => {
    const { seller, category } = await setup();
    const quiet = await createSellerUser("ACTIVE");

    await addProduct(seller._id, category._id, { name: "Old Plain", sold: 1 });
    await addProduct(seller._id, category._id, { name: "Big Deal", discountPercent: 40, sold: 5 });
    await addProduct(seller._id, category._id, { name: "Best Seller", sold: 99 });
    await addProduct(seller._id, category._id, {
      name: "Not Public",
      status: "DRAFT",
      discountPercent: 90,
      sold: 500,
    });
    await addProduct(quiet.seller._id, category._id, { name: "Quiet Draft", status: "DRAFT" });

    const res = await get("/api/home").expect(200);
    const home = res.body.data;

    expect(home.newArrivals.map((p: Card) => p.name)).toEqual(["Best Seller", "Big Deal", "Old Plain"]);
    expect(home.deals.map((p: Card) => p.name)).toEqual(["Big Deal"]);
    expect(home.popular[0].name).toBe("Best Seller");
    expect(home.categories.map((c: { name: string }) => c.name)).toEqual(["Shoes"]);

    // The seller with only a draft has no public products, so is not a "top store".
    expect(home.topStores.map((s: { slug: string }) => s.slug)).toEqual([seller.slug]);
    expect(home.topStores[0].productCount).toBe(3);
  });

  it("works on an empty marketplace", async () => {
    const res = await get("/api/home").expect(200);
    expect(res.body.data).toEqual({
      categories: [],
      newArrivals: [],
      deals: [],
      popular: [],
      topStores: [],
    });
  });
});