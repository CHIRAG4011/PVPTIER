import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListSubmissions, useApproveSubmission, useRejectSubmission } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";

export default function AdminSubmissions() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");

  const { data, isLoading, refetch } = useListSubmissions({ page, status: status !== "all" ? status : undefined });
  const approveMutation = useApproveSubmission();
  const rejectMutation = useRejectSubmission();

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Match submission approved.");
        refetch();
      },
      onError: (e) => toast.error(e.message)
    });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate({ id }, {
      onSuccess: () => {
        toast.success("Match submission rejected.");
        refetch();
      },
      onError: (e) => toast.error(e.message)
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Match Submissions</h1>
            <p className="text-muted-foreground">Review and approve player-reported matches.</p>
          </div>
          
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All Submissions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Match Details</TableHead>
                <TableHead>Gamemode</TableHead>
                <TableHead>Result Claimed</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.submissions.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No {status !== "all" ? status : ""} submissions found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.submissions.map((s) => (
                  <TableRow key={s.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-bold text-primary">{s.submitterUsername}</span>
                        <span className="text-muted-foreground mx-2">vs</span>
                        <span className="font-bold">{s.opponentUsername}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GamemodeIcon gamemode={s.gamemode} size={16} />
                        <span className="capitalize">{s.gamemode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${s.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                        {s.result.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.evidence ? (
                        <a href={s.evidence} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                          View Link <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {s.status === 'pending' ? (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(s.id)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(s.id)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider border ${
                          s.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {s.status}
                        </span>
                      )}
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
