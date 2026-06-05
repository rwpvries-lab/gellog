import type { Metadata } from "next";
import { SalonPageClient } from "./SalonPageClient";

// Salon pages show the owner's own description and flavour names. On iOS,
// WKWebView/Safari offer to auto-translate page content, which distorts that
// original wording — opt the whole salon route out of translation.
export const metadata: Metadata = {
  other: { google: "notranslate" },
};

export default async function SalonPage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id } = await params;
  return <SalonPageClient placeId={place_id} />;
}
