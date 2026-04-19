import { Swords, Axe, Flame, Leaf, Globe, Zap, Skull, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

type GamemodeIconProps = {
  gamemode: string;
  className?: string;
  size?: number;
};

export function GamemodeIcon({ gamemode, className, size = 16 }: GamemodeIconProps) {
  const mode = gamemode.toLowerCase();
  
  const icons: Record<string, any> = {
    sword: Swords,
    axe: Axe,
    uhc: Flame,
    vanilla: Leaf,
    smp: Globe,
    diapot: Zap,
    nethpot: Skull,
    elytra: Wind,
  };

  const colors: Record<string, string> = {
    sword: "text-blue-400",
    axe: "text-red-400",
    uhc: "text-orange-500",
    vanilla: "text-green-400",
    smp: "text-emerald-500",
    diapot: "text-cyan-400",
    nethpot: "text-purple-500",
    elytra: "text-sky-300",
  };

  const IconComponent = icons[mode] || Swords;
  const colorClass = colors[mode] || "text-primary";

  return (
    <IconComponent 
      className={cn(colorClass, className)} 
      size={size} 
      strokeWidth={2.5}
    />
  );
}
