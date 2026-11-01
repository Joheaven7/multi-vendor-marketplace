import request from "supertest";
import { describe, expect, it } from "vitest";
import { User } from "../models/User";
import { hashToken } from "../utils/tokens";
import { PASSWORD, app, createUser, getCookie, loginAs } from "./helpers";

const valid = { name: "Hanna Bekele", email: "hanna@example.com", password: PASSWORD };

describe("POST /api/auth/register", () => {
  it("creates a customer and sets httpOnly cookies", async () => {
    const res = await request(app).post("/api/auth/register").send(valid).expect(201);

    expect(res.body.data.user).toMatchObject({
      email: valid.email,
      role: "CUSTOMER",
      status: "ACTIVE",
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.sessions).toBeUndefined();

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("access_token=") && c.includes("HttpOnly"))).toBe(true);
    expect(
      cookies.some((c) => c.startsWith("refresh_token=") && c.includes("HttpOnly") && c.includes("Path=/api/auth")),
    ).toBe(true);
  });

  it("cannot be used to create an admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...valid, role: "ADMIN" })
      .expect(201);

    expect(res.body.data.user.role).toBe("CUSTOMER");
  });

  it("stores a bcrypt hash, never the password", async () => {
    await request(app).post("/api/auth/register").send(valid).expect(201);

    const user = await User.findOne({ email: valid.email }).select("+passwordHash");
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user?.passwordHash).not.toContain(PASSWORD);
  });

  it("stores only a hash of the refresh token", async () => {
    const res = await request(app).post("/api/auth/register").send(valid).expect(201);
    const refreshToken = getCookie(res, "refresh_token")!;

    const user = await User.findOne({ email: valid.email }).select("+sessions");
    expect(user?.sessions).toHaveLength(1);
    expect(user?.sessions[0].tokenHash).toBe(hashToken(refreshToken));
    expect(user?.sessions[0].tokenHash).not.toBe(refreshToken);
  });

  it("rejects a duplicate email regardless of case", async () => {
    await request(app).post("/api/auth/register").send(valid).expect(201);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...valid, email: "HANNA@Example.com" })
      .expect(409);

    expect(res.body.error.code).toBe("CONFLICT");
  });

  it.each([
    ["too short", "Ab1"],
    ["no number", "OnlyLetters"],
    ["no letter", "12345678"],
  ])("rejects a weak password (%s)", async (_label, password) => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...valid, password })
      .expect(400);

    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns field-level validation details", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "not-an-email", password: PASSWORD })
      .expect(400);

    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["name", "email"]));
  });
});

describe("POST /api/auth/login", () => {
  it("signs in and records the login time", async () => {
    const user = await createUser();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD })
      .expect(200);

    expect(getCookie(res, "access_token")).toBeTruthy();
    const saved = await User.findById(user.id);
    expect(saved?.lastLoginAt).toBeInstanceOf(Date);
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const user = await createUser();

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPass1" })
      .expect(401);
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: PASSWORD })
      .expect(401);

    expect(wrongPassword.body.error).toEqual(unknownEmail.body.error);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("refuses a suspended account", async () => {
    const user = await createUser({ status: "SUSPENDED" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD })
      .expect(403);

    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("keeps at most five sessions", async () => {
    const user = await createUser();
    for (let i = 0; i < 6; i += 1) await loginAs(user.email);

    const saved = await User.findById(user.id).select("+sessions");
    expect(saved?.sessions).toHaveLength(5);
  });
});

