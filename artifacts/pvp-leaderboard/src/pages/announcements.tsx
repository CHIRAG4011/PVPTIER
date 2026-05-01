import { Layout } from "@/components/layout/Layout";
import { useListAnnouncements } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Info, AlertTriangle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Announcements() {
  const [page, setPage] = useState(1);
  const { data: announcements, isLoading } = useListAnnouncements({ page });

  const getIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'update': return <ShieldAlert className="w-5 h-5 text-primary" />;
      case 'event': return <Calendar className="w-5 h-5 text-accent" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-display font-bold neon-text-primary mb-2">Announcements</h1>
        <p className="text-muted-foreground mb-8">Stay up to date with the latest platform news and updates.</p>

        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            ))
          ) : announcements?.announcements.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-xl">
              <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold font-display mb-2">No Announcements</h3>
              <p className="text-muted-foreground">There are no announcements to display at this time.</p>
            </div>
          ) : (
            announcements?.announcements.map((announcement) => (
              <div key={announcement.id} className={cn(
                "glass-card rounded-xl p-6 relative overflow-hidden",
                announcement.isPinned && "border-primary/50 shadow-[0_0_15px_-3px_rgba(0,212,255,0.1)]"
              )}>
                {announcement.isPinned && (
                  <div className="absolute top-4 right-4 text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded">
                    Pinned
                  </div>
                )}
                <div className="flex items-start gap-4 mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    announcement.type === 'info' ? 'bg-blue-500/20' :
                    announcement.type === 'warning' ? 'bg-yellow-500/20' :
                    announcement.type === 'update' ? 'bg-primary/20' :
                    'bg-accent/20'
                  )}>
                    {getIcon(announcement.type)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display text-foreground pr-16">{announcement.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>By {announcement.authorUsername}</span>
                      <span>•</span>
                      <span>{new Date(announcement.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}</span>
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {announcement.content}
                </div>
              </div>
            ))
          )}
        </div>

        {announcements && announcements.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between glass-card p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">
              Showing page {announcements.page} of {announcements.totalPages}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === announcements.totalPages}
                onClick={() => setPage(p => Math.min(announcements.totalPages, p + 1))}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
