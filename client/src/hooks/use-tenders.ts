import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

interface TenderSearchParams {
  search?: string;
  category?: string;
  source?: string;
  sources?: string[]; // Array of sources to filter by
  page?: number;
  limit?: number;
}

// GET /api/tenders (Search/List)
export function useTenders(params: TenderSearchParams = {}) {
  // Construct query key including all params so it refetches when they change
  const queryKey = [api.tenders.list.path, params];

  return useQuery({
    queryKey,
    queryFn: async () => {
      // Build URL with query params
      const url = new URL(api.tenders.list.path, window.location.origin);
      if (params.search) url.searchParams.append("search", params.search);
      if (params.category) url.searchParams.append("category", params.category);
      if (params.source) url.searchParams.append("source", params.source);
      if (params.sources && params.sources.length > 0) {
        url.searchParams.append("sources", params.sources.join(","));
      }
      if (params.page) url.searchParams.append("page", params.page.toString());
      if (params.limit) url.searchParams.append("limit", params.limit.toString());

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tenders");
      return api.tenders.list.responses[200].parse(await res.json());
    },
    // Keep previous data while fetching new page for smoother transitions
    placeholderData: (previousData) => previousData,
  });
}

// GET /api/tenders/:id
export function useTender(id: number) {
  return useQuery({
    queryKey: [api.tenders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.tenders.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tender details");
      return api.tenders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/tenders/:id/summarize
export function useSummarizeTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tenders.summarize.path, { id });
      const res = await fetch(url, {
        method: api.tenders.summarize.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate summary");
      return api.tenders.summarize.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate all tender queries to refresh the summary field
      queryClient.invalidateQueries({ queryKey: [api.tenders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.tenders.get.path] });
    },
  });
}
