import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { LiveThumb } from "@/components/LiveThumb";
import { AUTHOR, absoluteUrl, pageMetadata } from "@/config/seo";
import { GENERATORS, getGenerator } from "@/generators";
import type { ParamDef } from "@/generators/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return GENERATORS.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const gen = getGenerator((await params).id);
  if (!gen) return {};
  return pageMetadata({
    title: `${gen.name} wallpaper generator`,
    description: `${gen.description} ${gen.presets.length} presets, editor themes, your own quote or none — free PNG downloads for any screen.`,
    path: `/generators/${gen.id}`,
    image: `/og/${gen.id}.png`,
    imageAlt: `${gen.name} wallpaper made with Seedwall`,
  });
}

function describe(def: ParamDef): string {
  switch (def.kind) {
    case "range": return `${def.min}–${def.max}`;
    case "select": return def.options.map((o) => o.value).join(" · ");
    case "color": return "hex colour";
    case "toggle": return "on / off";
    case "seed": return "integer";
    case "text": return def.multiline ? "multi-line text" : "text";
  }
}

export default async function GeneratorPage({ params }: { params: Promise<{ id: string }> }) {
  const gen = getGenerator((await params).id);
  if (!gen) notFound();
  const first = gen.presets[0];
  const url = absoluteUrl(`/generators/${gen.id}`);
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Seedwall", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Generators", item: absoluteUrl("/#generators") },
          { "@type": "ListItem", position: 3, name: gen.name, item: url },
        ],
      },
      {
        "@type": "CreativeWork",
        name: `${gen.name} wallpaper generator`,
        description: gen.description,
        url,
        image: absoluteUrl(`/og/${gen.id}.png`),
        author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
        isAccessibleForFree: true,
        keywords: gen.presets.map((p) => p.title).join(", "),
      },
    ],
  };

  return (
    <div className="container">
      <JsonLd data={structured} />
      <section className="gen-hero">
        <div>
          <span className="eyebrow">Generator · {gen.id}</span>
          <h1>{gen.name}</h1>
          <p>{gen.description}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href={`/studio?g=${gen.id}&p=${first?.id ?? ""}`}>Open in Studio</Link>
            <Link className="btn" href="/gallery">See the gallery</Link>
          </div>
        </div>
        <div className="card-media">
          <LiveThumb gen={gen.id} preset={first?.id} w={2400} h={1500} label={`${gen.name} preview`} />
        </div>
      </section>

      <section className="section" aria-labelledby="presets-h">
        <div className="section-head">
          <h2 id="presets-h">Presets</h2>
        </div>
        <div className="grid-cards">
          {gen.presets.map((p) => (
            <Link key={p.id} href={`/studio?g=${gen.id}&p=${p.id}`} className="card">
              <div className="card-media">
                <LiveThumb gen={gen.id} preset={p.id} w={1600} h={1000} label={p.title} />
              </div>
              <div className="card-body">
                <h3>{p.title}</h3>
                <p className="mono">{p.id}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="params-h">
        <div className="section-head">
          <h2 id="params-h">Parameters</h2>
        </div>
        <div className="table-wrap">
          <table className="param-table">
            <thead>
              <tr><th>Key</th><th>Label</th><th>Values</th><th>Default</th></tr>
            </thead>
            <tbody>
              {Object.entries(gen.params).filter(([, def]) => !def.hidden).map(([key, def]) => (
                <tr key={key}>
                  <td><code>{key}</code></td>
                  <td>{def.label}</td>
                  <td>{describe(def)}</td>
                  <td><code>{String(def.default).slice(0, 40)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
