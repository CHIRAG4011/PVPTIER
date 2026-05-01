import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { useListTickets, useCreateTicket } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Ticket as TicketIcon, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ticketSchema = z.object({
  subject: z.string().min(5, { message: "Subject must be at least 5 characters" }).max(120, { message: "Subject must be under 120 characters" }),
  category: z.enum([
    "bug",
    "report",
    "appeal",
    "alliance_promotion",
    "account_issue",
    "payment",
    "suggestion",
    "harassment",
    "technical_support",
    "other",
  ], { required_error: "Category is required" }),
  priority: z.enum(["low", "medium", "high"]).optional(),
  message: z.string().min(20, { message: "Please describe your issue in at least 20 characters" }).max(4000, { message: "Message is too long (max 4000)" }),
});

const CATEGORY_OPTIONS: { value: z.infer<typeof ticketSchema>["category"]; label: string; description: string }[] = [
  { value: "report", label: "Player Report", description: "Report a player for cheating, griefing, or rule-breaking" },
  { value: "appeal", label: "Ban / Mute Appeal", description: "Appeal a moderation action taken against your account" },
  { value: "alliance_promotion", label: "Alliance Promotion", description: "Request a promotion, role change, or rank within your alliance" },
  { value: "harassment", label: "Harassment Report", description: "Report harassment, hate speech, or toxic behavior" },
  { value: "account_issue", label: "Account Issue", description: "Lost access, username changes, linked accounts, or password help" },
  { value: "payment", label: "Payment / Billing", description: "Issues with purchases, refunds, or unreceived items" },
  { value: "technical_support", label: "Technical Support", description: "Connection problems, lag, crashes, or client errors" },
  { value: "bug", label: "Bug Report", description: "Report a bug or unexpected behavior in the server or website" },
  { value: "suggestion", label: "Suggestion / Feedback", description: "Share an idea or feedback to help us improve" },
  { value: "other", label: "Other", description: "Anything else that doesn't fit a category above" },
];

export default function Tickets() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: ticketsData, isLoading, refetch } = useListTickets({ page: 1 }, {
    query: { queryKey: ["tickets"], enabled: isAuthenticated }
  });
  
  const createMutation = useCreateTicket();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      category: "other",
      priority: "medium",
      message: "",
    },
  });

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Ticket created successfully");
        setIsDialogOpen(false);
        form.reset();
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create ticket");
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'closed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
              <TicketIcon className="w-8 h-8 text-primary" />
              Support Tickets
            </h1>
            <p className="text-muted-foreground">Manage your support requests, player reports, and appeals.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="w-4 h-4" /> New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto border-border bg-card p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                <DialogTitle className="text-2xl font-display flex items-center gap-2">
                  <TicketIcon className="w-6 h-6 text-primary" />
                  Open a Support Ticket
                </DialogTitle>
                <DialogDescription>
                  Choose the category that best describes your request. The more detail you provide, the faster our staff can help you.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => {
                      const selected = CATEGORY_OPTIONS.find(o => o.value === field.value);
                      return (
                        <FormItem>
                          <FormLabel className="text-base">Category <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select the category that best fits your issue" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[320px]">
                              {CATEGORY_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex flex-col py-1">
                                    <span className="font-medium">{opt.label}</span>
                                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selected && (
                            <p className="text-xs text-muted-foreground mt-1.5">{selected.description}</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-base">Subject <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input className="h-11" placeholder="Brief summary of your request" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low — minor / not urgent</SelectItem>
                              <SelectItem value="medium">Medium — affects gameplay</SelectItem>
                              <SelectItem value="high">High — urgent or blocking</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Description <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={`Please include:\n• What happened (and what you expected)\n• Date, time, and server / world if relevant\n• Player names, screenshots, or video links\n• Any steps to reproduce the issue`}
                            className="min-h-[220px] resize-y leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <div className="flex items-center justify-between mt-1">
                          <FormMessage />
                          <span className="text-xs text-muted-foreground ml-auto">
                            {field.value?.length ?? 0} / 4000
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    By submitting, you agree to follow the server rules. False reports, spam tickets, or abuse of the support system may result in moderation action.
                  </div>

                  <DialogFooter className="gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} className="gap-2 min-w-[160px]">
                      {createMutation.isPending ? "Submitting..." : (<><Send className="w-4 h-4" /> Submit Ticket</>)}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border-border">
          {isLoading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : ticketsData?.tickets.length === 0 ? (
            <div className="p-12 text-center">
              <TicketIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">No Tickets Found</h3>
              <p className="text-muted-foreground mb-6">You haven't submitted any support tickets yet.</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Create your first ticket</Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ticketsData?.tickets.map(ticket => (
                <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block hover:bg-muted/20 transition-colors p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getStatusIcon(ticket.status)}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground hover:text-primary transition-colors mb-1">
                          {ticket.subject}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">#{ticket.id}</span>
                          <span className="px-2 py-0.5 rounded bg-muted/50 border border-border">
                            {CATEGORY_OPTIONS.find(o => o.value === ticket.category)?.label ?? ticket.category}
                          </span>
                          <span className="capitalize">
                            Priority: <span className={cn(
                              "font-medium",
                              ticket.priority === 'high' ? "text-red-400" :
                              ticket.priority === 'medium' ? "text-yellow-400" : "text-blue-400"
                            )}>{ticket.priority}</span>
                          </span>
                          <span>Opened {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right pl-4">
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                        ticket.status === 'open' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        ticket.status === 'pending' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-green-500/10 text-green-400 border-green-500/20"
                      )}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
