import * as jose from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, projectMembers, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// JWT Secret Key
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || "development_super_secret_key_change_me_in_production";
  return new TextEncoder().encode(secret);
};

interface SessionPayload extends jose.JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; email: string; name: string }) {
  const jwt = await new jose.SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set("auth_session", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());
    return payload as SessionPayload;
  } catch (err) {
    return null;
  }
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Ensures the authenticated user has access to a project.
 * If requiredRole is provided, ensures they meet the minimum role.
 * Role Hierarchy: OWNER > EDITOR > VIEWER
 */
export async function requireProjectAccess(
  projectId: string,
  requiredRole?: "OWNER" | "EDITOR" | "VIEWER"
): Promise<{ userId: string; role: string }> {
  const session = await requireAuth();
  
  // 1. Check if owner
  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.ownerId === session.userId) {
    return { userId: session.userId, role: "OWNER" };
  }

  // 2. Check membership
  const [member] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.userId)));

  if (!member) {
    throw new Error("Forbidden: You do not have access to this project");
  }

  // Role validation
  if (requiredRole) {
    const levels = { OWNER: 3, EDITOR: 2, VIEWER: 1 };
    const userLevel = levels[member.role as keyof typeof levels] || 0;
    const reqLevel = levels[requiredRole];

    if (userLevel < reqLevel) {
      throw new Error("Forbidden: Insufficient role permissions");
    }
  }

  return { userId: session.userId, role: member.role };
}

/**
 * Creates a short-lived token for WebSocket collaboration to prove the user has access.
 */
export async function createCollabToken(projectId: string): Promise<string> {
  const { userId, role } = await requireProjectAccess(projectId);
  
  const token = await new jose.SignJWT({
    userId,
    projectId,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h") // Token is short lived
    .sign(getJwtSecret());

  return token;
}
