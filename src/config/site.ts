export const SITE = {
  name: "Seedwall",
  tagline: "Browse, customise and generate desktop and phone wallpapers.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://seedwall.suryansh.work",
  /** Shared Google Drive folder for "Download the full pack". Empty → button disabled. */
  driveUrl: process.env.NEXT_PUBLIC_DRIVE_URL ?? "",
} as const;

/** Extracts the folder id from a Drive folder link, or "" if it isn't one. */
export function driveFolderId(url: string): string {
  return /\/folders\/([\w-]+)/.exec(url)?.[1] ?? "";
}
