import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import type { Tender } from "@shared/schema";

const BUSINESS_CATEGORIES = [
  "Information Technology",
  "Construction & Infrastructure",
  "Healthcare & Medical",
  "Professional Services",
  "Defence & Security",
  "Education & Training",
  "Environmental Services",
  "Transport & Logistics",
  "Financial Services",
  "Manufacturing",
  "Energy & Utilities",
  "Agriculture & Resources",
  "Communications & Media",
  "Legal Services",
  "Research & Development",
  "Facilities Management",
  "Human Resources",
  "Marketing & Advertising",
  "Social Services",
  "Other",
];

interface EnrichmentResult {
  summary: string;
  categories: string[];
}

async function enrichTenderWithAI(tender: Tender): Promise<EnrichmentResult | null> {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });

    const prompt = `Analyze this Australian government tender and provide:
1. A detailed summary (2-3 paragraphs) that explains:
   - What the government agency is looking for
   - Key requirements and deliverables
   - Any eligibility criteria or mandatory qualifications
   - Timeline and contract details if available
   - What type of business would be well-suited to apply

2. Select 1-3 most relevant business categories from this list:
${BUSINESS_CATEGORIES.map((c) => `- ${c}`).join("\n")}

TENDER DETAILS:
Title: ${tender.title}
Agency: ${tender.agency}
Description: ${tender.description}
Value: ${tender.value ? `$${Number(tender.value).toLocaleString()}` : "Not specified"}
Location: ${tender.location || "National"}
Status: ${tender.status}
Close Date: ${tender.closeDate ? new Date(tender.closeDate).toLocaleDateString() : "Not specified"}

Respond in JSON format:
{
  "summary": "Your detailed summary here...",
  "categories": ["Category1", "Category2"]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      console.error(`[AI Enrichment] Unexpected response type for tender ${tender.id}`);
      return null;
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[AI Enrichment] Could not parse JSON from response for tender ${tender.id}`);
      return null;
    }

    const result = JSON.parse(jsonMatch[0]) as EnrichmentResult;
    
    const validCategories = result.categories.filter((c) =>
      BUSINESS_CATEGORIES.includes(c)
    );

    return {
      summary: result.summary,
      categories: validCategories.length > 0 ? validCategories : ["Other"],
    };
  } catch (error) {
    console.error(`[AI Enrichment] Error enriching tender ${tender.id}:`, error);
    return null;
  }
}

export async function enrichNewTenders(batchSize: number = 5): Promise<number> {
  console.log("[AI Enrichment] Starting enrichment of unenriched tenders...");
  
  const unenrichedTenders = await storage.getUnenrichedTenders(batchSize);
  
  if (unenrichedTenders.length === 0) {
    console.log("[AI Enrichment] No unenriched tenders found");
    return 0;
  }

  console.log(`[AI Enrichment] Found ${unenrichedTenders.length} tenders to enrich`);
  
  let enrichedCount = 0;

  for (const tender of unenrichedTenders) {
    console.log(`[AI Enrichment] Enriching tender ${tender.id}: ${tender.title.substring(0, 50)}...`);
    
    const result = await enrichTenderWithAI(tender);
    
    if (result) {
      await storage.updateTender(tender.id, {
        aiSummary: result.summary,
        aiCategories: result.categories,
        aiEnriched: true,
        aiEnrichedAt: new Date(),
      });
      enrichedCount++;
      console.log(`[AI Enrichment] Successfully enriched tender ${tender.id} with categories: ${result.categories.join(", ")}`);
    } else {
      await storage.updateTender(tender.id, {
        aiEnriched: true,
        aiEnrichedAt: new Date(),
        aiCategories: ["Other"],
      });
      console.log(`[AI Enrichment] Marked tender ${tender.id} as enriched (AI failed, defaulted to Other)`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`[AI Enrichment] Completed enrichment: ${enrichedCount}/${unenrichedTenders.length} tenders enriched`);
  return enrichedCount;
}

export async function enrichSingleTender(tenderId: number): Promise<EnrichmentResult | null> {
  const tender = await storage.getTender(tenderId);
  if (!tender) return null;

  const result = await enrichTenderWithAI(tender);
  
  if (result) {
    await storage.updateTender(tenderId, {
      aiSummary: result.summary,
      aiCategories: result.categories,
      aiEnriched: true,
      aiEnrichedAt: new Date(),
    });
  }
  
  return result;
}

export { BUSINESS_CATEGORIES };
