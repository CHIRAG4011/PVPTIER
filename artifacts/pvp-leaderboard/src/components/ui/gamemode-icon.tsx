import { Swords, Axe, Flame, Leaf, Globe, Zap, Skull, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

type GamemodeIconProps = {
  gamemode: string;
  emoji?: string | null;
  className?: string;
  size?: number;
};

const LUCIDE_ICONS: Record<string, any> = {
  sword: Swords,
  axe: Axe,
  uhc: Flame,
  vanilla: Leaf,
  smp: Globe,
  diapot: Zap,
  nethpot: Skull,
  elytra: Wind,
};

const LUCIDE_COLORS: Record<string, string> = {
  sword: "text-blue-400",
  axe: "text-red-400",
  uhc: "text-orange-500",
  vanilla: "text-green-400",
  smp: "text-emerald-500",
  diapot: "text-cyan-400",
  nethpot: "text-purple-500",
  elytra: "text-sky-300",
};

export function GamemodeIcon({ gamemode, emoji, className, size = 16 }: GamemodeIconProps) {
  const mode = gamemode.toLowerCase();

  if (emoji) {
    return (
      <span
        className={cn("inline-flex items-center justify-center leading-none select-none", className)}
        style={{ fontSize: size, lineHeight: 1 }}
        aria-label={gamemode}
      >
        {emoji}
      </span>
    );
  }

  const IconComponent = LUCIDE_ICONS[mode] || Swords;
  const colorClass = LUCIDE_COLORS[mode] || "text-primary";

  return (
    <IconComponent
      className={cn(colorClass, className)}
      size={size}
      strokeWidth={2.5}
    />
  );
}
