import { AccountStatus, Role } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { hashPassword } from "../src/auth/passwords";
import { disconnectDatabase, prisma } from "../src/db/prisma";

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@campus.test`;
}

describe("authentication", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("registers a user with a hashed password and returns tokens", async () => {
    const email = uniqueEmail("register");
    const response = await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "Test Student",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role).toBe(Role.USER);
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.tokens.accessToken).toBeTruthy();
    expect(response.body.data.tokens.refreshToken).toBeTruthy();

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.passwordHash).not.toBe("securePass1");
    expect(stored.passwordHash.startsWith("$2")).toBe(true);
  });

  it("rejects duplicate registration without leaking internals", async () => {
    const email = uniqueEmail("dup");
    await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "First User",
    });

    const response = await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "Second User",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_IN_USE");
  });

  it("logs in with valid credentials and rejects invalid ones generically", async () => {
    const email = uniqueEmail("login");
    await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "Login User",
    });

    const okLogin = await request(app).post("/auth/login").send({
      email,
      password: "securePass1",
    });
    expect(okLogin.status).toBe(200);
    expect(okLogin.body.data.tokens.accessToken).toBeTruthy();

    const badLogin = await request(app).post("/auth/login").send({
      email,
      password: "wrong-password",
    });
    expect(badLogin.status).toBe(401);
    expect(badLogin.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(badLogin.body.error.message).toBe("Invalid email or password");
  });

  it("rejects login for disabled accounts", async () => {
    const email = uniqueEmail("disabled");
    await prisma.user.create({
      data: {
        email,
        fullName: "Disabled User",
        passwordHash: await hashPassword("securePass1"),
        role: Role.USER,
        status: AccountStatus.DISABLED,
      },
    });

    const response = await request(app).post("/auth/login").send({
      email,
      password: "securePass1",
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_DISABLED");
  });

  it("protects /auth/me and returns the current user", async () => {
    const email = uniqueEmail("me");
    const registered = await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "Me User",
    });
    const accessToken = registered.body.data.tokens.accessToken as string;

    const unauthorized = await request(app).get("/auth/me");
    expect(unauthorized.status).toBe(401);

    const authorized = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(authorized.status).toBe(200);
    expect(authorized.body.data.user.email).toBe(email);
    expect(authorized.body.data.user.passwordHash).toBeUndefined();
  });

  it("enforces staff authorization server-side", async () => {
    const studentEmail = uniqueEmail("student");
    const student = await request(app).post("/auth/register").send({
      email: studentEmail,
      password: "securePass1",
      fullName: "Student User",
    });

    const studentDenied = await request(app)
      .get("/auth/staff/ping")
      .set("Authorization", `Bearer ${student.body.data.tokens.accessToken}`);
    expect(studentDenied.status).toBe(403);
    expect(studentDenied.body.error.code).toBe("FORBIDDEN");

    const staffEmail = uniqueEmail("staff");
    const passwordHash = await hashPassword("securePass1");
    await prisma.user.create({
      data: {
        email: staffEmail,
        fullName: "Staff Member",
        passwordHash,
        role: Role.STAFF,
        status: AccountStatus.ACTIVE,
      },
    });
    const staffLogin = await request(app).post("/auth/login").send({
      email: staffEmail,
      password: "securePass1",
    });

    const staffOk = await request(app)
      .get("/auth/staff/ping")
      .set("Authorization", `Bearer ${staffLogin.body.data.tokens.accessToken}`);
    expect(staffOk.status).toBe(200);
    expect(staffOk.body.data.staff).toBe(true);
  });

  it("revokes refresh tokens on logout", async () => {
    const email = uniqueEmail("logout");
    const registered = await request(app).post("/auth/register").send({
      email,
      password: "securePass1",
      fullName: "Logout User",
    });
    const refreshToken = registered.body.data.tokens.refreshToken as string;

    const logout = await request(app).post("/auth/logout").send({ refreshToken });
    expect(logout.status).toBe(200);

    const refresh = await request(app).post("/auth/refresh").send({ refreshToken });
    expect(refresh.status).toBe(401);
    expect(refresh.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });
});
