import type { MetadataRoute } from "next";

/** Keep private areas out of search engines. The sitemap is added with the deployment phase. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/seller", "/dashboard", "/api", "/login", "/register"],
      },
    ],
  };
}