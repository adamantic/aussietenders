import { clerkMiddleware, getAuth, requireAuth } from "@clerk/express";
import type { Express, RequestHandler } from "express";
import { authStorage } from "./storage";

export function setupClerkAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(clerkMiddleware({
    publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }));
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  
  if (!auth.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user info to request for downstream use
  (req as any).clerkAuth = auth;
  next();
};

export async function upsertClerkUser(userId: string, email: string, firstName?: string, lastName?: string, profileImageUrl?: string) {
  await authStorage.upsertUser({
    id: userId,
    email: email || "",
    firstName: firstName || "",
    lastName: lastName || "",
    profileImageUrl: profileImageUrl || "",
  });
}
