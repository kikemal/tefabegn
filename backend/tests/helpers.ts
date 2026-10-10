import { AccountStatus, Role } from "@prisma/client";
import request from "supertest";
import type { Express } from "express";
import { hashPassword } from "../src/auth/passwords";
import { prisma } from "../src/db/prisma";

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@campus.test`;
}

export async function registerUser(app: Express, prefix: string) {
  const email = uniqueEmail(prefix);
  const response = await request(app)
    .post("/auth/register")
    .send({
      email,
      password: "securePass1",
      fullName: `${prefix} User`,
    });

  if (response.status !== 201) {
    throw new Error(`registerUser failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return {
    email,
    accessToken: response.body.data.tokens.accessToken as string,
    refreshToken: response.body.data.tokens.refreshToken as string,
    userId: response.body.data.user.id as string,
  };
}

export async function createStaffToken(app: Express, prefix = "staff") {
  const email = uniqueEmail(prefix);
  await prisma.user.create({
    data: {
      email,
      fullName: `${prefix} Staff`,
      passwordHash: await hashPassword("securePass1"),
      role: Role.STAFF,
      status: AccountStatus.ACTIVE,
    },
  });
  const login = await request(app).post("/auth/login").send({
    email,
    password: "securePass1",
  });
  if (login.status !== 200) {
    throw new Error(`createStaffToken login failed: ${login.status}`);
  }
  return login.body.data.tokens.accessToken as string;
}

export function uniqueMarker(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
