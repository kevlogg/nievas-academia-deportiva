"use client";

import React, { useState } from "react";
import { KarateBelt } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { importarAlumnosCsvAction } from "@/lib/actions/alumnos.actions";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  Loader2,
  Sparkles,
} from "lucide-react";

interface ModalImportarAlumnosCsvProps {
  isOpen: boolean;
  onClose: () => void;
  onImportadoExitoso?: () => void;
}

interface ParsedAlumno {
  nombre: string;
  apellido: string;
  cinturonActual: KarateBelt;
  telefonoContacto: string;
  contactoEmergencia: string;
  fechaNacimiento: string;
}

const VALID_BELTS: KarateBelt[] = [
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Naranja",
  "Verde",
  "Azul",
  "Marrón",
  "Negro",
];

function normalizeBelt(raw?: string): KarateBelt {
  if (!raw) return "Blanco";
  const clean = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (clean.includes("blanco/amarillo") || clean.includes("blanco amarillo")) return "Blanco/Amarillo";
  if (clean.includes("amarillo")) return "Amarillo";
  if (clean.includes("naranja")) return "Naranja";
  if (clean.includes("verde")) return "Verde";
  if (clean.includes("azul")) return "Azul";
  if (clean.includes("marron")) return "Marrón";
  if (clean.includes("negro")) return "Negro";
  return "Blanco";
}

