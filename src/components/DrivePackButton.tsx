import { SITE } from "@/config/site";

/** "Download the full pack" → the shared Drive folder, or a disabled placeholder. */
export function DrivePackButton({ primary = false }: { primary?: boolean }) {
  const cls = `btn${primary ? " btn-primary" : ""}`;
  if (!SITE.driveUrl)
    return (
      <span className={cls} aria-disabled="true" title="Link coming soon">
        Link coming soon
      </span>
    );
  return (
    <a className={cls} href={SITE.driveUrl} target="_blank" rel="noreferrer">
      Download the full pack ↗
    </a>
  );
}
