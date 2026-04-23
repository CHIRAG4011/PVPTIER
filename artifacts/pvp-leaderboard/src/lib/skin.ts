// Helpers for working with Minecraft skin PNGs.
// A skin atlas is 64x64 (or 64x32) and the face is at (8,8) -> (16,16).

const faceCache = new Map<string, string>();

export function cropSkinFace(skinDataUrl: string, size = 128): Promise<string> {
  const cacheKey = `${size}|${skinDataUrl.length}|${skinDataUrl.slice(-32)}`;
  const cached = faceCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no 2d context"));
        ctx.imageSmoothingEnabled = false;
        // Face: source rect (8,8) 8x8 -> dest 0,0 size,size
        ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);
        // Hat layer overlay (24,8) 8x8 -> same dest
        ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
        const url = canvas.toDataURL("image/png");
        faceCache.set(cacheKey, url);
        resolve(url);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("skin image failed to load"));
    img.src = skinDataUrl;
  });
}

import { useEffect, useState } from "react";

export function useSkinFace(skinDataUrl: string | null | undefined, size = 128): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!skinDataUrl) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    cropSkinFace(skinDataUrl, size)
      .then(url => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, [skinDataUrl, size]);
  return src;
}

// Render a flat 2D body from a 64x64 skin atlas (head + body + arms + legs, front view).
const bodyCache = new Map<string, string>();
export function renderSkinBody(skinDataUrl: string, scale = 8): Promise<string> {
  const cacheKey = `body|${scale}|${skinDataUrl.length}|${skinDataUrl.slice(-32)}`;
  const cached = bodyCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Body is 16w x 32h in skin pixels (head 8x8, body 8x12, arms 4x12 each, legs 4x12 each).
        const W = 16, H = 32;
        const canvas = document.createElement("canvas");
        canvas.width = W * scale;
        canvas.height = H * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no 2d context"));
        ctx.imageSmoothingEnabled = false;
        const drawPart = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number) => {
          ctx.drawImage(img, sx, sy, sw, sh, dx * scale, dy * scale, sw * scale, sh * scale);
        };
        // Base layer (front faces)
        drawPart(8, 8, 8, 8, 4, 0);     // head
        drawPart(20, 20, 8, 12, 4, 8);  // body
        drawPart(44, 20, 4, 12, 0, 8);  // right arm (player's right -> screen left)
        drawPart(36, 52, 4, 12, 12, 8); // left arm (1.8+ skin)
        drawPart(4, 20, 4, 12, 4, 20);  // right leg
        drawPart(20, 52, 4, 12, 8, 20); // left leg
        // Overlay layer (hat + jacket + sleeves + pants)
        drawPart(40, 8, 8, 8, 4, 0);    // hat
        drawPart(20, 36, 8, 12, 4, 8);  // jacket
        drawPart(44, 36, 4, 12, 0, 8);  // right sleeve
        drawPart(52, 52, 4, 12, 12, 8); // left sleeve
        drawPart(4, 36, 4, 12, 4, 20);  // right pants
        drawPart(4, 52, 4, 12, 8, 20);  // left pants
        const url = canvas.toDataURL("image/png");
        bodyCache.set(cacheKey, url);
        resolve(url);
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error("skin image failed to load"));
    img.src = skinDataUrl;
  });
}

export function useSkinBody(skinDataUrl: string | null | undefined, scale = 8): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!skinDataUrl) { setSrc(null); return; }
    let cancelled = false;
    renderSkinBody(skinDataUrl, scale).then(u => { if (!cancelled) setSrc(u); }).catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, [skinDataUrl, scale]);
  return src;
}

export function resolveUserAvatarSrc(
  user: { customSkinUrl?: string | null; avatarUrl?: string | null; minecraftUsername?: string | null; username?: string } | null | undefined,
  customSkinFace: string | null,
): string | undefined {
  if (!user) return undefined;
  if (user.customSkinUrl && customSkinFace) return customSkinFace;
  if (user.avatarUrl) return user.avatarUrl;
  const ign = user.minecraftUsername || user.username;
  if (ign) return `https://mc-heads.net/avatar/${ign}/64`;
  return undefined;
}