export function ModalImportarAlumnosCsv({
  isOpen,
  onClose,
  onImportadoExitoso,
}: ModalImportarAlumnosCsvProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedAlumnos, setParsedAlumnos] = useState<ParsedAlumno[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Descargar plantilla oficial CSV
  const handleDescargarPlantilla = () => {
    const csvContent =
      "Nombre,Apellido,Cinturon,Telefono,Contacto_Emergencia,Fecha_Nacimiento\n" +
      "Lucas,Fernandez,Blanco,1144556677,1122334455,2014-03-15\n" +
      "Sofia,Martinez,Amarillo,1166778899,1199887766,2015-08-22\n" +
      "Joaquin,Gomez,Verde,1133221100,Sin registrar,2012-11-05\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "plantilla_alumnos_nievas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvText = (text: string) => {
    setError(null);
    setSuccessMsg(null);

    // Quitar BOM si existe
    const cleanText = text.replace(/^\uFEFF/, "").trim();
    if (!cleanText) {
      setError("El archivo CSV está vacío");
      return;
    }

    const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setError("El archivo debe contener una fila de encabezados y al menos un alumno");
      return;
    }

    // Detectar delimitador (, o ;)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";

    // Encabezados normalizados
    const headers = firstLine
      .split(delimiter)
      .map((h) =>
        h
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .replace(/["']/g, "")
      );

    const colNombre = headers.findIndex((h) => h.includes("nombre") || h === "name" || h === "first name");
    const colApellido = headers.findIndex((h) => h.includes("apellido") || h === "last name" || h === "surname");
    const colCinto = headers.findIndex((h) => h.includes("cint") || h.includes("belt") || h === "cinto");
    const colTel = headers.findIndex((h) => h.includes("tel") || h.includes("cel") || h.includes("phone"));
    const colEmergencia = headers.findIndex((h) => h.includes("emerg") || h.includes("contacto_emergencia"));
    const colNacimiento = headers.findIndex((h) => h.includes("nacim") || h.includes("birth") || h.includes("fecha"));

    if (colNombre === -1 || colApellido === -1) {
      setError(
        "No se encontraron las columnas 'Nombre' y 'Apellido' en el archivo. Descarga la plantilla para ver el formato correcto."
      );
      return;
    }

    const rows: ParsedAlumno[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      const nombre = parts[colNombre] || "";
      const apellido = parts[colApellido] || "";

      if (!nombre || !apellido) continue;

      const rawCinto = colCinto !== -1 ? parts[colCinto] : "Blanco";
      const telefono = colTel !== -1 && parts[colTel] ? parts[colTel] : "Sin registrar";
      const emergencia = colEmergencia !== -1 && parts[colEmergencia] ? parts[colEmergencia] : "Sin registrar";
      const nacimiento = colNacimiento !== -1 && parts[colNacimiento] ? parts[colNacimiento] : "2015-01-01";

      rows.push({
        nombre,
        apellido,
        cinturonActual: normalizeBelt(rawCinto),
        telefonoContacto: telefono,
        contactoEmergencia: emergencia,
        fechaNacimiento: nacimiento,
      });
    }

    if (rows.length === 0) {
      setError("No se pudieron extraer alumnos válidos. Revisa que las filas tengan nombre y apellido.");
      return;
    }

    setParsedAlumnos(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCsvText(content);
    };
    reader.onerror = () => {
      setError("Error al leer el archivo");
    };
    reader.readAsText(selected, "UTF-8");
  };

  const handleImportar = async () => {
    if (parsedAlumnos.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await importarAlumnosCsvAction(parsedAlumnos);
      if (res.success) {
        setSuccessMsg(res.message || "¡Alumnos importados con éxito!");
        setParsedAlumnos([]);
        setFile(null);
        if (onImportadoExitoso) {
          onImportadoExitoso();
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(res.error || "Error al importar alumnos");
      }
    } catch {
      setError("Error de conexión al importar alumnos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/60 overflow-hidden">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-[#0A2E65] border-b border-[#1E57A8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-[#0F3E86] shadow-sm">
              <FileSpreadsheet className="w-5 h-5 text-[#0F3E86]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Carga Masiva de Alumnos (CSV)
              </h2>
              <p className="text-xs text-cyan-200 font-medium">
                Importa todos los alumnos de la academia directo a la base de datos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Paso 1: Descargar plantilla */}
          <div className="p-3.5 bg-[#092652] rounded-2xl border border-[#2056A8] flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-cyan-200 block">
                1. ¿Necesitas el formato oficial?
              </span>
              <span className="text-[11px] text-blue-200">
                Descarga la plantilla con columnas: Nombre, Apellido, Cinturón, Teléfono.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDescargarPlantilla}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>

          {/* Paso 2: Subir archivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-blue-100 uppercase tracking-wider block">
              2. Selecciona tu archivo CSV de Alumnos
            </label>
            <label className="border-2 border-dashed border-[#2056A8] hover:border-cyan-300 bg-[#0A2E65]/50 hover:bg-[#0A2E65] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
              <Upload className="w-8 h-8 text-cyan-300 animate-pulse" />
              <div className="text-center">
                <span className="text-xs font-black text-white block">
                  {file ? file.name : "Haz clic aquí para seleccionar el archivo CSV"}
                </span>
                <span className="text-[11px] text-blue-200">
                  Formato .csv (separado por comas o punto y coma)
                </span>
              </div>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Paso 3: Previsualización de Alumnos Detectados */}
          {parsedAlumnos.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#1E57A8]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-300" />
                  <span>3. Previsualización ({parsedAlumnos.length} Alumnos Detectados)</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-500/50 px-2 py-0.5 rounded-md">
                  Listos para guardar
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-[#2056A8] bg-[#071F42]/80 divide-y divide-[#1E57A8]">
                {parsedAlumnos.slice(0, 50).map((alumno, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-white/5 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-mono text-blue-300 w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-bold text-white truncate">
                        {alumno.nombre} {alumno.apellido}
                      </span>
                      <BeltBadge belt={alumno.cinturonActual} size="sm" />
                    </div>

                    <div className="text-[11px] text-blue-200 shrink-0 flex items-center gap-2">
                      <span className="hidden sm:inline">Tel: {alumno.telefonoContacto}</span>
                    </div>
                  </div>
                ))}
                {parsedAlumnos.length > 50 && (
                  <div className="p-2 text-center text-xs text-blue-300 italic">
                    ... y {parsedAlumnos.length - 50} alumnos más
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botones Pie */}
        <div className="p-4 bg-[#0A2E65] border-t border-[#1E57A8] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-200 hover:text-white hover:bg-white/10 border border-white/20 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleImportar}
            disabled={loading || parsedAlumnos.length === 0}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-blue-50 text-[#0F3E86] shadow-md flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0F3E86]" />
                <span>Guardando en Base de Datos...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#0F3E86]" />
                <span>
                  Confirmar e Importar {parsedAlumnos.length > 0 ? `(${parsedAlumnos.length})` : ""}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
