import { z } from 'zod';
import { insertCompanySchema, insertPipelineItemSchema, insertSavedSearchSchema, tenders, companies, pipelineItems, savedSearches } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === TENDERS ===
  tenders: {
    list: {
      method: 'GET' as const,
      path: '/api/tenders',
      input: z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        source: z.string().optional(),
        sources: z.string().optional(), // Comma-separated list of sources
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.object({
          data: z.array(z.custom<typeof tenders.$inferSelect>()),
          total: z.number(),
          page: z.number(),
          totalPages: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/tenders/:id',
      responses: {
        200: z.custom<typeof tenders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    // Generate AI summary for a specific tender
    summarize: {
      method: 'POST' as const,
      path: '/api/tenders/:id/summarize',
      responses: {
        200: z.object({ summary: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },

  // === PIPELINE ===
  pipeline: {
    list: {
      method: 'GET' as const,
      path: '/api/pipeline',
      responses: {
        200: z.array(z.custom<typeof pipelineItems.$inferSelect & { tender: typeof tenders.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/pipeline',
      input: insertPipelineItemSchema,
      responses: {
        201: z.custom<typeof pipelineItems.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/pipeline/:id',
      input: insertPipelineItemSchema.partial(),
      responses: {
        200: z.custom<typeof pipelineItems.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/pipeline/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === COMPANY PROFILE ===
  company: {
    get: {
      method: 'GET' as const,
      path: '/api/company',
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
        404: errorSchemas.notFound, // If no profile exists yet
      },
    },
    upsert: {
      method: 'POST' as const,
      path: '/api/company',
      input: insertCompanySchema,
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // === SAVED SEARCHES ===
  savedSearches: {
    list: {
      method: 'GET' as const,
      path: '/api/saved-searches',
      responses: {
        200: z.array(z.custom<typeof savedSearches.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/saved-searches',
      input: insertSavedSearchSchema,
      responses: {
        201: z.custom<typeof savedSearches.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/saved-searches/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type PipelineItemResponse = z.infer<typeof api.pipeline.list.responses[200]>[number];
export type TenderResponse = z.infer<typeof api.tenders.get.responses[200]>;
export type CompanyResponse = z.infer<typeof api.company.get.responses[200]>;
