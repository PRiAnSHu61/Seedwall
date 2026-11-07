"use client";

import type { ReactNode } from "react";
import { reportMailto } from "@/lib/report";
import { AUTHOR } from "@/config/seo";

/** "Report a bug" — builds the pre-filled email at click time, so it includes the current page. */
export function ReportLink({ children, className, error, digest }: { children: ReactNode; className?: string; error?: string; digest?: string }) {
  return (
    <a
      className={className}
      href={`mailto:${AUTHOR.email}`}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = reportMailto({ error, digest });
      }}
    >
      {children}
    </a>
  );
}
