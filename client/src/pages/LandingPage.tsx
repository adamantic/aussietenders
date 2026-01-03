import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Building2, Search, BarChart3 } from "lucide-react";

export default function LandingPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  // Redirect if logged in
  if (user) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-gray-100 flex items-center justify-between px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-slate-900">GovTender Pro</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/api/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log In</a>
          <Button asChild className="rounded-full px-6">
            <a href="/api/login">Get Started</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-20 md:py-32 px-6 text-center max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            New: AI-Powered Tender Summaries
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Win more government <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">contracts, faster.</span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            The intelligent platform for SMEs to discover, track, and manage government tender opportunities with AI-driven insights.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Button size="lg" className="rounded-full text-lg px-8 h-12" asChild>
              <a href="/api/login">
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full text-lg px-8 h-12">
              View Demo
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="bg-slate-50 py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold font-display text-slate-900">Everything you need to succeed</h2>
              <p className="text-gray-600 mt-4">Streamline your tendering process from discovery to submission.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Search}
                title="Smart Discovery"
                description="Advanced filters and keywords help you find relevant opportunities across all government agencies instantly."
              />
              <FeatureCard 
                icon={BarChart3}
                title="Pipeline Management"
                description="Track every opportunity with a built-in Kanban board designed specifically for tender workflows."
              />
              <FeatureCard 
                icon={Building2}
                title="Competitive Intelligence"
                description="Get AI summaries and insights on agencies to craft winning proposals tailored to their needs."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-sm">© 2024 GovTender Pro. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900">Privacy</a>
            <a href="#" className="hover:text-gray-900">Terms</a>
            <a href="#" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
      <ul className="mt-6 space-y-2">
        {[1, 2, 3].map((_, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Key benefit feature point</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
