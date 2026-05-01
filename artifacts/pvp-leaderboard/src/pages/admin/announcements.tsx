import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const announceSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(10),
  type: z.enum(["info", "warning", "update", "event"]),
  isPinned: z.boolean().default(false),
});

export default function AdminAnnouncements() {
  const [page] = useState(1);
  const [open, setOpen] = useState(false);

  const { data, isLoading, refetch } = useListAnnouncements({ page });
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const form = useForm<z.infer<typeof announceSchema>>({
    resolver: zodResolver(announceSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "info",
      isPinned: false,
    }
  });

  const onSubmit = (values: z.infer<typeof announceSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Announcement published.");
        setOpen(false);
        form.reset();
        refetch();
      },
      onError: (e) => toast.error(e.message)
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this announcement?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast.success("Announcement deleted.");
          refetch();
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground">Manage public platform announcements.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Post</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="isPinned" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Pin to top</FormLabel>
                        </div>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="content" render={({ field }) => (
                    <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea className="min-h-[150px]" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>Publish</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-border"><TableCell colSpan={5}><Skeleton className="h-20 w-full" /></TableCell></TableRow>
              ) : data?.announcements.length === 0 ? (
                <TableRow className="border-border"><TableCell colSpan={5} className="h-24 text-center">No announcements found.</TableCell></TableRow>
              ) : (
                data?.announcements.map((a) => (
                  <TableRow key={a.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div className="font-bold flex items-center gap-2">
                        {a.isPinned && <Pin className="w-3 h-3 text-primary" />}
                        {a.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded",
                        a.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                        a.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        a.type === 'update' ? 'bg-primary/20 text-primary' :
                        'bg-accent/20 text-accent'
                      )}>{a.type}</span>
                    </TableCell>
                    <TableCell>{a.authorUsername}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
