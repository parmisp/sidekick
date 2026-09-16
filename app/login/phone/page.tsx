import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PhoneForm } from "./PhoneForm";

export default async function PhonePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.phone) redirect(user.profile_complete ? "/discover" : "/setup");
  return <PhoneForm />;
}
