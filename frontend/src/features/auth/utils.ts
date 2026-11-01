import type { Role } from "./types";

export function getHomePath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "SELLER":
      return "/seller";
    default:
      return "/dashboard";
  }
}

/** Only same-site relative paths are accepted, to prevent open redirects. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}