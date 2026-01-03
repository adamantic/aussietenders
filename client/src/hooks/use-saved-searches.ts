import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertSavedSearch } from "@shared/routes";

// GET /api/saved-searches
export function useSavedSearches() {
  return useQuery({
    queryKey: [api.savedSearches.list.path],
    queryFn: async () => {
      const res = await fetch(api.savedSearches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch saved searches");
      return api.savedSearches.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/saved-searches
export function useCreateSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertSavedSearch) => {
      const res = await fetch(api.savedSearches.create.path, {
        method: api.savedSearches.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save search");
      return api.savedSearches.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.savedSearches.list.path] });
    },
  });
}

// DELETE /api/saved-searches/:id
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.savedSearches.delete.path, { id });
      const res = await fetch(url, {
        method: api.savedSearches.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete saved search");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.savedSearches.list.path] });
    },
  });
}
