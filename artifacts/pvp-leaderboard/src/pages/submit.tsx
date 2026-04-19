import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateSubmission } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Swords, ShieldAlert } from "lucide-react";

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];

const submissionSchema = z.object({
  opponentUsername: z.string().min(1, { message: "Opponent username is required" }),
  gamemode: z.string().min(1, { message: "Gamemode is required" }),
  result: z.enum(["win", "loss"], { required_error: "Result is required" }),
  evidence: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal("")),
});

export default function SubmitMatch() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const submitMutation = useCreateSubmission();

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      opponentUsername: "",
      gamemode: "",
      result: "win",
      evidence: "",
    },
  });

  const onSubmit = (values: z.infer<typeof submissionSchema>) => {
    submitMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Match submitted successfully! Waiting for admin approval.");
        form.reset();
        setLocation("/player/" + user?.id);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to submit match");
      }
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold neon-text-primary mb-2 flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            Submit Match Result
          </h1>
          <p className="text-muted-foreground">
            Report a ranked match result. All submissions are reviewed by moderators.
            False reports may result in a ban.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8 border-primary/20">
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 rounded-lg p-4 mb-6 flex gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Evidence strongly recommended</p>
              <p className="text-yellow-200/80">
                While not strictly required, providing a screenshot or video link of the match result 
                significantly speeds up the approval process and protects you from counter-claims.
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="opponentUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opponent Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Notch" {...field} className="bg-background/50 border-border/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gamemode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gamemode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue placeholder="Select gamemode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GAMEMODES.map(gm => (
                            <SelectItem key={gm} value={gm} className="capitalize">{gm}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Result</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="win" className="text-green-400 font-bold">I Won</SelectItem>
                        <SelectItem value="loss" className="text-red-400 font-bold">I Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://imgur.com/... or https://youtube.com/..." {...field} className="bg-background/50 border-border/50" />
                    </FormControl>
                    <FormDescription>Link to a screenshot or video proving the result.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Match"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
