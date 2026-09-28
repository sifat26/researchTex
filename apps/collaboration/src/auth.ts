import * as jose from "jose";

export async function verifyCollabToken(token: string, projectId: string): Promise<boolean> {
  if (!token) return false;
  
  try {
    // Use JWT_SECRET (same as web app) with the same fallback
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || process.env.SESSION_SECRET || "development_super_secret_key_change_me_in_production"
    );
    
    const { payload } = await jose.jwtVerify(token, secret);
    
    if (payload.projectId !== projectId) {
      return false;
    }
    
    // As long as they have a valid token for this project, they can connect to Yjs
    // Finer-grained read vs write permissions in Yjs require custom awareness/updates filtering,
    // but for Phase 9, connecting is proof of access (VIEWER/EDITOR/OWNER).
    return true;
  } catch (error) {
    console.error("Collab token verification failed:", error);
    return false;
  }
}
