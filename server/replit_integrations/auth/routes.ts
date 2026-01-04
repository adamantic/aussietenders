import type { Express } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { authStorage } from "./storage";
import { isAuthenticated, upsertClerkUser } from "./clerkAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const auth = getAuth(req);
      if (!auth.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let user = await authStorage.getUser(auth.userId);
      
      if (!user) {
        const clerkUser = await clerkClient.users.getUser(auth.userId);
        await upsertClerkUser(
          auth.userId,
          clerkUser.emailAddresses[0]?.emailAddress || "",
          clerkUser.firstName || "",
          clerkUser.lastName || ""
        );
        user = await authStorage.getUser(auth.userId);
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
