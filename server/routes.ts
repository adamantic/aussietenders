import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

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
      const result = await storage.getTenders(params);
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

      // Ideally update the tender with cached summary - skipped for now as updateTender not in IStorage MVP
      // await storage.updateTender(tenderId, { aiSummary: summary });

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

  // Seed data on startup
  seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getTenders({ limit: 1 });
  if (existing.total === 0) {
    const sampleTenders = [
      {
        title: "Digital Transformation Services Panel",
        agency: "Department of Customer Service",
        description: "Seeking qualified providers for a whole-of-government digital services panel covering UX design, software engineering, and cloud architecture.",
        source: "NSW eTendering",
        status: "Open",
        value: "5000000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        location: "Sydney, NSW",
        categories: ["IT Services", "Consulting"],
      },
      {
        title: "Facilities Management for Western Sydney Schools",
        agency: "Department of Education",
        description: "Comprehensive facilities management including cleaning, waste management, and grounds maintenance for 15 schools in Western Sydney region.",
        source: "NSW eTendering",
        status: "Open",
        value: "1200000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        location: "Western Sydney, NSW",
        categories: ["Facilities Management", "Cleaning"],
      },
      {
        title: "Cyber Security Audit and Compliance Review",
        agency: "Australian Taxation Office",
        description: "Independent audit of security controls and compliance with ISM frameworks for new payment gateway infrastructure.",
        source: "AusTender",
        status: "Open",
        value: "150000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: "Canberra, ACT",
        categories: ["Cyber Security", "Audit"],
      },
      {
        title: "Construction of Community Center",
        agency: "Inner West Council",
        description: "Construction of new community center including demolition of existing structure, earthworks, and landscaping.",
        source: "TenderSearch",
        status: "Closed",
        value: "3500000.00",
        publishDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        closeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        location: "Marrickville, NSW",
        categories: ["Construction", "Civil Works"],
      }
    ];

    for (const t of sampleTenders) {
      await storage.createTender(t as any);
    }
    console.log("Seeded database with sample tenders");
  }
}
