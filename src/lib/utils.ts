import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]} hs`;
  }
  return timeStr;
}

export function getDayName(dayIndex: number): string {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return days[dayIndex] || "";
}

export function formatDaysList(days: number[]): string {
  const map: Record<number, string> = {
    0: "Dom",
    1: "Lun",
    2: "Mar",
    3: "Mié",
    4: "Jue",
    5: "Vie",
    6: "Sáb",
  };
  return days.map((d) => map[d] || "").join(" - ");
}

export function getArgentinaDateTime(): {
  fecha: string;
  hora: string;
  horaCorta: string;
  horaInicioInput: string;
  horaFinInput: string;
  horaInicioDefecto: string;
  horaFinDefecto: string;
} {
  const now = new Date();
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const horaCorta = hora.substring(0, 5);
  const [hh, mm] = hora.split(":").map(Number);
  const endH = (hh + 1) % 24;
  const endM = (mm + 15) % 60;
  const endHAdjusted = mm + 15 >= 60 ? (endH + 1) % 24 : endH;

  const horaInicioInput = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  const horaFinInput = `${String(endHAdjusted).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  return {
    fecha,
    hora,
    horaCorta,
    horaInicioInput,
    horaFinInput,
    horaInicioDefecto: `${horaInicioInput}:00`,
    horaFinDefecto: `${horaFinInput}:00`,
  };
}
