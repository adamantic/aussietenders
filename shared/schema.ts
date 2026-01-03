import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import Auth and Chat models to re-export and use in relations
import { users } from "./models/auth";
export * from "./models/auth";
export * from "./models/chat";

// === COMPANIES / PROFILES ===
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id), // Link to auth user
  name: text("name").notNull(),
  abn: text("abn"),
  address: text("address"),
  industry: text("industry"),
  description: text("description"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companiesRelations = relations(companies, ({ one }) => ({
  user: one(users, {
    fields: [companies.userId],
    references: [users.id],
  }),
}));

// === TENDERS ===
export const tenders = pgTable("tenders", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").unique(), // ID from source (e.g. ATM ID)
  source: text("source").notNull(), // 'Austender', 'NSW', etc.
  title: text("title").notNull(),
  agency: text("agency").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(), // 'Open', 'Closed', 'Awarded'
  value: decimal("value", { precision: 15, scale: 2 }), // Estimated or actual value
  location: text("location"),
  publishDate: timestamp("publish_date"),
  closeDate: timestamp("close_date"),
  categories: jsonb("categories").$type<string[]>(), // Array of UNSPSC codes/names
  matchScore: integer("match_score").default(0), // Placeholder for AI matching score
  aiSummary: text("ai_summary"), // Cached AI summary
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === PIPELINE ===
export const pipelineItems = pgTable("pipeline_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tenderId: integer("tender_id").notNull().references(() => tenders.id),
  stage: text("stage").notNull().default("discovered"), // 'discovered', 'evaluating', 'preparing', 'submitted', 'won', 'lost', 'no_bid'
  notes: text("notes"),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  dueDate: timestamp("due_date"), // Internal deadline
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pipelineItemsRelations = relations(pipelineItems, ({ one }) => ({
  user: one(users, {
    fields: [pipelineItems.userId],
    references: [users.id],
  }),
  tender: one(tenders, {
    fields: [pipelineItems.tenderId],
    references: [tenders.id],
  }),
}));

// === SAVED SEARCHES ===
export const savedSearches = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  keywords: text("keywords"),
  filters: jsonb("filters"), // Store structured filters (location, category, etc)
  frequency: text("frequency").default("daily"), // 'daily', 'weekly', 'never'
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, {
    fields: [savedSearches.userId],
    references: [users.id],
  }),
}));

// === SCHEMAS ===
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenderSchema = createInsertSchema(tenders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPipelineItemSchema = createInsertSchema(pipelineItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({ id: true, createdAt: true });

// === TYPES ===
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Tender = typeof tenders.$inferSelect;
export type InsertTender = z.infer<typeof insertTenderSchema>;

export type PipelineItem = typeof pipelineItems.$inferSelect;
export type InsertPipelineItem = z.infer<typeof insertPipelineItemSchema>;

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;

// Joined type for pipeline view
export type PipelineItemWithTender = PipelineItem & { tender: Tender };
