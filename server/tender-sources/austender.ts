import type { InsertTender } from "@shared/schema";

interface OCDSParty {
  id: string;
  name: string;
  roles: string[];
  address?: {
    locality?: string;
    region?: string;
  };
}

interface OCDSContract {
  id: string;
  title?: string;
  description?: string;
  status: string;
  value?: { amount: string | number; currency: string };
  period?: { startDate?: string; endDate?: string };
  items?: Array<{
    id: string;
    classification?: { scheme: string; id: string; description?: string };
  }>;
}

interface OCDSRelease {
  ocid: string;
  id: string;
  date: string;
  tag: string[];
  initiationType: string;
  parties?: OCDSParty[];
  contracts?: OCDSContract[];
  tender?: {
    id: string;
    procurementMethod?: string;
    procurementMethodDetails?: string;
  };
  awards?: Array<{
    id: string;
    suppliers?: Array<{ name: string }>;
    status: string;
    date?: string;
  }>;
}

interface OCDSResponse {
  releases: OCDSRelease[];
}

export async function fetchAusTenderContracts(daysBack: number = 30): Promise<InsertTender[]> {
  const tenders: InsertTender[] = [];

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const formatDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

    const url = `https://api.tenders.gov.au/ocds/findByDates/contractPublished/${formatDate(startDate)}/${formatDate(endDate)}`;

    console.log(`[AusTender] Fetching contracts from: ${url}`);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[AusTender] API error: ${response.status} ${response.statusText}`);
      return tenders;
    }

    const data: OCDSResponse = await response.json();

    if (!data.releases || !Array.isArray(data.releases)) {
      console.log("[AusTender] No releases found in response");
      return tenders;
    }

    console.log(`[AusTender] Found ${data.releases.length} contract notices`);

    for (const release of data.releases) {
      try {
        const tender = mapOCDSToTender(release);
        if (tender) {
          tenders.push(tender);
        }
      } catch (err) {
        console.error(`[AusTender] Error mapping release ${release.ocid}:`, err);
      }
    }

    console.log(`[AusTender] Successfully mapped ${tenders.length} tenders`);
  } catch (error) {
    console.error("[AusTender] Failed to fetch contracts:", error);
  }

  return tenders;
}

function mapOCDSToTender(release: OCDSRelease): InsertTender | null {
  const contract = release.contracts?.[0];
  const procuringEntity = release.parties?.find((p) => p.roles.includes("procuringEntity"));
  const supplier = release.parties?.find((p) => p.roles.includes("supplier"));

  const description = contract?.description?.trim() || "";
  if (!description || description.length < 5) {
    return null;
  }

  const agency = procuringEntity?.name || "Australian Government";
  const title = description.length > 100 ? description.substring(0, 100) + "..." : description;

  let value: string | undefined;
  if (contract?.value?.amount) {
    value = contract.value.amount.toString();
  }

  let publishDate: Date | undefined;
  if (release.date) {
    publishDate = new Date(release.date);
  }

  let closeDate: Date | undefined;
  if (contract?.period?.endDate) {
    closeDate = new Date(contract.period.endDate);
  }

  const categories: string[] = [];
  const procurementMethod = release.tender?.procurementMethodDetails;
  if (procurementMethod) {
    categories.push(procurementMethod);
  }
  if (contract?.items) {
    for (const item of contract.items) {
      if (item.classification?.description && !categories.includes(item.classification.description)) {
        categories.push(item.classification.description);
      }
    }
  }

  let location = "National";
  if (procuringEntity?.address?.region) {
    location = procuringEntity.address.region;
  } else if (supplier?.address?.region) {
    location = supplier.address.region;
  }

  const status = release.tag.includes("contract") ? "Awarded" : "Open";

  return {
    externalId: release.ocid,
    source: "AusTender",
    title: title.trim(),
    agency,
    description: description,
    status,
    value,
    location,
    publishDate,
    closeDate,
    categories: categories.length > 0 ? categories : ["Government Procurement"],
    matchScore: 0,
    aiSummary: null,
  };
}

export async function testAusTenderConnection(): Promise<boolean> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const formatDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
    const url = `https://api.tenders.gov.au/ocds/findByDates/contractPublished/${formatDate(startDate)}/${formatDate(endDate)}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    return response.ok;
  } catch {
    return false;
  }
}
