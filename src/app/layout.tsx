import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AUTHOR, KEYWORDS, REPO_URL, absoluteUrl } from "@/config/seo";
import { SITE } from "@/config/site";
import { GENERATORS } from "@/generators";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const TITLE = `${SITE.name} — generative desktop & phone wallpapers`;
const DESCRIPTION = `Free wallpaper generator: ${GENERATORS.length} generative looks (cutting mat, flow field, synthwave, git graph and more), editor themes like Dracula and Tokyo Night, your own quote or none. Download pixel-perfect PNGs for MacBook, iPhone, 4K and any size.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: `%s · ${SITE.name}` },
  description: DESCRIPTION,
  applicationName: SITE.name,
  keywords: KEYWORDS,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: "design",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "Seedwall — wallpapers grown from a seed" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og/default.png"], creator: AUTHOR.xHandle, site: AUTHOR.xHandle },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  appleWebApp: { title: SITE.name, capable: true, statusBarStyle: "black-translucent" },
};

/** Site-wide structured data: the website, the app, and its author. */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE.url}/#author` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      url: absoluteUrl("/studio"),
      applicationCategory: "DesignApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      image: absoluteUrl("/og/default.png"),
      author: { "@id": `${SITE.url}/#author` },
      codeRepository: REPO_URL,
      featureList: GENERATORS.map((g) => g.name).join(", "),
    },
    {
      "@type": "Person",
      "@id": `${SITE.url}/#author`,
      name: AUTHOR.name,
      url: AUTHOR.url,
      sameAs: [AUTHOR.url, AUTHOR.x, AUTHOR.linkedin, AUTHOR.github],
    },
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
  ],
};

/** Google Tag Manager container. */
const GTM_ID = "GTM-WZ63MQTH";
const gtmScript = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`;

/** Applies the saved theme before paint so there's no flash. */
const themeScript = `try{var t=localStorage.getItem("ws.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd data={STRUCTURED_DATA} />
        <script dangerouslySetInnerHTML={{ __html: gtmScript }} />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <a href="#main" className="visually-hidden">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <ServiceWorker />
      </body>
    </html>
  );
}
