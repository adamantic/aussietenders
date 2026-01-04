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
        closeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
        categories: ["IT Services", "Consulting"],
      },
      {
        title: "Road Maintenance Contract - Parramatta Region",
        agency: "Transport for NSW",
        description: "Annual contract for road maintenance, pothole repair, line marking, and signage replacement across the Parramatta local government area.",
        source: "NSW eTendering",
        status: "Open",
        value: "2800000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        location: "Parramatta, NSW",
        categories: ["Construction", "Infrastructure"],
      },
      {
        title: "Healthcare IT Systems Integration",
        agency: "Department of Health",
        description: "Integration of patient management systems across 12 regional hospitals, including data migration and staff training programs.",
        source: "AusTender",
        status: "Open",
        value: "3200000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        location: "National",
        categories: ["IT Services", "Health"],
      },
      {
        title: "Office Furniture Supply Contract",
        agency: "Department of Finance",
        description: "Supply of ergonomic office furniture including standing desks, chairs, and collaborative workspace solutions for new government office fit-out.",
        source: "AusTender",
        status: "Open",
        value: "450000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        location: "Canberra, ACT",
        categories: ["Supplies", "Furniture"],
      },
      {
        title: "Environmental Impact Assessment - Hunter Valley",
        agency: "NSW Environment Protection Authority",
        description: "Comprehensive environmental impact assessment for proposed industrial development including air quality, water, and biodiversity studies.",
        source: "NSW eTendering",
        status: "Open",
        value: "280000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        location: "Hunter Valley, NSW",
        categories: ["Consulting", "Environmental"],
      },
      {
        title: "Fleet Vehicle Leasing Program",
        agency: "Department of Defence",
        description: "Long-term leasing arrangement for 200+ light and medium vehicles including maintenance, fuel cards, and telematics systems.",
        source: "AusTender",
        status: "Open",
        value: "8500000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        location: "National",
        categories: ["Supplies", "Transport"],
      },
      {
        title: "School Building Upgrades - Northern Beaches",
        agency: "NSW Department of Education",
        description: "Major building upgrades for 8 primary schools including new HVAC systems, roof replacement, and accessibility improvements.",
        source: "NSW eTendering",
        status: "Open",
        value: "4200000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: "Northern Beaches, NSW",
        categories: ["Construction", "Building"],
      },
      {
        title: "Legal Services Panel - Commercial Law",
        agency: "Attorney-General's Department",
        description: "Establishment of a panel of legal service providers for commercial law advice including contracts, procurement, and intellectual property matters.",
        source: "AusTender",
        status: "Open",
        value: "1500000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        location: "National",
        categories: ["Consulting", "Legal"],
      },
      {
        title: "Telecommunications Infrastructure Upgrade",
        agency: "Service NSW",
        description: "Upgrade of telecommunications infrastructure across 150 service centers including fiber optic installation and network equipment.",
        source: "NSW eTendering",
        status: "Open",
        value: "6700000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        location: "NSW State-wide",
        categories: ["IT Services", "Infrastructure"],
      },
      {
        title: "Catering Services - Parliament House",
        agency: "Department of Parliamentary Services",
        description: "Provision of catering services for Parliament House including dining rooms, functions, and daily refreshments for staff and visitors.",
        source: "AusTender",
        status: "Open",
        value: "950000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        location: "Canberra, ACT",
        categories: ["Services", "Hospitality"],
      },
      {
        title: "Mental Health Program Delivery",
        agency: "NSW Health",
        description: "Delivery of community mental health programs across Greater Sydney including counseling, crisis intervention, and peer support services.",
        source: "NSW eTendering",
        status: "Open",
        value: "2100000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
        location: "Greater Sydney, NSW",
        categories: ["Health", "Services"],
      },
      {
        title: "Cloud Migration Services",
        agency: "Australian Bureau of Statistics",
        description: "Migration of legacy data systems to cloud infrastructure including security assessment, data transfer, and ongoing managed services.",
        source: "AusTender",
        status: "Open",
        value: "1800000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        location: "Canberra, ACT",
        categories: ["IT Services", "Cloud"],
      },
      {
        title: "Waste Management Services - CBD",
        agency: "City of Sydney Council",
        description: "Commercial and residential waste collection, recycling, and disposal services for Sydney CBD and surrounding suburbs.",
        source: "NSW eTendering",
        status: "Open",
        value: "3800000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        location: "Sydney CBD, NSW",
        categories: ["Services", "Environmental"],
      },
      {
        title: "Training and Development Program",
        agency: "Australian Public Service Commission",
        description: "Design and delivery of leadership development programs for senior executives including workshops, coaching, and assessment centers.",
        source: "AusTender",
        status: "Open",
        value: "520000.00",
        publishDate: new Date(),
        closeDate: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
        location: "National",
        categories: ["Consulting", "Training"],
      },
      {
        title: "Bridge Inspection and Maintenance",
        agency: "Roads and Maritime Services",
        description: "Structural inspection and preventative maintenance for 45 bridges across the Central Coast region including underwater assessments.",
        source: "NSW eTendering",
        status: "Closed",
        value: "1100000.00",
        publishDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        closeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        location: "Central Coast, NSW",
        categories: ["Construction", "Infrastructure"],
      },
      {
        title: "Accounting Software Implementation",
        agency: "Department of Treasury",
        description: "Implementation of new government-wide accounting software including customization, integration with existing systems, and user training.",
        source: "AusTender",
        status: "Closed",
        value: "2400000.00",
        publishDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        closeDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        location: "National",
        categories: ["IT Services", "Finance"],
      },
    ];

    for (const t of sampleTenders) {
      await storage.createTender(t as any);
    }
    console.log("Seeded database with sample tenders");
  }
}
