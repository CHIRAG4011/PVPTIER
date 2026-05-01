import { connectDB, Player } from "@workspace/db";

const SUPPORTED_GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];
const TIER_ORDER = ["HT1","HT2","HT3","HT4","HT5","LT1","LT2","LT3","LT4","LT5"];

function offsetTier(base: string, delta: number): string {
  const idx = TIER_ORDER.indexOf(base);
  if (idx < 0) return base;
  const next = Math.max(0, Math.min(TIER_ORDER.length - 1, idx + delta));
  return TIER_ORDER[next] as string;
}

async function main() {
  await connectDB();
  const players = await Player.find({});
  let updated = 0;
  for (const pl of players) {
    const baseTier = pl.tier ?? "LT3";
    const existing = (pl.gamemodeStats ?? []) as any[];
    const byMode = new Map(existing.map((s: any) => [s.gamemode, s]));
    let changed = false;
    SUPPORTED_GAMEMODES.forEach((gm, i) => {
      const cur: any = byMode.get(gm);
      const delta = ((i * 31 + (pl.minecraftUsername?.length ?? 0)) % 5) - 2;
      const desiredTier = offsetTier(baseTier, delta);
      if (!cur) {
        byMode.set(gm, { gamemode: gm, wins: 0, losses: 0, elo: 0, tier: desiredTier });
        changed = true;
      } else if (!cur.tier) {
        cur.tier = desiredTier;
        changed = true;
      }
    });
    if (changed) {
      pl.gamemodeStats = Array.from(byMode.values()) as any;
      pl.markModified("gamemodeStats");
      await pl.save();
      updated++;
    }
  }
  console.log(`Backfilled ${updated} of ${players.length} players`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
