import { Shield, Users, Trophy, Ticket, Target, Bell, History, Menu, LogOut, ChevronLeft, Settings, ScrollText, Swords } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ReactNode, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: Trophy, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/players", label: "Players", icon: Target },
  { href: "/admin/matches", label: "Matches", icon: Swords },
  { href: "/admin/submissions", label: "Submissions", icon: ScrollText },
  { href: "/admin/tier-tests", label: "Tier Tests", icon: Trophy },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/seasons", label: "Seasons", icon: ScrollText },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/logs", label: "Audit Logs", icon: History },
];

const configLinks = [
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect if not admin (handled by routes usually, but good fallback)
  if (user && !['admin', 'superadmin', 'moderator'].includes(user.role)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-center p-4">
        <div>
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You do not have permission to view this page.</p>
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const renderLink = (link: { href: string; label: string; icon: any; exact?: boolean }) => {
    const isActive = link.exact ? location === link.href : location.startsWith(link.href);
    return (
      <Link key={link.href} href={link.href}>
        <Button
          variant="ghost"
          className={`w-full justify-start gap-3 relative transition-all ${
            isActive
              ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]'
              : 'hover:bg-primary/5 hover:text-foreground'
          }`}
          onClick={() => setMobileOpen(false)}
        >
          {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />}
          <link.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="font-medium">{link.label}</span>
        </Button>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl border-r border-primary/20 relative">
      <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
      <div className="h-16 flex items-center px-6 border-b border-primary/20 relative">
        <Link href="/admin" className="flex items-center gap-2.5 font-display font-bold text-lg group">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/50 flex items-center justify-center group-hover:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.7)] transition-all animate-pulse-glow">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="text-primary">ADMIN<span className="text-foreground">PANEL</span></span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.2em] mb-2 px-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-primary/20" />
          Management
          <span className="h-px flex-1 bg-primary/20" />
        </div>

        {adminLinks.map(renderLink)}

        <div className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.2em] mt-4 mb-2 px-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-primary/20" />
          Configuration
          <span className="h-px flex-1 bg-primary/20" />
        </div>

        {configLinks.map(renderLink)}
      </div>

      <div className="p-4 border-t border-primary/20 flex flex-col gap-2 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <Button variant="outline" className="w-full justify-start gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/10" asChild>
          <Link href="/">
            <ChevronLeft className="w-4 h-4" />
            Back to Site
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-background text-foreground relative overflow-x-hidden">
      {/* Ambient backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 grid-bg opacity-15" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[140px] rounded-full" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-20">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 flex flex-col min-w-0 relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-primary/20 bg-card/70 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-30">
          <Link href="/admin" className="flex items-center gap-2 text-primary font-display font-bold text-lg">
            <Shield className="w-5 h-5" />
            ADMIN
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
