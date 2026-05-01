import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListTickets } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminTickets() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useListTickets({ page, status: status !== "all" ? status : undefined });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Support Tickets</h1>
            <p className="text-muted-foreground">Manage user reports and support requests.</p>
          </div>
          
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Ticket</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.tickets.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.tickets.map((t) => (
                  <TableRow key={t.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div className="font-medium">{t.subject}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        #{t.id} • {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{t.username}</TableCell>
                    <TableCell>
                      <span className="capitalize px-2 py-1 rounded bg-muted/50 border border-border text-xs">
                        {t.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "capitalize text-xs font-medium",
                        t.priority === 'high' ? "text-red-400" :
                        t.priority === 'medium' ? "text-yellow-400" : "text-blue-400"
                      )}>{t.priority}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        t.status === 'open' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        t.status === 'pending' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-green-500/10 text-green-400 border-green-500/20"
                      )}>
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/tickets/${t.id}`}>
                          View <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
              <p className="text-sm text-muted-foreground">
                Showing page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
