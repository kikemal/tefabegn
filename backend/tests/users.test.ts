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

async function registerUser(prefix: string, fullName = "Profile User") {
  const email = uniqueEmail(prefix);
  const response = await request(app).post("/auth/register").send({
    email,
    password: "securePass1",
    fullName,
  });
  return {
    email,
    accessToken: response.body.data.tokens.accessToken as string,
    userId: response.body.data.user.id as string,
  };
}

describe("user profile module", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("requires authentication to view own profile", async () => {
    const response = await request(app).get("/users/me");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns own privacy-safe profile including role and status", async () => {
    const user = await registerUser("own");

    const response = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      id: user.userId,
      email: user.email,
      role: Role.USER,
      status: AccountStatus.ACTIVE,
    });
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("updates permitted own profile fields only", async () => {
    const user = await registerUser("update", "Before Name");
    const nextEmail = uniqueEmail("updated");

    const response = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        fullName: "After Name",
        email: nextEmail,
        role: Role.STAFF,
        status: AccountStatus.DISABLED,
        passwordHash: "should-be-rejected",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    const allowed = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        fullName: "After Name",
        email: nextEmail,
      });

    expect(allowed.status).toBe(200);
    expect(allowed.body.data.user.fullName).toBe("After Name");
    expect(allowed.body.data.user.email).toBe(nextEmail);
    expect(allowed.body.data.user.role).toBe(Role.USER);
    expect(allowed.body.data.user.status).toBe(AccountStatus.ACTIVE);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    expect(stored.role).toBe(Role.USER);
    expect(stored.status).toBe(AccountStatus.ACTIVE);
    expect(stored.passwordHash.startsWith("$2")).toBe(true);
  });

  it("prevents a user from reading another user's private profile", async () => {
    const alice = await registerUser("alice");
    const bob = await registerUser("bob");

    const response = await request(app)
      .get(`/users/${bob.userId}`)
      .set("Authorization", `Bearer ${alice.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("allows a user to read their own profile by id", async () => {
    const user = await registerUser("selfid");

    const response = await request(app)
      .get(`/users/${user.userId}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(user.userId);
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("allows staff to view another user's privacy-safe profile", async () => {
    const target = await registerUser("target");
    const staffEmail = uniqueEmail("staff");
    await prisma.user.create({
      data: {
        email: staffEmail,
        fullName: "Staff Member",
        passwordHash: await hashPassword("securePass1"),
        role: Role.STAFF,
        status: AccountStatus.ACTIVE,
      },
    });
    const staffLogin = await request(app).post("/auth/login").send({
      email: staffEmail,
      password: "securePass1",
    });

    const response = await request(app)
      .get(`/users/${target.userId}`)
      .set("Authorization", `Bearer ${staffLogin.body.data.tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(target.userId);
    expect(response.body.data.user.email).toBe(target.email);
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });
});
