import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.phone) redirect("/login/phone");
  if (!user.profile_complete) redirect("/setup");
  redirect("/discover");
}
