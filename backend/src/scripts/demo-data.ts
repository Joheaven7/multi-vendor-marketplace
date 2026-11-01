import type { ProductStatus } from "../models/Product";
import type { SellerStatus } from "../models/Seller";
import { slugify } from "../utils/slug";

/** Every demo account uses this password. The seed refuses to run in production. */
export const DEMO_PASSWORD = "Demo1234!";

/* ------------------------------- categories ------------------------------- */

export const DEMO_CATEGORIES = [
  {
    slug: "men",
    name: "Men",
    children: [
      { slug: "men-shoes", name: "Shoes" },
      { slug: "men-clothing", name: "Clothing" },
      { slug: "men-accessories", name: "Accessories" },
    ],
  },
  {
    slug: "women",
    name: "Women",
    children: [
      { slug: "women-shoes", name: "Shoes" },
      { slug: "women-clothing", name: "Clothing" },
      { slug: "women-bags", name: "Bags" },
    ],
  },
  {
    slug: "electronics",
    name: "Electronics",
    children: [
      { slug: "electronics-phones", name: "Phones" },
      { slug: "electronics-audio", name: "Audio" },
    ],
  },
  {
    slug: "home-living",
    name: "Home & Living",
    children: [
      { slug: "home-kitchen", name: "Kitchen" },
      { slug: "home-decor", name: "Decor" },
    ],
  },
];

/** Fictional brands, so no real trademarks appear in the portfolio demo. */
export const DEMO_BRANDS = [
  { slug: "addis-leather", name: "Addis Leather" },
  { slug: "habesha-atelier", name: "Habesha Atelier" },
  { slug: "zenith-audio", name: "Zenith Audio" },
  { slug: "nile-tech", name: "Nile Tech" },
  { slug: "lalibela-home", name: "Lalibela Home" },
];

/* --------------------------------- accounts -------------------------------- */

export const DEMO_CUSTOMER = { name: "Hanna Bekele", email: "customer.demo@example.com" };

export type DemoSeller = {
  key: string;
  owner: { name: string; email: string };
  status: SellerStatus;
  storeName: string;
  businessName: string;
  phone: string;
  description: string;
  tinNumber?: string;
  address: { region: string; city: string; subcity?: string };
};

export const DEMO_SELLERS: DemoSeller[] = [
  {
    key: "abebe",
    owner: { name: "Abebe Kebede", email: "seller.abebe@example.com" },
    status: "ACTIVE",
    storeName: "Abebe Electronics",
    businessName: "Abebe Trading PLC",
    phone: "0911223344",
    description: "Phones, audio and accessories from Jimma.",
    tinNumber: "0012345678",
    address: { region: "Oromia", city: "Jimma", subcity: "Hirmata" },
  },
  {
    key: "addis",
    owner: { name: "Meron Tadesse", email: "seller.addis@example.com" },
    status: "ACTIVE",
    storeName: "Addis Leather House",
    businessName: "Addis Leather PLC",
    phone: "0922334455",
    description: "Handmade leather shoes, bags and accessories from Addis Ababa.",
    address: { region: "Addis Ababa", city: "Addis Ababa", subcity: "Bole" },
  },
  {
    key: "lalibela",
    owner: { name: "Dawit Alemu", email: "seller.lalibela@example.com" },
    status: "ACTIVE",
    storeName: "Lalibela Home",
    businessName: "Lalibela Crafts",
    phone: "0933445566",
    description: "Traditional and modern home goods from Bahir Dar.",
    address: { region: "Amhara", city: "Bahir Dar" },
  },
  {
    // A pending application, so the admin approval queue has something to review.
    key: "selam",
    owner: { name: "Selam Haile", email: "seller.selam@example.com" },
    status: "PENDING",
    storeName: "Selam Boutique",
    businessName: "Selam Fashion",
    phone: "0944556677",
    description: "Contemporary fashion inspired by Ethiopian textiles.",
    address: { region: "Sidama", city: "Hawassa" },
  },
];

