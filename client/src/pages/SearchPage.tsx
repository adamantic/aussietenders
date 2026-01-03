import { useState } from "react";
import { useTenders } from "@/hooks/use-tenders";
import { useAddToPipeline } from "@/hooks/use-pipeline";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { useSummarizeTender } from "@/hooks/use-tenders";
import { Plus, Search, Filter, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: tendersData, isLoading } = useTenders({
    search: searchTerm,
    category: category === "all" ? undefined : category,
    page,
    limit: 10
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Search Tenders</h2>
            <p className="text-gray-500 mt-1">Find new opportunities for your business.</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by keyword, agency, or ID..."
              className="pl-10 bg-white/50 border-gray-200 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/50">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="IT">Information Technology</SelectItem>
              <SelectItem value="Construction">Construction</SelectItem>
              <SelectItem value="Health">Health Services</SelectItem>
              <SelectItem value="Consulting">Consulting</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            tendersData?.data.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))
          )}

          {!isLoading && tendersData?.data.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No tenders found</h3>
              <p className="text-gray-500">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {tendersData && tendersData.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm font-medium text-gray-600">
              Page {page} of {tendersData.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === tendersData.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function TenderCard({ tender }: { tender: any }) {
  const { toast } = useToast();
  const { mutate: addToPipeline, isPending: isAdding } = useAddToPipeline();
  const { mutate: summarize, isPending: isSummarizing } = useSummarizeTender();

  const handleAdd = () => {
    addToPipeline(
      { tenderId: tender.id, stage: "discovered", priority: "medium" },
      {
        onSuccess: () => {
          toast({
            title: "Added to Pipeline",
            description: "You can now track this tender in your pipeline.",
          });
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                {tender.title}
              </h3>
              <p className="text-sm text-gray-500 font-medium">{tender.agency}</p>
            </div>
            <StatusBadge status={tender.status} />
          </div>

          <p className="text-gray-600 line-clamp-2 text-sm leading-relaxed">
            {tender.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2">
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <span className="font-semibold">ID:</span> {tender.externalId}
            </div>
            {tender.value && (
               <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                <span className="font-semibold">Value:</span> ${Number(tender.value).toLocaleString()}
              </div>
            )}
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <span className="font-semibold">Closing:</span> {tender.closeDate ? format(new Date(tender.closeDate), "MMM d, yyyy") : "N/A"}
            </div>
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <span className="font-semibold">Location:</span> {tender.location}
            </div>
          </div>
        </div>

        <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
          <Button 
            onClick={handleAdd} 
            disabled={isAdding}
            className="w-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add to Pipeline
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-display">{tender.title}</DialogTitle>
                <p className="text-sm text-gray-500">{tender.agency}</p>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Published</span>
                    <span className="font-medium">{tender.publishDate ? format(new Date(tender.publishDate), "MMM d, yyyy") : "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Closing</span>
                    <span className="font-medium">{tender.closeDate ? format(new Date(tender.closeDate), "MMM d, yyyy") : "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Value</span>
                    <span className="font-medium">{tender.value ? `$${Number(tender.value).toLocaleString()}` : "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Location</span>
                    <span className="font-medium">{tender.location || "Australia"}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <div className="prose prose-sm max-w-none text-gray-600">
                    <p>{tender.description}</p>
                  </div>
                </div>

                {tender.aiSummary ? (
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 text-purple-700 font-semibold mb-2">
                      <Sparkles className="w-4 h-4" /> AI Summary
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{tender.aiSummary}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                    <p className="text-sm text-gray-500 mb-3">Get a concise AI summary of this opportunity.</p>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => summarize(tender.id)}
                      disabled={isSummarizing}
                      className="bg-white hover:bg-gray-100"
                    >
                      {isSummarizing ? (
                        <>Generating <Loader2 className="w-3 h-3 ml-2 animate-spin"/></>
                      ) : (
                        <>Generate Summary <Sparkles className="w-3 h-3 ml-2 text-purple-500"/></>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              <DialogFooter className="mt-6">
                <Button onClick={handleAdd} disabled={isAdding} className="w-full sm:w-auto">
                  Add to Pipeline
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
