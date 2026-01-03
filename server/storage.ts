import { db } from "./db";
import { eq, like, and, desc, sql } from "drizzle-orm";
import {
  tenders, companies, pipelineItems, savedSearches,
  type Tender, type InsertTender,
  type Company, type InsertCompany,
  type PipelineItem, type InsertPipelineItem, type PipelineItemWithTender,
  type SavedSearch, type InsertSavedSearch
} from "@shared/schema";

export interface IStorage {
  // Tenders
  getTenders(params: { search?: string, category?: string, source?: string, page?: number, limit?: number }): Promise<{ data: Tender[], total: number }>;
  getTender(id: number): Promise<Tender | undefined>;
  createTender(tender: InsertTender): Promise<Tender>;
  
  // Pipeline
  getPipelineItems(userId: string): Promise<PipelineItemWithTender[]>;
  createPipelineItem(item: InsertPipelineItem): Promise<PipelineItem>;
  updatePipelineItem(id: number, userId: string, updates: Partial<InsertPipelineItem>): Promise<PipelineItem | undefined>;
  deletePipelineItem(id: number, userId: string): Promise<void>;
  
  // Company
  getCompany(userId: string): Promise<Company | undefined>;
  upsertCompany(company: InsertCompany): Promise<Company>;
  
  // Saved Searches
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  deleteSavedSearch(id: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // === TENDERS ===
  async getTenders({ search, category, source, page = 1, limit = 20 }: { search?: string, category?: string, source?: string, page?: number, limit?: number }) {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${tenders.title} ILIKE ${`%${search}%`} OR ${tenders.description} ILIKE ${`%${search}%`} OR ${tenders.agency} ILIKE ${`%${search}%`})`
      );
    }
    if (category) {
      // JSON array contains check (simplified for MVP as text search or specific operator if pg)
      // For MVP, we might just assume text search in description/title covers it, or exact match if categories was text.
      // Since it's jsonb array, we use @> operator
      // conditions.push(sql`${tenders.categories} @> ${JSON.stringify([category])}`);
    }
    if (source) {
      conditions.push(eq(tenders.source, source));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(tenders)
      .where(whereClause);
      
    const data = await db
      .select()
      .from(tenders)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(tenders.publishDate));

    return { data, total: countResult.count };
  }

  async getTender(id: number): Promise<Tender | undefined> {
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    return tender;
  }

  async createTender(tender: InsertTender): Promise<Tender> {
    const [newItem] = await db.insert(tenders).values(tender).returning();
    return newItem;
  }

  // === PIPELINE ===
  async getPipelineItems(userId: string): Promise<PipelineItemWithTender[]> {
    const items = await db
      .select()
      .from(pipelineItems)
      .where(eq(pipelineItems.userId, userId))
      .leftJoin(tenders, eq(pipelineItems.tenderId, tenders.id));
      
    // Map result to proper shape
    return items.map(({ pipeline_items, tenders }) => ({
      ...pipeline_items,
      tender: tenders!
    }));
  }

  async createPipelineItem(item: InsertPipelineItem): Promise<PipelineItem> {
    const [newItem] = await db.insert(pipelineItems).values(item).returning();
    return newItem;
  }

  async updatePipelineItem(id: number, userId: string, updates: Partial<InsertPipelineItem>): Promise<PipelineItem | undefined> {
    const [updated] = await db
      .update(pipelineItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(pipelineItems.id, id), eq(pipelineItems.userId, userId)))
      .returning();
    return updated;
  }

  async deletePipelineItem(id: number, userId: string): Promise<void> {
    await db
      .delete(pipelineItems)
      .where(and(eq(pipelineItems.id, id), eq(pipelineItems.userId, userId)));
  }

  // === COMPANY ===
  async getCompany(userId: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.userId, userId));
    return company;
  }

  async upsertCompany(companyData: InsertCompany): Promise<Company> {
    // Check if exists
    const existing = await this.getCompany(companyData.userId);
    
    if (existing) {
      const [updated] = await db
        .update(companies)
        .set({ ...companyData, updatedAt: new Date() })
        .where(eq(companies.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(companies).values(companyData).returning();
      return created;
    }
  }

  // === SAVED SEARCHES ===
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return db.select().from(savedSearches).where(eq(savedSearches.userId, userId));
  }

  async createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch> {
    const [newItem] = await db.insert(savedSearches).values(search).returning();
    return newItem;
  }

  async deleteSavedSearch(id: number, userId: string): Promise<void> {
    await db
      .delete(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
