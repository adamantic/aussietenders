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
  console.log("[NSW eTendering] NSW API is currently unavailable from cloud environments");
  console.log("[NSW eTendering] The NSW eTendering API blocks server-side requests with WAF protection");
  console.log("[NSW eTendering] To access NSW tenders, visit: https://tenders.nsw.gov.au");
  return [];
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
  return false;
}
