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
  { href: "/admin/submissions", label: "Submissions", icon: Swords },
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/admin" className="flex items-center gap-2 text-primary font-display font-bold text-lg">
          <Shield className="w-5 h-5" />
          ADMIN<span className="text-foreground">PANEL</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
          Management
        </div>

        {adminLinks.map((link) => {
          const isActive = link.exact ? location === link.href : location.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-muted'}`}
                onClick={() => setMobileOpen(false)}
              >
                <link.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {link.label}
              </Button>
            </Link>
          );
        })}

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2 px-3">
          Configuration
        </div>

        {configLinks.map((link) => {
          const isActive = location.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-muted'}`}
                onClick={() => setMobileOpen(false)}
              >
                <link.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {link.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Button variant="outline" className="w-full justify-start gap-2" asChild>
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
    <div className="min-h-[100dvh] flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-20">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-30">
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
