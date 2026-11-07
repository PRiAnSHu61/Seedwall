"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ReportLink } from "@/components/ReportLink";
import { AUTHOR } from "@/config/seo";

/** Any crash inside a page lands here instead of a blank screen, with a one-click report. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container section narrow">
      <span className="eyebrow">Something broke</span>
      <h1 className="page-h1">This seed didn&apos;t render.</h1>
      <p className="lead">
        Something went wrong on this page. That&apos;s a bug on our side, not something you did. Try again, and if it keeps
        happening, one click sends the details to Suryansh.
      </p>
      <div className="hero-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
        <ReportLink className="btn" error={error.message} digest={error.digest}>Email the details</ReportLink>
        <Link className="btn" href="/">Back to home</Link>
      </div>
      <p className="preview-dims" style={{ textAlign: "left", marginTop: 18 }}>
        Or write to <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>
        {error.digest ? <> · reference <code>{error.digest}</code></> : null}
      </p>
    </div>
  );
}
