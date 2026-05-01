import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

export type Gamemode = {
  _id: string;
  slug: string;
  name: string;
  emoji: string;
  isActive: boolean;
  order: number;
};

async function fetchGamemodes(): Promise<Gamemode[]> {
  const res = await fetch(apiUrl("/api/gamemodes"));
  if (!res.ok) throw new Error("Failed to fetch gamemodes");
  return res.json();
}

export function useGamemodes() {
  return useQuery<Gamemode[]>({
    queryKey: ["gamemodes"],
    queryFn: fetchGamemodes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllGamemodes(token: string | null) {
  return useQuery<Gamemode[]>({
    queryKey: ["gamemodes", "all"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/gamemodes/all"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch gamemodes");
      return res.json();
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
