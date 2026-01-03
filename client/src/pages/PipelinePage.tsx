import { usePipeline, useUpdatePipelineItem, useDeletePipelineItem } from "@/hooks/use-pipeline";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreVertical, Calendar, Building, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "discovered", label: "Discovered", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "evaluating", label: "Evaluating", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "preparing", label: "Preparing", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "submitted", label: "Submitted", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "won", label: "Won", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export default function PipelinePage() {
  const { data: pipeline, isLoading } = usePipeline();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-6">
          <h2 className="text-3xl font-display font-bold text-gray-900">Pipeline</h2>
          <p className="text-gray-500 mt-1">Manage your active tender opportunities.</p>
        </div>

        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max h-full">
            {STAGES.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                items={pipeline?.filter((p) => p.stage === stage.id) || []}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function PipelineColumn({ stage, items }: { stage: any; items: any[] }) {
  const totalValue = items.reduce((sum, item) => sum + Number(item.tender.value || 0), 0);

  return (
    <div className="w-[320px] flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100 bg-white rounded-t-xl sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{stage.label}</h3>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${stage.color.split(" ")[0].replace("bg-", "bg-opacity-50 bg-")}`} />
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Est: ${(totalValue / 1000).toFixed(0)}k
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {items.map((item) => (
            <PipelineCard key={item.id} item={item} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function PipelineCard({ item }: { item: any }) {
  const { mutate: updateItem } = useUpdatePipelineItem();
  const { mutate: deleteItem } = useDeletePipelineItem();

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow border-gray-200 group">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug">
            {item.tender.title}
          </h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STAGES.map(stage => (
                <DropdownMenuItem 
                  key={stage.id}
                  onClick={() => updateItem({ id: item.id, stage: stage.id })}
                  className={item.stage === stage.id ? "bg-gray-100" : ""}
                >
                  Move to {stage.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem 
                onClick={() => deleteItem(item.id)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Building className="w-3 h-3" />
          <span className="truncate max-w-[200px]">{item.tender.agency}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            {item.tender.closeDate ? format(new Date(item.tender.closeDate), "MMM d") : "-"}
          </div>
          {item.tender.value && (
             <Badge variant="secondary" className="text-[10px] h-5 bg-green-50 text-green-700 hover:bg-green-100">
               <DollarSign className="w-2.5 h-2.5 mr-0.5" />
               {(Number(item.tender.value) / 1000).toFixed(0)}k
             </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
