export const SITE = {
  name: "Seedwall",
  tagline: "Browse, customise and generate desktop and phone wallpapers.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://seedwall.suryansh.work",
  /** Shared Google Drive folder for "Download the full pack". Empty → button disabled. */
  driveUrl: process.env.NEXT_PUBLIC_DRIVE_URL ?? "",
  /** Google AdSense publisher id ("ca-pub-…"). Empty → no ads, no ads.txt. */
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "",
  /** Id of the one display ad unit shown above the footer. Empty → no ad is placed. */
  adsenseSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "",
} as const;

/** Looks that get a "New" tag and the top spot on the home page. Newest first. */
export const NEW_GENERATORS: readonly string[] = ["trinetra", "jyotirlinga", "sudarshan", "padmanabha", "dhruva", "kintsugi", "ascent", "clockwork"];

/** Extracts the folder id from a Drive folder link, or "" if it isn't one. */
export function driveFolderId(url: string): string {
  return /\/folders\/([\w-]+)/.exec(url)?.[1] ?? "";
}
