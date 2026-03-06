import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { HomeLanding } from "./components/HomeLanding";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/feed");
  }

  return <HomeLanding />;
}
