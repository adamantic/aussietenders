import { fetchAusTenderContracts, testAusTenderConnection } from "./austender";
import { fetchNSWTenders, testNSWConnection } from "./nsw-etendering";
import { storage } from "../storage";
import { enrichNewTenders } from "../ai-enrichment";
import type { InsertTender, Tender } from "@shared/schema";

export interface SyncResult {
  source: string;
  fetched: number;
  added: number;
  updated: number;
  errors: number;
}

export async function syncAllTenders(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  console.log("[TenderSync] Starting sync of all tender sources...");

  const ausTenderResult = await syncAusTender();
  results.push(ausTenderResult);

  const nswResult = await syncNSWTenders();
  results.push(nswResult);

  console.log("[TenderSync] Sync complete:", results);

  // Start AI enrichment in background (don't block sync completion)
  console.log("[TenderSync] Starting AI enrichment of new tenders...");
  enrichNewTenders(10).then((count) => {
    console.log(`[TenderSync] AI enrichment completed: ${count} tenders enriched`);
  }).catch((err) => {
    console.error("[TenderSync] AI enrichment failed:", err);
  });

  return results;
}

export async function syncAusTender(): Promise<SyncResult> {
  const result: SyncResult = {
    source: "AusTender",
    fetched: 0,
    added: 0,
    updated: 0,
    errors: 0,
  };

  try {
    console.log("[TenderSync] Syncing AusTender...");

    const tenders = await fetchAusTenderContracts(30);
    result.fetched = tenders.length;

    for (const tender of tenders) {
      try {
        const saved = await upsertTender(tender);
        if (saved.isNew) {
          result.added++;
        } else {
          result.updated++;
        }
      } catch (err) {
        console.error(`[TenderSync] Error saving AusTender ${tender.externalId}:`, err);
        result.errors++;
      }
    }

    console.log(`[AusTender] Sync complete: ${result.added} added, ${result.updated} updated`);
  } catch (error) {
    console.error("[TenderSync] AusTender sync failed:", error);
    result.errors++;
  }

  return result;
}

export async function syncNSWTenders(): Promise<SyncResult> {
  const result: SyncResult = {
    source: "NSW eTendering",
    fetched: 0,
    added: 0,
    updated: 0,
    errors: 0,
  };

  try {
    console.log("[TenderSync] Syncing NSW eTendering...");

    const tenders = await fetchNSWTenders();
    result.fetched = tenders.length;

    for (const tender of tenders) {
      try {
        const saved = await upsertTender(tender);
        if (saved.isNew) {
          result.added++;
        } else {
          result.updated++;
        }
      } catch (err) {
        console.error(`[TenderSync] Error saving NSW tender ${tender.externalId}:`, err);
        result.errors++;
      }
    }

    console.log(`[NSW eTendering] Sync complete: ${result.added} added, ${result.updated} updated`);
  } catch (error) {
    console.error("[TenderSync] NSW sync failed:", error);
    result.errors++;
  }

  return result;
}

async function upsertTender(tender: InsertTender): Promise<{ tender: Tender; isNew: boolean }> {
  const existing = await storage.getTenderByExternalId(tender.externalId!);

  if (existing) {
    const updated = await storage.updateTender(existing.id, tender);
    return { tender: updated!, isNew: false };
  } else {
    const created = await storage.createTender(tender);
    return { tender: created, isNew: true };
  }
}

export async function testConnections(): Promise<{ ausTender: boolean; nsw: boolean }> {
  const [ausTender, nsw] = await Promise.all([
    testAusTenderConnection(),
    testNSWConnection(),
  ]);

  return { ausTender, nsw };
}

export { fetchAusTenderContracts, fetchNSWTenders };
