import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenders } from "@/hooks/use-tenders";
import { useAddToPipeline } from "@/hooks/use-pipeline";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSummarizeTender } from "@/hooks/use-tenders";
import { Plus, Search, Filter, Loader2, Sparkles, LogIn, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/tenders/categories"],
    queryFn: async () => {
      const res = await fetch("/api/tenders/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: tendersData, isLoading } = useTenders({
    search: searchTerm,
    category: category === "all" ? undefined : category,
    sources: ["AusTender"],
    page,
    limit: 12,
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100">
              Federal Government Tenders
            </h2>
            <p className="text-muted-foreground mt-1">
              Discover opportunities from Australian federal government agencies
            </p>
          </div>
          {!isAuthenticated && (
            <a href="/api/login">
              <Button data-testid="button-login-header">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </a>
          )}
        </div>

        {/* Search and Category Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by keyword, agency, or description..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="select-category">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Tender Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results Summary */}
        {tendersData && (
          <div className="text-sm text-muted-foreground">
            Showing {tendersData.data.length} of {tendersData.total} tenders
          </div>
        )}

        {/* Tender List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            tendersData?.data.map((tender) => (
              <TenderCard 
                key={tender.id} 
                tender={tender} 
                isAuthenticated={isAuthenticated} 
              />
            ))
          )}

          {!isLoading && tendersData?.data.length === 0 && (
            <div className="text-center py-16 bg-card rounded-xl border border-dashed">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No tenders found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
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
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm font-medium text-muted-foreground">
              Page {page} of {tendersData.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === tendersData.totalPages}
              onClick={() => setPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function TenderCard({ tender, isAuthenticated }: { tender: any; isAuthenticated: boolean }) {
  const { toast } = useToast();
  const { mutate: addToPipeline, isPending: isAdding } = useAddToPipeline();
  const { mutate: summarize, isPending: isSummarizing } = useSummarizeTender();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const handleAdd = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
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

  const handleViewDetails = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
    } else {
      setShowDetailsDialog(true);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-all duration-300 group" data-testid={`card-tender-${tender.id}`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                    {tender.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">{tender.agency}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 bg-muted rounded-md font-medium">
                    {tender.source}
                  </span>
                  <StatusBadge status={tender.status} />
                </div>
              </div>

              <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                {tender.description}
              </p>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
                {tender.value && (
                  <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <span className="font-semibold">Value:</span> ${Number(tender.value).toLocaleString()}
                  </div>
                )}
                <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                  <span className="font-semibold">Closing:</span>{" "}
                  {tender.closeDate ? format(new Date(tender.closeDate), "MMM d, yyyy") : "N/A"}
                </div>
                <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                  <span className="font-semibold">Location:</span> {tender.location}
                </div>
              </div>
            </div>

            <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 min-w-[140px]">
              <Button
                onClick={handleAdd}
                disabled={isAdding}
                className="w-full"
                data-testid={`button-add-pipeline-${tender.id}`}
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add to Pipeline
              </Button>

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleViewDetails}
                data-testid={`button-view-details-${tender.id}`}
              >
                View Details
              </Button>

              <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-display">{tender.title}</DialogTitle>
                      <DialogDescription>{tender.agency}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block">Published</span>
                          <span className="font-medium">
                            {tender.publishDate ? format(new Date(tender.publishDate), "MMM d, yyyy") : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Closing</span>
                          <span className="font-medium">
                            {tender.closeDate ? format(new Date(tender.closeDate), "MMM d, yyyy") : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Value</span>
                          <span className="font-medium">
                            {tender.value ? `$${Number(tender.value).toLocaleString()}` : "Not specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Location</span>
                          <span className="font-medium">{tender.location || "Australia"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Source</span>
                          <span className="font-medium">{tender.source}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                          <p>{tender.description}</p>
                        </div>
                      </div>

                      {tender.aiSummary ? (
                        <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-900">
                          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold mb-2">
                            <Sparkles className="w-4 h-4" /> AI Summary
                          </div>
                          <p className="text-sm leading-relaxed">{tender.aiSummary}</p>
                        </div>
                      ) : (
                        <div className="bg-muted p-4 rounded-xl border text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            Get a concise AI summary of this opportunity.
                          </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => summarize(tender.id)}
                            disabled={isSummarizing}
                          >
                            {isSummarizing ? (
                              <>
                                Generating <Loader2 className="w-3 h-3 ml-2 animate-spin" />
                              </>
                            ) : (
                              <>
                                Generate Summary <Sparkles className="w-3 h-3 ml-2 text-purple-500" />
                              </>
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
        </CardContent>
      </Card>

      {/* Login Required Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Sign in required
            </DialogTitle>
            <DialogDescription>
              Create a free account to add tenders to your pipeline and access detailed information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <a href="/api/login" className="w-full">
              <Button className="w-full" data-testid="button-login-dialog">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In with Replit
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
