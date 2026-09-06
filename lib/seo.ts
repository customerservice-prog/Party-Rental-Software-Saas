export const SITE_NAME = "RentalOS";

export const SITE_TAGLINE =
    "Party & event rental software for online booking, inventory, delivery, and payments.";

export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://party-rental-software-saas-production.up.railway.app";

type PageMetaInput = {
    title: string;
    description: string;
    path: string;
    noIndex?: boolean;
};

// Central helper so every marketing route produces a consistent, complete
// metadata object (title, description, canonical, Open Graph, Twitter card,
// robots) instead of every page re-inventing this by hand.
export function pageMetadata({
    title,
    description,
    path,
    noIndex = false,
}: PageMetaInput) {
    const url = SITE_URL + path;

  return {
        title,
        description,
        alternates: { canonical: url },
        robots: noIndex
          ? { index: false, follow: false }
                : { index: true, follow: true },
        openGraph: {
                title,
                description,
                url,
                siteName: SITE_NAME,
                type: "website" as const,
        },
        twitter: {
                card: "summary_large_image" as const,
                title,
                description,
        },
  };
}
