import { cn } from "@/lib/utils";

type TierBadgeProps = {
  tier: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showGlow?: boolean;
};

export function TierBadge({ tier, size = "md", className, showGlow = true }: TierBadgeProps) {
  const isHighTier = tier.startsWith("HT");
  const level = parseInt(tier.replace(/\D/g, ""), 10);
  
  // Style configurations
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
    xl: "text-base px-4 py-2 font-bold",
  };

  const styleClasses = isHighTier
    ? "bg-gradient-to-br from-yellow-400 via-yellow-600 to-amber-700 text-black border border-yellow-300/50"
    : "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 text-black border border-slate-300/50";

  const glowClasses = showGlow
    ? isHighTier
      ? "shadow-[0_0_15px_-3px_rgba(234,179,8,0.5)]"
      : "shadow-[0_0_10px_-3px_rgba(148,163,184,0.4)]"
    : "";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-display font-bold uppercase tracking-wider rounded",
        styleClasses,
        sizeClasses[size],
        glowClasses,
        className
      )}
      title={`${isHighTier ? 'High Tier' : 'Low Tier'} ${level}`}
    >
      {tier}
    </span>
  );
}
