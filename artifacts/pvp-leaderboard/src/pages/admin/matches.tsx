import { AdminLayout } from "@/components/layout/AdminLayout";
import { useState } from "react";
import { apiUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Edit, Trash2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { GamemodeIcon } from "@/components/ui/gamemode-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];

async function fetchMatches(page: number, search: string) {
  const token = localStorage.getItem("pvp_token");
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  const res = await fetch(apiUrl(`/api/admin/matches?${params}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export default function AdminMatches() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({ winnerUsername: "", loserUsername: "", gamemode: "", eloChange: 25 });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-matches", page, search],
    queryFn: () => fetchMatches(page, search),
  });

  const handleEditClick = (match: any) => {
    setEditingMatch(match);
    setEditForm({
      winnerUsername: match.winnerUsername,
      loserUsername: match.loserUsername,
      gamemode: match.gamemode,
      eloChange: match.eloChange,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMatch) return;
    setSaving(true);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/admin/matches/${editingMatch.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Match updated successfully.");
        setEditingMatch(null);
        refetch();
      } else {
        toast.error(data.message || "Failed to update match");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, winnerUsername: string) => {
    if (!confirm(`Delete match where ${winnerUsername} won? This cannot be undone.`)) return;
    setDeleting(id);
    const token = localStorage.getItem("pvp_token");
    try {
      const res = await fetch(apiUrl(`/api/admin/matches/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Match deleted.");
        refetch();
      } else {
        toast.error(data.message || "Failed to delete match");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Match Records</h1>
          <p className="text-muted-foreground">Read-only history of every approved match. Players create matches; admins only review and audit.</p>
        </div>

        <div className="glass-card p-4 rounded-xl border-border flex items-start gap-3 text-sm">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            Matches are no longer created from the admin panel. They appear here automatically once a player submits evidence and you approve it from <strong className="text-foreground">Submissions</strong>. Use this page to inspect, edit metadata, or delete bad records.
          </p>
        </div>

        <div className="glass-card p-4 rounded-xl border-border flex items-center">
          <div className="flex-1 w-full max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by player name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Winner</TableHead>
                <TableHead>Loser</TableHead>
                <TableHead>Gamemode</TableHead>
                <TableHead>ELO Change</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-6 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.matches ?? []).length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No matches found.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.matches ?? []).map((m: any) => (
                  <TableRow key={m.id} className="border-border hover:bg-muted/20">
                    <TableCell className="font-bold text-green-400">{m.winnerUsername}</TableCell>
                    <TableCell className="font-bold text-red-400">{m.loserUsername}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GamemodeIcon gamemode={m.gamemode} size={14} />
                        <span className="capitalize">{m.gamemode}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-primary font-bold">±{m.eloChange}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.playedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(m)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(m.id, m.winnerUsername)}
                        disabled={deleting === m.id}
                      >
                        <Trash2 className="w-4 h-4" />
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

      <Dialog open={!!editingMatch} onOpenChange={o => !o && setEditingMatch(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Winner IGN</label>
              <Input
                value={editForm.winnerUsername}
                onChange={e => setEditForm(f => ({ ...f, winnerUsername: e.target.value }))}
                className="bg-background/50 mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Loser IGN</label>
              <Input
                value={editForm.loserUsername}
                onChange={e => setEditForm(f => ({ ...f, loserUsername: e.target.value }))}
                className="bg-background/50 mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Gamemode</label>
              <Select value={editForm.gamemode} onValueChange={v => setEditForm(f => ({ ...f, gamemode: v }))}>
                <SelectTrigger className="bg-background/50 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAMEMODES.map(gm => <SelectItem key={gm} value={gm} className="capitalize">{gm}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">ELO Change</label>
              <Input
                type="number"
                value={editForm.eloChange}
                onChange={e => setEditForm(f => ({ ...f, eloChange: Number(e.target.value) }))}
                className="bg-background/50 mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveEdit} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditingMatch(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
