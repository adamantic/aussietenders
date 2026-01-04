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

  try {
    const url = "https://www.tenders.nsw.gov.au/?event=public.api.tender.search&ResultsPerPage=100";
    console.log(`[NSW eTendering] Fetching tenders from: ${url}`);

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`[NSW eTendering] API error: ${response.status} ${response.statusText}`);
      return tenders;
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    
    if (!text || text.trim().length === 0) {
      console.log("[NSW eTendering] Empty response received");
      return tenders;
    }

    if (!contentType.includes("application/json")) {
      console.log(`[NSW eTendering] Non-JSON response: ${contentType}`);
      console.log(`[NSW eTendering] Response preview: ${text.slice(0, 200)}`);
      return tenders;
    }

    let data: NSWTenderSearchResponse;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("[NSW eTendering] Failed to parse JSON:", parseErr);
      console.log(`[NSW eTendering] Response preview: ${text.slice(0, 200)}`);
      return tenders;
    }

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
  try {
    const url = "https://www.tenders.nsw.gov.au/?event=public.api.tender.search&ResultsPerPage=1";

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) return false;
    
    const text = await response.text();
    return text.length > 0;
  } catch {
    return false;
  }
}
