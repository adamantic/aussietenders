import type { InsertTender } from "@shared/schema";
import puppeteer from "puppeteer";

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
  let browser = null;

  try {
    console.log("[NSW eTendering] Starting headless browser...");
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-features=VizDisplayCompositor",
        "--single-process",
      ],
    });

    const page = await browser.newPage();
    
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    await page.setExtraHTTPHeaders({
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-AU,en;q=0.9",
    });

    console.log(`[NSW eTendering] Warming up browser session...`);
    await page.goto("https://tenders.nsw.gov.au", {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const url = "https://tenders.nsw.gov.au/?event=public.api.tender.search&rftType=published";
    console.log(`[NSW eTendering] Fetching API data from: ${url}`);
    
    const apiResponse = await page.evaluate(async (apiUrl) => {
      try {
        const resp = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
          credentials: "include",
        });
        const contentType = resp.headers.get("content-type") || "";
        const text = await resp.text();
        return { ok: resp.ok, status: resp.status, contentType, text };
      } catch (err: unknown) {
        return { ok: false, status: 0, contentType: "", text: String(err) };
      }
    }, url);

    console.log(`[NSW eTendering] API status: ${apiResponse.status}, Content-Type: ${apiResponse.contentType}`);

    if (!apiResponse.ok) {
      console.error(`[NSW eTendering] API error: ${apiResponse.status}`);
      console.log(`[NSW eTendering] Response preview: ${apiResponse.text.slice(0, 200)}`);
      return tenders;
    }

    const contentType = apiResponse.contentType;
    const text = apiResponse.text;
    
    console.log(`[NSW eTendering] Content-Type: ${contentType}`);
    console.log(`[NSW eTendering] Response length: ${text.length} chars`);

    if (!text || text.trim().length === 0) {
      console.log("[NSW eTendering] Empty response received");
      return tenders;
    }

    if (!contentType.includes("application/json")) {
      console.log(`[NSW eTendering] Non-JSON response detected`);
      console.log(`[NSW eTendering] Response preview: ${text.slice(0, 300)}`);
      return tenders;
    }

    let data: NSWTenderSearchResponse;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("[NSW eTendering] Failed to parse JSON:", parseErr);
      console.log(`[NSW eTendering] Response preview: ${text.slice(0, 300)}`);
      return tenders;
    }

    const tenderList = data.rfts || data.rft || [];

    if (!Array.isArray(tenderList)) {
      console.log("[NSW eTendering] No tender list found in response");
      console.log(`[NSW eTendering] Response keys: ${Object.keys(data).join(", ")}`);
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
  } finally {
    if (browser) {
      await browser.close();
    }
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
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = "https://tenders.nsw.gov.au/?event=public.api.tender.search&rftType=published";
    const response = await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    if (!response || response.status() !== 200) {
      return false;
    }
    
    const contentType = response.headers()["content-type"] || "";
    return contentType.includes("application/json");
  } catch {
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
