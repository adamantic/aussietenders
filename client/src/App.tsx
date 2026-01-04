import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import SearchPage from "@/pages/SearchPage";
import PipelinePage from "@/pages/PipelinePage";
import CompanyPage from "@/pages/CompanyPage";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <SignedIn>
        <Component />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      {/* Public Routes - viewable without login, but some actions require auth */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/search" component={SearchPage} />
      
      {/* Protected Routes - require login */}
      <Route path="/pipeline">
        <ProtectedRoute component={PipelinePage} />
      </Route>
      <Route path="/company">
        <ProtectedRoute component={CompanyPage} />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
