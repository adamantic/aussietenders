import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Search,
  KanbanSquare,
  Building2,
  LogOut,
  LogIn,
  Bell,
  UserCircle,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Search Tenders", href: "/search", icon: Search },
    { name: "Pipeline", href: "/pipeline", icon: KanbanSquare },
    { name: "My Company", href: "/company", icon: Building2 },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-slate-900 text-white flex flex-col fixed h-full z-50 shadow-xl transition-transform duration-300",
        "lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer" onClick={handleNavClick}>
            <div className="bg-primary p-1.5 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Aussie Tenders</span>
          </Link>
          <button 
            className="lg:hidden p-1 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
            data-testid="button-close-menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-2 mb-4">
                {user.profileImageUrl ? (
                   <img src={user.profileImageUrl} alt="Profile" className="w-8 h-8 rounded-full" />
                ) : (
                   <UserCircle className="w-8 h-8 text-slate-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <a
              href="/api/login"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg transition-colors hover:bg-primary/90"
              data-testid="button-login"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Replit
            </a>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-gray-500 hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-open-menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navigation.find((n) => n.href === location)?.name || "Aussie Tenders"}
            </h1>
          </div>
          <button className="relative p-2 text-gray-500 hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
