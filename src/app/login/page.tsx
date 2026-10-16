import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginClient } from "@/components/auth/LoginClient";

export const metadata: Metadata = {
  title: "Iniciar Sesión | Nievas Academia Deportiva",
  description: "Ingreso al sistema de tatami, gestión de clases y asistencia de Nievas Academia Deportiva.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.rol === "ADMIN") {
      redirect("/admin/dashboard");
    } else {
      redirect("/profesor/clases");
    }
  }

  return <LoginClient />;
}
