import { redirect } from "next/navigation";

export default async function LogAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") {
      q.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        q.append(key, v);
      }
    }
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/icecream/logs/new${suffix}`);
}
