import { SalonPageClient } from "./SalonPageClient";

export default async function SalonPage({
  params,
}: {
  params: Promise<{ place_id: string }>;
}) {
  const { place_id } = await params;
  return <SalonPageClient placeId={place_id} />;
}
