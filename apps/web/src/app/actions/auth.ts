"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return { error: "Invalid credentials" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid credentials" };
  }

  await createSession({ id: user.id, email: user.email, name: user.name });
  
  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }
  
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existingUser) {
    return { error: "Email is already registered" };
  }

  const passwordHash = await hashPassword(password);
  
  const [newUser] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning();

  if (!newUser) {
    return { error: "Failed to create user." };
  }

  await createSession({ id: newUser.id, email: newUser.email, name: newUser.name });
  
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
