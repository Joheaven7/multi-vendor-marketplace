import { describe, expect, it } from "vitest";
import { slugify } from "./slug";
import {
  durationToSeconds,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokens";

const USER_ID = "507f1f77bcf86cd799439011";

describe("durationToSeconds", () => {
  it("converts supported units", () => {
    expect(durationToSeconds("30s")).toBe(30);
    expect(durationToSeconds("15m")).toBe(900);
    expect(durationToSeconds("2h")).toBe(7200);
    expect(durationToSeconds("7d")).toBe(604800);
  });

  it("rejects invalid values", () => {
    expect(() => durationToSeconds("abc")).toThrow();
    expect(() => durationToSeconds("10")).toThrow();
  });
});

describe("tokens", () => {
  it("round-trips the user id", () => {
    expect(verifyAccessToken(signAccessToken(USER_ID))).toBe(USER_ID);
    expect(verifyRefreshToken(signRefreshToken(USER_ID))).toBe(USER_ID);
  });

  it("does not accept a refresh token as an access token, or the reverse", () => {
    expect(() => verifyAccessToken(signRefreshToken(USER_ID))).toThrow("Invalid or expired session");
    expect(() => verifyRefreshToken(signAccessToken(USER_ID))).toThrow("Invalid or expired session");
  });

  it("rejects garbage and tampered tokens", () => {
    expect(() => verifyAccessToken("not-a-token")).toThrow();
    const token = signAccessToken(USER_ID);
    expect(() => verifyAccessToken(`${token.slice(0, -2)}xx`)).toThrow();
  });

  it("issues a different refresh token every time", () => {
    expect(signRefreshToken(USER_ID)).not.toBe(signRefreshToken(USER_ID));
  });

  it("hashes deterministically to 64 hex characters", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
    expect(hashToken("abc")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("slugify", () => {
  it("lowercases, strips accents and symbols", () => {
    expect(slugify("Café Addis & Co.")).toBe("cafe-addis-co");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("  ---  ")).toBe("");
    expect(slugify("አበበ")).toBe("");
  });

  it("limits length without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(59)} bbb`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});