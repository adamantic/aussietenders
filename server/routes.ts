import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { syncAllTenders, testConnections } from "./tender-sources";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Initialize Chat
  registerChatRoutes(app);

  // === TENDERS ROUTES ===
  app.get(api.tenders.list.path, async (req, res) => {
    try {
      const params = api.tenders.list.input?.parse(req.query) || {};
      // Parse sources from comma-separated string to array
      const sources = params.sources ? params.sources.split(',').filter(Boolean) : undefined;
      const result = await storage.getTenders({ ...params, sources });
      res.json({
        data: result.data,
        total: result.total,
        page: params.page || 1,
        totalPages: Math.ceil(result.total / (params.limit || 20))
      });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Get distinct categories for filter dropdown (must be before :id route)
  app.get("/api/tenders/categories", async (req, res) => {
    try {
      // Get AI-assigned categories (more meaningful for filtering)
      const aiCategories = await storage.getDistinctAICategories();
      // Also get original categories as fallback
      const originalCategories = await storage.getDistinctCategories();
      // Combine and dedupe, preferring AI categories
      const allCategories = Array.from(new Set([...aiCategories, ...originalCategories]));
      res.json(allCategories);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get(api.tenders.get.path, async (req, res) => {
    const tender = await storage.getTender(Number(req.params.id));
    if (!tender) return res.status(404).json({ message: "Tender not found" });
    res.json(tender);
  });

  // AI Summary Endpoint
  app.post(api.tenders.summarize.path, isAuthenticated, async (req, res) => {
    const tenderId = Number(req.params.id);
    const tender = await storage.getTender(tenderId);
    
    if (!tender) return res.status(404).json({ message: "Tender not found" });
    
    // Check cache
    if (tender.aiSummary) {
      return res.json({ summary: tender.aiSummary });
    }

    try {
      const anthropic = new Anthropic({
        apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      });

      const prompt = `Please summarize the following government tender for an SME business owner. 
      Focus on key requirements, deliverables, and mandatory criteria.
      
      Title: ${tender.title}
      Agency: ${tender.agency}
      Description: ${tender.description}
      `;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      
      const contentBlock = message.content[0];
      const summary = contentBlock.type === 'text' ? contentBlock.text : "Unable to generate summary";

      await storage.updateTender(tenderId, { 
        aiSummary: summary, 
        aiEnriched: true, 
        aiEnrichedAt: new Date() 
      });

      res.json({ summary });
    } catch (error) {
      console.error("AI Summary Error:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // === PIPELINE ROUTES ===
  app.get(api.pipeline.list.path, isAuthenticated, async (req: any, res) => {
    const items = await storage.getPipelineItems(req.user.claims.sub);
    res.json(items);
  });

  app.post(api.pipeline.create.path, isAuthenticated, async (req: any, res) => {
    try {
      // Force userId from auth
      const input = api.pipeline.create.input.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const item = await storage.createPipelineItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create pipeline item" });
    }
  });

  app.patch(api.pipeline.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.pipeline.update.input.parse(req.body);
      const updated = await storage.updatePipelineItem(Number(req.params.id), req.user.claims.sub, input);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.pipeline.delete.path, isAuthenticated, async (req: any, res) => {
    await storage.deletePipelineItem(Number(req.params.id), req.user.claims.sub);
    res.status(204).send();
  });

  // === COMPANY ROUTES ===
  app.get(api.company.get.path, isAuthenticated, async (req: any, res) => {
    const company = await storage.getCompany(req.user.claims.sub);
    if (!company) return res.status(404).json({ message: "Profile not found" });
    res.json(company);
  });

  app.post(api.company.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.company.upsert.input.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const company = await storage.upsertCompany(input);
      res.json(company);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === TENDER SYNC ROUTES (Admin, requires authentication) ===
  app.post("/api/admin/sync-tenders", isAuthenticated, async (req, res) => {
    try {
      console.log("[TenderSync] Manual sync triggered");
      const results = await syncAllTenders();
      res.json({ success: true, results });
    } catch (error) {
      console.error("[TenderSync] Sync failed:", error);
      res.status(500).json({ success: false, message: "Sync failed" });
    }
  });

  app.get("/api/admin/sync-status", isAuthenticated, async (req, res) => {
    try {
      const connections = await testConnections();
      const tenderCounts = await storage.getTenders({ limit: 1 });
      res.json({
        connections,
        totalTenders: tenderCounts.total,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check status" });
    }
  });

  // Sync tenders on startup (clear sample data and fetch real data)
  initializeTenders();

  return httpServer;
}

async function initializeTenders() {
  try {
    console.log("[TenderSync] Initializing tender data from government APIs...");
    
    // Sync from real APIs (uses upsert to preserve AI enrichment data)
    const results = await syncAllTenders();
    
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    console.log(`[TenderSync] Initial sync complete: ${totalAdded} added, ${totalUpdated} updated`);
  } catch (error) {
    console.error("[TenderSync] Initial sync failed:", error);
  }
}