describe("GET /api/auth/me", () => {
  it("requires a session", async () => {
    await request(app).get("/api/auth/me").expect(401);
    await request(app).get("/api/auth/me").set("Cookie", "access_token=garbage").expect(401);
  });

  it("returns the signed-in user", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);
    const res = await agent.get("/api/auth/me").expect(200);

    expect(res.body.data.user.email).toBe(user.email);
  });

  it("blocks a user who is suspended while signed in", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);
    await User.updateOne({ _id: user.id }, { status: "SUSPENDED" });

    const res = await agent.get("/api/auth/me").expect(403);
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("POST /api/auth/refresh", () => {
  it("rotates the refresh token and rejects the old one", async () => {
    const reg = await request(app).post("/api/auth/register").send(valid).expect(201);
    const oldToken = getCookie(reg, "refresh_token")!;

    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${oldToken}`)
      .expect(200);
    const newToken = getCookie(refreshed, "refresh_token")!;
    expect(newToken).not.toBe(oldToken);

    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${oldToken}`)
      .expect(401);
  });

  it("revokes every session when an old token is replayed", async () => {
    const reg = await request(app).post("/api/auth/register").send(valid).expect(201);
    const oldToken = getCookie(reg, "refresh_token")!;

    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${oldToken}`)
      .expect(200);
    const newToken = getCookie(refreshed, "refresh_token")!;

    // An attacker replays the stolen, already-used token...
    await request(app).post("/api/auth/refresh").set("Cookie", `refresh_token=${oldToken}`).expect(401);

    // ...and the legitimate newest token is now dead too.
    await request(app).post("/api/auth/refresh").set("Cookie", `refresh_token=${newToken}`).expect(401);

    const user = await User.findOne({ email: valid.email }).select("+sessions");
    expect(user?.sessions).toHaveLength(0);
  });

  it("fails without a cookie and clears any leftovers", async () => {
    const res = await request(app).post("/api/auth/refresh").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("does not refresh a suspended account", async () => {
    const reg = await request(app).post("/api/auth/register").send(valid).expect(201);
    const token = getCookie(reg, "refresh_token")!;
    await User.updateOne({ email: valid.email }, { status: "SUSPENDED" });

    await request(app).post("/api/auth/refresh").set("Cookie", `refresh_token=${token}`).expect(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("ends the session and invalidates the refresh token", async () => {
    const reg = await request(app).post("/api/auth/register").send(valid).expect(201);
    const refreshToken = getCookie(reg, "refresh_token")!;
    const accessToken = getCookie(reg, "access_token")!;

    await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `refresh_token=${refreshToken}; access_token=${accessToken}`)
      .expect(200);

    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect(401);
  });

  it("is safe to call when already signed out", async () => {
    await request(app).post("/api/auth/logout").expect(200);
  });
});

describe("profile", () => {
  it("updates the name and phone, and can clear the phone", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);

    const updated = await agent
      .patch("/api/users/me")
      .send({ name: "New Name", phone: "0911223344" })
      .expect(200);
    expect(updated.body.data.user).toMatchObject({ name: "New Name", phone: "0911223344" });

    const cleared = await agent.patch("/api/users/me").send({ phone: null }).expect(200);
    expect(cleared.body.data.user.phone).toBeUndefined();
  });

  it("rejects an invalid phone number and an empty update", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);

    await agent.patch("/api/users/me").send({ phone: "12345" }).expect(400);
    await agent.patch("/api/users/me").send({}).expect(400);
  });

  it("cannot change the role or email through the profile endpoint", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);

    await agent
      .patch("/api/users/me")
      .send({ name: "Same Person", role: "ADMIN", email: "other@example.com" })
      .expect(200);

    const saved = await User.findById(user.id);
    expect(saved?.role).toBe("CUSTOMER");
    expect(saved?.email).toBe(user.email);
  });
});

describe("PATCH /api/users/me/password", () => {
  it("rejects a wrong current password", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);

    const res = await agent
      .patch("/api/users/me/password")
      .send({ currentPassword: "WrongPass1", newPassword: "BrandNew123" })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_PASSWORD");
  });

  it("signs the user out everywhere and switches to the new password", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);
    const otherDevice = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    const otherRefresh = getCookie(otherDevice, "refresh_token")!;

    await agent
      .patch("/api/users/me/password")
      .send({ currentPassword: PASSWORD, newPassword: "BrandNew123" })
      .expect(200);

    // Every refresh token is dead.
    await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${otherRefresh}`)
      .expect(401);

    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: PASSWORD })
      .expect(401);
    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "BrandNew123" })
      .expect(200);
  });

  it("requires the new password to differ", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);

    await agent
      .patch("/api/users/me/password")
      .send({ currentPassword: PASSWORD, newPassword: PASSWORD })
      .expect(400);
  });
});

describe("origin check (CSRF defence)", () => {
  it("rejects state-changing requests from another origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: "a@example.com", password: PASSWORD })
      .expect(403);

    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows the real frontend origin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "a@example.com", password: PASSWORD });

    // Passes the origin check, then fails on credentials.
    expect(res.status).toBe(401);
  });
});