import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertCompany } from "@shared/routes";

// GET /api/company
export function useCompany() {
  return useQuery({
    queryKey: [api.company.get.path],
    queryFn: async () => {
      const res = await fetch(api.company.get.path, { credentials: "include" });
      if (res.status === 404) return null; // Handle case where profile doesn't exist yet
      if (!res.ok) throw new Error("Failed to fetch company profile");
      return api.company.get.responses[200].parse(await res.json());
    },
    retry: false, // Don't retry on 404
  });
}

// POST /api/company (Upsert)
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertCompany) => {
      const res = await fetch(api.company.upsert.path, {
        method: api.company.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update company profile");
      return api.company.upsert.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.company.get.path] });
    },
  });
}
