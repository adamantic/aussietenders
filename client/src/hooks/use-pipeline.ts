import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertPipelineItem, type PipelineItem } from "@shared/schema";

// GET /api/pipeline
export function usePipeline() {
  return useQuery({
    queryKey: [api.pipeline.list.path],
    queryFn: async () => {
      const res = await fetch(api.pipeline.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      return api.pipeline.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/pipeline (Add to pipeline)
export function useAddToPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertPipelineItem) => {
      const res = await fetch(api.pipeline.create.path, {
        method: api.pipeline.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.pipeline.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to add to pipeline");
      }
      return api.pipeline.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pipeline.list.path] });
    },
  });
}

// PATCH /api/pipeline/:id (Update stage/notes)
export function useUpdatePipelineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertPipelineItem>) => {
      const url = buildUrl(api.pipeline.update.path, { id });
      const res = await fetch(url, {
        method: api.pipeline.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update pipeline item");
      return api.pipeline.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pipeline.list.path] });
    },
  });
}

// DELETE /api/pipeline/:id
export function useDeletePipelineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.pipeline.delete.path, { id });
      const res = await fetch(url, {
        method: api.pipeline.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete pipeline item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pipeline.list.path] });
    },
  });
}
