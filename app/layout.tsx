import type { Metadata } from "next";
import "./globals.css";
import { vongaProducts } from "@/lib/vonga";
import { BUSINESS_ADDRESS, BUSINESS_PHONE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Vonga — Elegance Redefined", template: "%s — Vonga" },
  description: SITE_DESCRIPTION,
  keywords: ["Vonga", "bespoke fashion Pretoria", "made-to-measure tailoring", "occasion wear South Africa", "bridal gowns Pretoria", "corporate tailoring", "ready-to-wear couture"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Vonga — Elegance Redefined",
    description: SITE_DESCRIPTION,
    locale: "en_ZA",
    images: [{ url: "/vonga/og-image.jpg", width: 1200, height: 630, alt: "A Vonga bespoke gown" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vonga — Elegance Redefined",
    description: SITE_DESCRIPTION,
    images: ["/vonga/og-image.jpg"],
  },
};

function StructuredData() {
  const prices = vongaProducts.map((p) => p.price);
  const priceRange = `R${Math.min(...prices)} - R${Math.max(...prices)}`;
  const clothingStore = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/vonga/og-image.jpg`,
    telephone: BUSINESS_PHONE,
    priceRange,
    address: { "@type": "PostalAddress", streetAddress: BUSINESS_ADDRESS.street, addressLocality: BUSINESS_ADDRESS.locality, addressRegion: BUSINESS_ADDRESS.region, addressCountry: BUSINESS_ADDRESS.country },
  };
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: vongaProducts.slice(0, 30).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: `${SITE_URL}${product.image}`,
        category: product.category,
        offers: { "@type": "Offer", priceCurrency: "ZAR", price: product.price, availability: "https://schema.org/InStock" },
      },
    })),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(clothingStore) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
  </>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><StructuredData /></head><body>{children}</body></html>;
}
