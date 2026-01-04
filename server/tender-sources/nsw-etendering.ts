import type { InsertTender } from "@shared/schema";

interface NSWTender {
  RFTUUID: string;
  RFTNumber?: string;
  AgencyName?: string;
  TenderTitle?: string;
  TenderDescription?: string;
  TenderType?: string;
  CloseDateTime?: string;
  PublishDateTime?: string;
  Location?: string;
  Category?: string;
  UNSPSC?: Array<{
    UNSPSCCode: string;
    UNSPSCTitle: string;
  }>;
}

interface NSWTenderSearchResponse {
  count?: number;
  rfts?: NSWTender[];
  rft?: NSWTender[];
}

export async function fetchNSWTenders(): Promise<InsertTender[]> {
  const tenders: InsertTender[] = [];

  const apiKey = process.env.NSW_API_KEY;
  if (!apiKey) {
    console.log("[NSW eTendering] Skipping - NSW_API_KEY not configured");
    console.log("[NSW eTendering] Register at https://api.nsw.gov.au to obtain API credentials");
    return tenders;
  }

  try {
    const url = "https://api.nsw.gov.au/tenders/v1/tenders?status=published";

    console.log(`[NSW eTendering] Fetching tenders from: ${url}`);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GovTenderPro/1.0 (Government Tender Aggregator)",
        "Authorization": `Bearer ${apiKey}`,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`[NSW eTendering] API error: ${response.status} ${response.statusText}`);
      return tenders;
    }

    const data: NSWTenderSearchResponse = await response.json();

    const tenderList = data.rfts || data.rft || [];

    if (!Array.isArray(tenderList)) {
      console.log("[NSW eTendering] No tender list found in response");
      return tenders;
    }

    console.log(`[NSW eTendering] Found ${tenderList.length} tenders`);

    for (const nswTender of tenderList) {
      try {
        const tender = mapNSWToTender(nswTender);
        if (tender) {
          tenders.push(tender);
        }
      } catch (err) {
        console.error(`[NSW eTendering] Error mapping tender ${nswTender.RFTUUID}:`, err);
      }
    }

    console.log(`[NSW eTendering] Successfully mapped ${tenders.length} tenders`);
  } catch (error) {
    console.error("[NSW eTendering] Failed to fetch tenders:", error);
  }

  return tenders;
}

function mapNSWToTender(nswTender: NSWTender): InsertTender | null {
  const title = nswTender.TenderTitle?.trim() || "Untitled Tender";
  const description = nswTender.TenderDescription?.trim() || "";
  const agency = nswTender.AgencyName?.trim() || "NSW Government";

  let publishDate: Date | undefined;
  if (nswTender.PublishDateTime) {
    publishDate = new Date(nswTender.PublishDateTime);
  }

  let closeDate: Date | undefined;
  if (nswTender.CloseDateTime) {
    closeDate = new Date(nswTender.CloseDateTime);
  }

  const categories: string[] = [];
  if (nswTender.Category) {
    categories.push(nswTender.Category);
  }
  if (nswTender.UNSPSC && Array.isArray(nswTender.UNSPSC)) {
    for (const unspsc of nswTender.UNSPSC) {
      if (unspsc.UNSPSCTitle && !categories.includes(unspsc.UNSPSCTitle)) {
        categories.push(unspsc.UNSPSCTitle);
      }
    }
  }
  if (nswTender.TenderType) {
    categories.push(nswTender.TenderType);
  }

  let status = "Open";
  if (closeDate && closeDate < new Date()) {
    status = "Closed";
  }

  let location = nswTender.Location || "NSW";
  if (!location.includes("NSW")) {
    location = `${location}, NSW`;
  }

  return {
    externalId: nswTender.RFTUUID,
    source: "NSW eTendering",
    title,
    agency,
    description: description || `Tender opportunity from ${agency}`,
    status,
    value: undefined,
    location,
    publishDate,
    closeDate,
    categories: categories.length > 0 ? categories : ["Government Procurement"],
    matchScore: 0,
    aiSummary: null,
  };
}

export async function testNSWConnection(): Promise<boolean> {
  const apiKey = process.env.NSW_API_KEY;
  if (!apiKey) {
    return false;
  }

  try {
    const url = "https://api.nsw.gov.au/tenders/v1/tenders?status=published&limit=1";

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GovTenderPro/1.0 (Government Tender Aggregator)",
        "Authorization": `Bearer ${apiKey}`,
      },
      redirect: "follow",
    });

    return response.ok;
  } catch {
    return false;
  }
}
