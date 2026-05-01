import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/lib/auth";
import { useAllGamemodes, type Gamemode } from "@/hooks/use-gamemodes";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Gamepad2, Check, X, ToggleLeft, ToggleRight, Smile } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const EMOJI_PRESETS = [
  "⚔️","🪓","🔥","🌿","💀","🏆","🎯","⚡","🌊","🗡️",
  "🛡️","🏹","🧨","💥","🎮","🕹️","🐉","🦁","🐺","🦊",
  "🌙","☀️","❄️","🌪️","💎","👑","🎪","🎭","🎲","🃏",
  "🍎","🍏","🧪","⚗️","🔮","🧿","🪄","🎁","🔴","🟢",
  "🔵","🟡","🟠","🟣","⚫","⚪","🎀","🏅","🥇","🥊",
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="text-4xl w-12 h-12 flex items-center justify-center rounded-lg bg-muted border border-border">
          {value || <Smile className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="flex-1">
          <Input
            placeholder="Or type/paste any emoji…"
            value={custom}
            onChange={e => {
              setCustom(e.target.value);
              if (e.target.value) onChange(e.target.value.slice(0, 8));
            }}
            maxLength={8}
            className="h-9 text-lg"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EMOJI_PRESETS.map(e => (
          <button
            key={e}
            type="button"
            onClick={() => { onChange(e); setCustom(""); }}
            className={`text-xl w-9 h-9 rounded-lg hover:bg-muted transition-colors flex items-center justify-center border ${value === e ? "border-primary bg-primary/10" : "border-transparent"}`}
            title={e}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

type FormState = {
  slug: string;
  name: string;
  emoji: string;
  isActive: boolean;
  order: number;
};

const emptyForm = (): FormState => ({ slug: "", name: "", emoji: "", isActive: true, order: 0 });

export default function AdminGamemodes() {
  const { user } = useAuth();
  const token = localStorage.getItem("pvp_token");
  const { data: gamemodes = [], isLoading } = useAllGamemodes(token);
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["gamemodes"] });
    qc.invalidateQueries({ queryKey: ["gamemodes", "all"] });
  };

  const openCreate = () => {
    setEditingSlug(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (gm: Gamemode) => {
    setEditingSlug(gm.slug);
    setForm({ slug: gm.slug, name: gm.name, emoji: gm.emoji, isActive: gm.isActive, order: gm.order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.name.trim()) {
      toast.error("Slug and name are required");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingSlug;
      const url = isEdit
        ? apiUrl(`/api/gamemodes/${editingSlug}`)
        : apiUrl("/api/gamemodes");
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");
      toast.success(isEdit ? "Gamemode updated" : "Gamemode created");
      setDialogOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (gm: Gamemode) => {
    try {
      const res = await fetch(apiUrl(`/api/gamemodes/${gm.slug}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !gm.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`${gm.name} ${!gm.isActive ? "enabled" : "disabled"}`);
      refresh();
    } catch {
      toast.error("Failed to toggle gamemode");
    }
  };

  const handleDelete = async () => {
    if (!deleteSlug) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/api/gamemodes/${deleteSlug}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Gamemode deleted");
      setDeleteSlug(null);
      refresh();
    } catch {
      toast.error("Failed to delete gamemode");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              Gamemodes
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage game modes, their emojis, and active status. All changes sync across leaderboard, submissions, and player stats.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Gamemode
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card/50">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : gamemodes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Gamepad2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No gamemodes yet. Add one to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-10"></th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Emoji</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Slug</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...gamemodes].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug)).map((gm, i) => (
                  <tr key={gm._id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      <GripVertical className="w-4 h-4" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-2xl">{gm.emoji || "—"}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{gm.name}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{gm.slug}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{gm.order}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(gm)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                          gm.isActive
                            ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                            : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {gm.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {gm.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(gm)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteSlug(gm.slug)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">How gamemodes sync</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Active gamemodes appear in the leaderboard filter, submit form, and player stats</li>
            <li>Disabling a gamemode hides it from public views but preserves all existing match data</li>
            <li>Player scores and tier rankings for each gamemode update automatically as matches are approved</li>
            <li>Emojis appear on leaderboard cards, player profiles, and match history</li>
          </ul>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Edit Gamemode" : "Add Gamemode"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Slug <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. sword"
                  value={form.slug}
                  disabled={!!editingSlug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                />
                <p className="text-xs text-muted-foreground">Lowercase, no spaces. Cannot be changed later.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Display Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Sword"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                  />
                  <Label className="cursor-pointer">{form.isActive ? "Active" : "Inactive"}</Label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <EmojiPicker value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e })) } />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingSlug ? "Save Changes" : "Create Gamemode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSlug} onOpenChange={o => !o && setDeleteSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gamemode</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteSlug}</strong>. Existing match records will keep the gamemode slug as a string, but the gamemode will no longer appear in filters or submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
