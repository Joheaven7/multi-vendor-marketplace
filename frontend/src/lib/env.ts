export const env = {
  // The browser calls the same origin. Next.js forwards /api/* to Express (see next.config.ts).
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "/api",
};