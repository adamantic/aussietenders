import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { syncAllTenders, testConnections } from "./tender-sources";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
      const result = await storage.getTenders({ 
        ...params, 
        sources,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      });
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
    const auth = getAuth(req);
    const items = await storage.getPipelineItems(auth.userId!);
    res.json(items);
  });

  app.post(api.pipeline.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const auth = getAuth(req);
      const input = api.pipeline.create.input.parse({
        ...req.body,
        userId: auth.userId!
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
      const auth = getAuth(req);
      const input = api.pipeline.update.input.parse(req.body);
      const updated = await storage.updatePipelineItem(Number(req.params.id), auth.userId!, input);
      if (!updated) return res.status(404).json({ message: "Item not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.pipeline.delete.path, isAuthenticated, async (req: any, res) => {
    const auth = getAuth(req);
    await storage.deletePipelineItem(Number(req.params.id), auth.userId!);
    res.status(204).send();
  });

  // === COMPANY ROUTES ===
  app.get(api.company.get.path, isAuthenticated, async (req: any, res) => {
    const auth = getAuth(req);
    const company = await storage.getCompany(auth.userId!);
    if (!company) return res.status(404).json({ message: "Profile not found" });
    res.json(company);
  });

  app.post(api.company.upsert.path, isAuthenticated, async (req: any, res) => {
    try {
      const auth = getAuth(req);
      const input = api.company.upsert.input.parse({
        ...req.body,
        userId: auth.userId!
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

  // === EXPORT ROUTES ===
  app.get("/api/export/csv", async (req, res) => {
    try {
      const params = api.tenders.list.input?.parse(req.query) || {};
      const sources = params.sources ? params.sources.split(',').filter(Boolean) : undefined;
      const result = await storage.getTenders({ 
        ...params, 
        sources,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        limit: 1000  // Export up to 1000 tenders
      });
      
      // Build CSV
      const headers = ["ID", "Title", "Agency", "Value", "Location", "Status", "Close Date", "Categories", "Source"];
      const rows = result.data.map(t => [
        t.externalId,
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.agency || "").replace(/"/g, '""')}"`,
        t.value || "",
        `"${(t.location || "").replace(/"/g, '""')}"`,
        t.status || "",
        t.closeDate ? new Date(t.closeDate).toISOString().split('T')[0] : "",
        `"${((t.aiCategories || t.categories) as string[] || []).join(", ")}"`,
        t.source || ""
      ].join(","));
      
      const csv = [headers.join(","), ...rows].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="tenders-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  app.get("/api/export/pdf", async (req, res) => {
    try {
      const params = api.tenders.list.input?.parse(req.query) || {};
      const sources = params.sources ? params.sources.split(',').filter(Boolean) : undefined;
      const result = await storage.getTenders({ 
        ...params, 
        sources,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        limit: 100  // Limit PDF to 100 tenders for readability
      });
      
      // Build printable HTML page
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Aussie Tenders Export - ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #1e40af; color: white; padding: 12px 8px; text-align: left; font-size: 12px; }
    td { border-bottom: 1px solid #ddd; padding: 10px 8px; font-size: 11px; vertical-align: top; }
    tr:nth-child(even) { background: #f9fafb; }
    .title { font-weight: bold; color: #111; }
    .value { color: #059669; font-weight: bold; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
    .status-open { background: #dcfce7; color: #166534; }
    .status-closed { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Aussie Tenders Export</h1>
  <p class="meta">Generated on ${new Date().toLocaleString()} | ${result.data.length} tenders</p>
  <table>
    <thead>
      <tr>
        <th style="width: 30%">Tender</th>
        <th style="width: 20%">Agency</th>
        <th style="width: 12%">Value</th>
        <th style="width: 12%">Location</th>
        <th style="width: 12%">Close Date</th>
        <th style="width: 14%">Categories</th>
      </tr>
    </thead>
    <tbody>
      ${result.data.map(t => `
        <tr>
          <td>
            <div class="title">${escapeHtml(t.title || "")}</div>
            <div style="color: #666; font-size: 10px;">${t.externalId}</div>
          </td>
          <td>${escapeHtml(t.agency || "")}</td>
          <td class="value">${t.value ? "$" + Number(t.value).toLocaleString() : "-"}</td>
          <td>${escapeHtml(t.location || "Australia")}</td>
          <td>${t.closeDate ? new Date(t.closeDate).toLocaleDateString() : "-"}</td>
          <td>${((t.aiCategories || t.categories) as string[] || []).slice(0, 2).join(", ")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <script>window.print();</script>
</body>
</html>`;
      
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("PDF export error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
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