/* --------------------------------- products -------------------------------- */

export type DemoVariant = {
  sku: string;
  price: number;
  stock: number;
  optionValues: Record<string, string>;
};

export type DemoProduct = {
  seller: string;
  category: string;
  brand?: string;
  name: string;
  description: string;
  status: ProductStatus;
  discountPercent: number;
  lowStockThreshold: number;
  moderationReason?: string;
  specifications: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  variants: DemoVariant[];
};

const PALETTE = [
  ["EFE9DD", "8A6A3D"],
  ["E7ECF4", "2F4B7C"],
  ["EAF1EC", "2F6B4F"],
  ["F4E9E6", "9A4A3C"],
];

/** Neutral labelled placeholders. Replace them with real photos from the seller dashboard. */
export function demoImages(name: string, count = 2) {
  const slug = slugify(name);
  return Array.from({ length: count }, (_, index) => {
    const [background, foreground] = PALETTE[(name.length + index) % PALETTE.length];
    return {
      url: `https://placehold.co/800x800/${background}/${foreground}/png?text=${encodeURIComponent(name)}`,
      publicId: `seed/${slug}-${index + 1}`,
    };
  });
}

const spec = (label: string, value: string) => ({ label, value });

const single = (sku: string, price: number, stock: number): DemoVariant[] => [
  { sku, price, stock, optionValues: {} },
];

/** One variant per value of a single option, e.g. sizes with their own stock. */
const byOption = (
  prefix: string,
  option: string,
  price: number,
  entries: [value: string, stock: number][],
): DemoVariant[] =>
  entries.map(([value, stock]) => ({
    sku: `${prefix}-${value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`,
    price,
    stock,
    optionValues: { [option]: value },
  }));

