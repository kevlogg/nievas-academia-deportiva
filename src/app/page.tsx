import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user.rol === "ADMIN") {
    redirect("/admin/dashboard");
  } else {
    redirect("/profesor/clases");
  }
}
