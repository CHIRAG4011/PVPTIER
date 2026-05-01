import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/api";
import { Bell, Check, Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function NotificationsBell() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notif-count"],
    queryFn: async () => {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl("/api/notifications/unread-count"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const { data: listData, refetch: refetchList } = useQuery({
    queryKey: ["notif-list"],
    queryFn: async () => {
      const token = localStorage.getItem("pvp_token");
      const res = await fetch(apiUrl("/api/notifications"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;
  const unread = countData?.count || 0;
  const items = listData?.notifications || [];

  const markAllRead = async () => {
    const token = localStorage.getItem("pvp_token");
    await fetch(apiUrl("/api/notifications/read-all"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    qc.invalidateQueries({ queryKey: ["notif-count"] });
    refetchList();
  };

  const markRead = async (id: string) => {
    const token = localStorage.getItem("pvp_token");
    await fetch(apiUrl(`/api/notifications/${id}/read`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    qc.invalidateQueries({ queryKey: ["notif-count"] });
    refetchList();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors text-foreground/80 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 bg-card border-border">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-bold flex items-center gap-2"><Inbox className="w-4 h-4 text-primary" /> Notifications</h3>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <Check className="w-3 h-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((n: any) => {
                const inner = (
                  <div className="p-3 hover:bg-muted/30 transition-colors flex gap-3">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                    <div className={`flex-1 min-w-0 ${n.read ? "opacity-60" : ""}`}>
                      <div className="font-medium text-sm leading-snug">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => markRead(n.id)}>
                    <div className="cursor-pointer">{inner}</div>
                  </Link>
                ) : (
                  <div key={n.id} onClick={() => markRead(n.id)} className="cursor-pointer">{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
