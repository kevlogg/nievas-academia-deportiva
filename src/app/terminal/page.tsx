import React from "react";
import { getTerminalProfesoresAction } from "@/lib/actions/terminal.actions";
import { TerminalKioskClient } from "@/components/terminal/TerminalKioskClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Modo Terminal Tablet | Nievas Academia Deportiva",
  description: "Ingreso rápido por PIN y biometría para Senseis en la tablet de sede central",
};

export default async function TerminalPage() {
  const result = await getTerminalProfesoresAction();

  return (
    <TerminalKioskClient initialProfesores={result.profesores || []} />
  );
}
