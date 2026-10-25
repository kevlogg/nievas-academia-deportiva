"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Alumno,
  KarateBelt,
  SUBCATEGORIAS_POR_CINTURON,
  CINTURON_POR_SUBCATEGORIA,
  ESCALAFON_KARATE,
  getGradoRank,
  getMaxRankForBelt,
} from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { registrarGraduacionAction } from "@/lib/actions/alumnos.actions";
import { Award, X, Loader2, AlertCircle, ArrowRight, Lock, CheckCircle2 } from "lucide-react";

interface ModalGraduacionProps {
  alumno: Alumno | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nuevoCinturon: KarateBelt, nuevaSubcategoria?: string | null) => void;
}

const BELTS: KarateBelt[] = [
  "Blanco",
  "Amarillo",
  "Naranja",
  "Verde",
  "Violeta",
  "Marrón",
  "Negro",
];

export function ModalGraduacion({
  alumno,
  isOpen,
  onClose,
  onSuccess,
}: ModalGraduacionProps) {
  const [nuevoCinturon, setNuevoCinturon] = useState<KarateBelt>("Blanco");
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState<string>("");
  const [fechaGraduacion, setFechaGraduacion] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observaciones, setObservaciones] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Rango actual del alumno (0 a 19)
  const currentStudentRank = alumno
    ? getGradoRank(alumno.cinturon_actual, alumno.subcategoria_actual)
    : 0;

  // Inicializar sugiriendo el siguiente grado o el actual si es el máximo
  useEffect(() => {
    if (alumno) {
      const cinto = (alumno.cinturon_actual === "Azul" ? "Violeta" : alumno.cinturon_actual) as KarateBelt;
      const currentRank = getGradoRank(cinto, alumno.subcategoria_actual);

      // Buscar el siguiente grado en el escalafón canónico (si existe)
      const nextGrad = ESCALAFON_KARATE.find((g) => g.rank === currentRank + 1);

      if (nextGrad) {
        setNuevoCinturon(nextGrad.cinturon);
        setNuevaSubcategoria(nextGrad.subcategoria);
      } else {
        // Si ya está en el último grado (Negro 3 dan) o no se encuentra siguiente
        setNuevoCinturon(cinto);
        const subcats = SUBCATEGORIAS_POR_CINTURON[cinto] || [];
        setNuevaSubcategoria(alumno.subcategoria_actual || subcats[0] || "");
      }

      setFechaGraduacion(new Date().toISOString().split("T")[0]);
      setObservaciones("");
      setError(null);
    }
  }, [alumno]);

  if (!isOpen || !alumno) return null;

  // Subcategorías válidas para el cinturón seleccionado
  const subcategoriasDisponibles = SUBCATEGORIAS_POR_CINTURON[nuevoCinturon] || [];

  const handleBeltChange = (belt: KarateBelt) => {
    setNuevoCinturon(belt);
    const subcats = SUBCATEGORIAS_POR_CINTURON[belt] || [];

    // Encontrar la primera subcategoría del nuevo cinturón que no sea inferior al rango actual
    const validSubcat = subcats.find(
      (s) => getGradoRank(belt, s) >= currentStudentRank
    ) || subcats[0] || "";

    setNuevaSubcategoria(validSubcat);
  };

  const handleSubcategoriaChange = (subcat: string) => {
    setNuevaSubcategoria(subcat);
    // Garantizar correspondencia estricta: auto-asignar el color que le corresponde
    const beltCorrespondiente = CINTURON_POR_SUBCATEGORIA[subcat];
    if (beltCorrespondiente && beltCorrespondiente !== nuevoCinturon) {
      setNuevoCinturon(beltCorrespondiente);
    }
  };

  const selectedRank = getGradoRank(nuevoCinturon, nuevaSubcategoria);
  const isRetroceso = selectedRank < currentStudentRank;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación estricta de no-retroceso
    if (isRetroceso) {
      setError(
        `Regla estricta: No se permite descender a una categoría o cinturón inferior a la actual (${alumno.cinturon_actual} ${alumno.subcategoria_actual || ""}).`
      );
      return;
    }

    // Validación estricta de coherencia color-categoría
    if (nuevaSubcategoria && !subcategoriasDisponibles.includes(nuevaSubcategoria)) {
      setError(`La categoría "${nuevaSubcategoria}" no corresponde al cinturón ${nuevoCinturon}.`);
      return;
    }

    startTransition(async () => {
      const res = await registrarGraduacionAction({
        alumnoId: alumno.id,
        nuevoCinturon,
        subcategoria: nuevaSubcategoria || null,
        fechaGraduacion,
        observaciones,
      });

      if (res.success) {
        onSuccess(nuevoCinturon, nuevaSubcategoria || null);
        onClose();
      } else {
        setError(res.error || "Error al registrar la graduación");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl p-5 sm:p-6 shadow-2xl shadow-blue-950/60 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E57A8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-white text-amber-500 shadow-sm shrink-0">
              <Award className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Pase Oficial y Graduación
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                Ascenso de cinturón o avance de subcategoría en dojo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Resumen del Alumno */}
        <div className="p-3.5 bg-[#0A2E65] rounded-2xl border border-[#2056A8] flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-blue-200 font-medium">Alumno:</p>
            <p className="font-bold text-sm text-white">
              {alumno.nombre} {alumno.apellido}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-blue-200 mb-1 font-medium">Grado Actual:</p>
            <BeltBadge
              belt={alumno.cinturon_actual}
              subcategoria={alumno.subcategoria_actual}
              size="sm"
            />
          </div>
        </div>

        {/* Formulario de Pase */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Regla de No Retroceso Informativo */}
          <div className="p-2.5 bg-blue-950/60 border border-blue-400/40 rounded-xl flex items-center gap-2 text-[11px] text-blue-200">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">Regla de no-retroceso:</strong> Los cinturones y subcategorías inferiores a{" "}
              <strong className="text-cyan-300">
                {alumno.cinturon_actual} {alumno.subcategoria_actual || ""}
              </strong>{" "}
              permanecen bloqueados. Solo se permite avanzar o cambiar a categoría superior.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Color de Cinturón */}
            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">
                Color de Cinturón *
              </label>
              <select
                value={nuevoCinturon}
                onChange={(e) => handleBeltChange(e.target.value as KarateBelt)}
                className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs sm:text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
              >
                {BELTS.map((b) => {
                  const maxRank = getMaxRankForBelt(b);
                  const isBeltBlocked = maxRank < currentStudentRank;
                  return (
                    <option
                      key={b}
                      value={b}
                      disabled={isBeltBlocked}
                      className={
                        isBeltBlocked
                          ? "bg-[#05162e] text-slate-500 italic"
                          : "bg-[#082552] text-white font-semibold"
                      }
                    >
                      {isBeltBlocked ? `🔒 ${b} (Inferior)` : b}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Subcategoría (Kyus / Danes correspondientes al color) */}
            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">
                Subcategoría ({nuevoCinturon}) *
              </label>
              <select
                value={nuevaSubcategoria}
                onChange={(e) => handleSubcategoriaChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs sm:text-sm text-cyan-300 font-bold focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
              >
                {subcategoriasDisponibles.map((subcat) => {
                  const subRank = getGradoRank(nuevoCinturon, subcat);
                  const isSubBlocked = subRank < currentStudentRank;
                  const isCurrent = subRank === currentStudentRank;

                  return (
                    <option
                      key={subcat}
                      value={subcat}
                      disabled={isSubBlocked}
                      className={
                        isSubBlocked
                          ? "bg-[#05162e] text-slate-500 italic"
                          : isCurrent
                          ? "bg-[#082552] text-amber-300 font-bold"
                          : "bg-[#082552] text-cyan-300 font-bold"
                      }
                    >
                      {isSubBlocked
                        ? `🔒 ${subcat} (Grado anterior)`
                        : isCurrent
                        ? `● ${subcat} (Grado actual)`
                        : `▲ ${subcat} (Ascenso)`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Comparación Visual del Ascenso */}
          <div className="p-3 bg-[#082552] rounded-xl border border-blue-400/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-blue-300 font-medium">De:</span>
              <BeltBadge
                belt={alumno.cinturon_actual}
                subcategoria={alumno.subcategoria_actual}
                size="sm"
              />
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-300 shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-blue-300 font-medium">A:</span>
              <BeltBadge
                belt={nuevoCinturon}
                subcategoria={nuevaSubcategoria}
                size="sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Fecha de Graduación / Examen *
            </label>
            <input
              type="date"
              required
              value={fechaGraduacion}
              onChange={(e) => setFechaGraduacion(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-1">
              Observaciones / Kata evaluado
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Demostró excelente kihon y kata ante tribunal de la Academia..."
              className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="pt-2 border-t border-[#1E57A8] flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-xs rounded-xl border border-white/20 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || isRetroceso}
              className={`flex-1 py-2.5 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isRetroceso
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600"
                  : "bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 disabled:opacity-50"
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : isRetroceso ? (
                <>
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Grado Inferior Bloqueado</span>
                </>
              ) : (
                <span>Confirmar Pase Oficial</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
