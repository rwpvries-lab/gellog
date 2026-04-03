import { LogDetailClient } from "./LogDetailClient";

type Params = { id: string };

export default async function LogDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return <LogDetailClient logId={id} />;
}