export const DEMO_PRODUCTS: DemoProduct[] = [
  /* ---------------------------- Abebe Electronics ---------------------------- */
  {
    seller: "abebe",
    category: "electronics-phones",
    brand: "nile-tech",
    name: "Nile Phone A55",
    description:
      "A reliable everyday smartphone with a bright 6.6 inch AMOLED display, a two-day battery and a 50 MP camera. Comes with a charger and a protective case.",
    status: "PUBLISHED",
    discountPercent: 5,
    lowStockThreshold: 5,
    specifications: [
      spec("Display", '6.6" AMOLED'),
      spec("Battery", "5000 mAh"),
      spec("Main camera", "50 MP"),
    ],
    options: [
      { name: "Color", values: ["Black", "Blue"] },
      { name: "Storage", values: ["128GB", "256GB"] },
    ],
    variants: [
      { sku: "A55-BLK-128", price: 20000, stock: 12, optionValues: { Color: "Black", Storage: "128GB" } },
      { sku: "A55-BLK-256", price: 24000, stock: 8, optionValues: { Color: "Black", Storage: "256GB" } },
      { sku: "A55-BLU-128", price: 20000, stock: 3, optionValues: { Color: "Blue", Storage: "128GB" } },
      { sku: "A55-BLU-256", price: 24000, stock: 0, optionValues: { Color: "Blue", Storage: "256GB" } },
    ],
  },
  {
    seller: "abebe",
    category: "electronics-audio",
    brand: "zenith-audio",
    name: "Zenith Wireless Earbuds",
    description:
      "True wireless earbuds with active noise reduction, 28 hours of total playback with the case, and a secure fit for workouts.",
    status: "PUBLISHED",
    discountPercent: 0,
    lowStockThreshold: 5,
    specifications: [spec("Playback", "28 hours with case"), spec("Water resistance", "IPX4")],
    options: [{ name: "Color", values: ["Black", "White"] }],
    variants: byOption("ZEB", "Color", 3500, [
      ["Black", 25],
      ["White", 40],
    ]),
  },
  {
    seller: "abebe",
    category: "electronics-audio",
    brand: "zenith-audio",
    name: "Zenith Studio Headphones",
    description:
      "Over-ear studio headphones with a flat, detailed sound, a detachable cable and replaceable ear pads. Folds flat for travel.",
    status: "PUBLISHED",
    discountPercent: 15,
    lowStockThreshold: 5,
    specifications: [spec("Driver", "40 mm"), spec("Cable", "Detachable, 2 m")],
    options: [],
    variants: single("ZSH-001", 6800, 4),
  },
  {
    seller: "abebe",
    category: "electronics-phones",
    brand: "nile-tech",
    name: "Nile Power Bank 20000 mAh",
    description:
      "A slim 20,000 mAh power bank with two fast-charging USB ports and a USB-C input. Charges most phones four times.",
    status: "PENDING_REVIEW",
    discountPercent: 0,
    lowStockThreshold: 5,
    specifications: [spec("Capacity", "20,000 mAh"), spec("Output", "22.5 W")],
    options: [],
    variants: single("NPB-20K", 1800, 50),
  },

  /* ---------------------------- Addis Leather House --------------------------- */
  {
    seller: "addis",
    category: "men-shoes",
    brand: "addis-leather",
    name: "Classic Leather Sneakers",
    description:
      "Minimal sneakers made from full-grain leather with a cushioned insole and a durable rubber sole. They soften and improve with wear.",
    status: "PUBLISHED",
    discountPercent: 10,
    lowStockThreshold: 5,
    specifications: [spec("Material", "Full-grain leather"), spec("Sole", "Rubber"), spec("Made in", "Ethiopia")],
    options: [{ name: "Size", values: ["40", "41", "42", "43", "44"] }],
    variants: byOption("CLS", "Size", 2400, [
      ["40", 5],
      ["41", 10],
      ["42", 8],
      ["43", 6],
      ["44", 2],
    ]),
  },
  {
    seller: "addis",
    category: "men-shoes",
    brand: "addis-leather",
    name: "Handstitched Leather Loafers",
    description:
      "Slip-on loafers hand-stitched by our artisans in Addis Ababa. Vegetable-tanned leather, lined with soft calfskin.",
    status: "PUBLISHED",
    discountPercent: 0,
    lowStockThreshold: 3,
    specifications: [spec("Material", "Vegetable-tanned leather"), spec("Lining", "Calfskin")],
    options: [{ name: "Size", values: ["41", "42", "43"] }],
    variants: byOption("HSL", "Size", 3200, [
      ["41", 4],
      ["42", 7],
      ["43", 9],
    ]),
  },
  {
    seller: "addis",
    category: "women-bags",
    brand: "addis-leather",
    name: "Everyday Leather Tote",
    description:
      "A roomy tote with an inner zip pocket and reinforced handles. Fits a 14 inch laptop, a water bottle and everything else you carry.",
    status: "PUBLISHED",
    discountPercent: 20,
    lowStockThreshold: 5,
    specifications: [spec("Dimensions", "38 x 30 x 12 cm"), spec("Closure", "Magnetic snap")],
    options: [{ name: "Color", values: ["Tan", "Black"] }],
    variants: byOption("EDT", "Color", 4500, [
      ["Tan", 6],
      ["Black", 9],
    ]),
  },
  {
    seller: "addis",
    category: "men-accessories",
    brand: "addis-leather",
    name: "Minimal Leather Belt",
    description: "A clean, adjustable belt in full-grain leather with a brushed metal buckle.",
    status: "PUBLISHED",
    discountPercent: 0,
    lowStockThreshold: 5,
    specifications: [spec("Width", "3.2 cm"), spec("Material", "Full-grain leather")],
    options: [],
    variants: single("MLB-001", 900, 30),
  },
  {
    seller: "addis",
    category: "women-clothing",
    brand: "habesha-atelier",
    name: "Woven Cotton Shawl",
    description: "A lightweight hand-woven cotton shawl with a traditional border. Soft, breathable and easy to style.",
    status: "DRAFT",
    discountPercent: 0,
    lowStockThreshold: 5,
    specifications: [spec("Material", "100% cotton")],
    options: [],
    variants: single("WCS-001", 1500, 15),
  },

  /* ------------------------------- Lalibela Home ------------------------------ */
  {
    seller: "lalibela",
    category: "home-kitchen",
    brand: "lalibela-home",
    name: "Hand-Painted Ceramic Mug Set",
    description:
      "A set of four hand-painted ceramic mugs. Each is slightly different, glazed to be dishwasher and microwave safe.",
    status: "PUBLISHED",
    discountPercent: 5,
    lowStockThreshold: 5,
    specifications: [spec("Pieces", "4"), spec("Capacity", "300 ml each")],
    options: [],
    variants: single("HCM-004", 1200, 18),
  },
  {
    seller: "lalibela",
    category: "home-decor",
    brand: "lalibela-home",
    name: "Woven Basket (Mesob)",
    description:
      "A traditional mesob woven from natural grass and dyed fibres. Use it for serving, storage or as a statement piece.",
    status: "PUBLISHED",
    discountPercent: 0,
    lowStockThreshold: 3,
    specifications: [spec("Material", "Grass and dyed fibre"), spec("Handmade", "Yes")],
    options: [{ name: "Size", values: ["Small", "Medium", "Large"] }],
    variants: [
      { sku: "MES-S", price: 1800, stock: 7, optionValues: { Size: "Small" } },
      { sku: "MES-M", price: 2600, stock: 5, optionValues: { Size: "Medium" } },
      { sku: "MES-L", price: 3600, stock: 2, optionValues: { Size: "Large" } },
    ],
  },
  {
    seller: "lalibela",
    category: "home-decor",
    brand: "lalibela-home",
    name: "Cotton Throw Blanket",
    description: "A heavy, soft cotton throw with a woven texture. Machine washable.",
    status: "PUBLISHED",
    discountPercent: 10,
    lowStockThreshold: 5,
    specifications: [spec("Size", "130 x 170 cm"), spec("Material", "Cotton")],
    options: [{ name: "Color", values: ["Cream", "Terracotta"] }],
    variants: byOption("CTB", "Color", 2100, [
      ["Cream", 11],
      ["Terracotta", 0],
    ]),
  },
  {
    seller: "lalibela",
    category: "home-kitchen",
    brand: "lalibela-home",
    name: "Brass Coffee Pot (Jebena)",
    description: "A brass jebena for traditional coffee ceremonies.",
    status: "REJECTED",
    moderationReason: "Product photos do not show the item clearly. Please add photos from several angles.",
    discountPercent: 0,
    lowStockThreshold: 5,
    specifications: [spec("Material", "Brass")],
    options: [],
    variants: single("JEB-001", 2800, 6),
  },
];

/**
 * Sample ratings and sales for the published products, keyed by product slug, so that the
 * "Most popular" and "Highest rated" sorts look realistic. Real numbers come from orders and
 * reviews in later phases.
 */
export const DEMO_METRICS: Record<string, { rating: number; reviews: number; sold: number }> = {
  "nile-phone-a55": { rating: 4.7, reviews: 128, sold: 214 },
  "zenith-wireless-earbuds": { rating: 4.5, reviews: 86, sold: 342 },
  "zenith-studio-headphones": { rating: 4.8, reviews: 41, sold: 67 },
  "classic-leather-sneakers": { rating: 4.6, reviews: 97, sold: 188 },
  "handstitched-leather-loafers": { rating: 4.9, reviews: 33, sold: 54 },
  "everyday-leather-tote": { rating: 4.4, reviews: 58, sold: 121 },
  "minimal-leather-belt": { rating: 4.3, reviews: 24, sold: 99 },
  "hand-painted-ceramic-mug-set": { rating: 4.7, reviews: 19, sold: 45 },
  "woven-basket-mesob": { rating: 4.8, reviews: 12, sold: 28 },
  "cotton-throw-blanket": { rating: 4.2, reviews: 9, sold: 31 },
};