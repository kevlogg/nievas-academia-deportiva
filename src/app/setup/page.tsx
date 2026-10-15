import React from "react";
import { SetupWizardClient } from "@/components/setup/SetupWizardClient";

export const metadata = {
  title: "Configuración Inicial de Base de Datos | Nievas Academia Deportiva",
  description: "Asistente de conexión a Supabase y configuración de la cuenta maestra de Dirección.",
};

export default function SetupPage() {
  return (
    <div className="py-6 px-3 sm:px-6">
      <SetupWizardClient />
    </div>
  );
}
