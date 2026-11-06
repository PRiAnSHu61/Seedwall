import { encodeState, decodeState, type StudioState } from "./studioState";

const KEY = "ws.collection.v1";

export interface SavedWallpaper {
  id: string;
  title: string;
  /** Encoded studio query string — survives param schema changes gracefully. */
  query: string;
  savedAt: string;
}

function isSaved(v: unknown): v is SavedWallpaper {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.title === "string" && typeof o.query === "string" && typeof o.savedAt === "string";
}

export function loadCollection(): SavedWallpaper[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isSaved) : [];
  } catch {
    return [];
  }
}

function persist(items: SavedWallpaper[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked */
  }
}

export function saveToCollection(state: StudioState, title: string): SavedWallpaper[] {
  const item: SavedWallpaper = {
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    title,
    query: encodeState(state),
    savedAt: new Date().toISOString(),
  };
  const next = [item, ...loadCollection()].slice(0, 60);
  persist(next);
  return next;
}

export function removeFromCollection(id: string): SavedWallpaper[] {
  const next = loadCollection().filter((i) => i.id !== id);
  persist(next);
  return next;
}

export const savedState = (item: SavedWallpaper): StudioState => decodeState(new URLSearchParams(item.query));
