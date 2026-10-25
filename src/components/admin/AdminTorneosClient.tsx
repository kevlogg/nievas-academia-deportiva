"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  Medal,
  Calendar,
  MapPin,
  Plus,
  Search,
  Trash2,
  Edit2,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Award,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Torneo, Alumno, TipoMedalla, Usuario, KarateBelt } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  crearTorneoAction,
  actualizarTorneoAction,
  eliminarTorneoAction,
} from "@/lib/actions/torneos.actions";

interface AdminTorneosClientProps {
  currentUser: Usuario;
  initialTorneos: Torneo[];
  alumnos: Alumno[];
}

interface CompetidorDraft {
  alumno_id: string;
  alumno_nombre: string;
  alumno_cinturon: KarateBelt;
  alumno_subcategoria?: string | null;
  categoria: string;
  puesto_premio: string;
  medalla: TipoMedalla;
  notas: string;
}

export function AdminTorneosClient({
  currentUser,
  initialTorneos,
  alumnos,
}: AdminTorneosClientProps) {
  const [torneos, setTorneos] = useState<Torneo[]>(initialTorneos);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTorneos, setExpandedTorneos] = useState<Record<string, boolean>>({});

  // Estados de Modal Formulario (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTorneoId, setEditingTorneoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [competidores, setCompetidores] = useState<CompetidorDraft[]>([]);

  // Búsqueda de alumnos en el modal
  const [alumnoSearch, setAlumnoSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal confirmación eliminar
  const [deletingTorneoId, setDeletingTorneoId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle expandir tarjeta
  const toggleExpand = (id: string) => {
    setExpandedTorneos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Abrir modal para crear
  const handleOpenCrear = () => {
    setEditingTorneoId(null);
    setNombre("");
    setFecha(new Date().toISOString().split("T")[0]);
    setLugar("");
    setDescripcion("");
    setCompetidores([]);
    setAlumnoSearch("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditar = (torneo: Torneo) => {
    setEditingTorneoId(torneo.id);
    setNombre(torneo.nombre);
    setFecha(torneo.fecha);
    setLugar(torneo.lugar || "");
    setDescripcion(torneo.descripcion || "");
    setCompetidores(
      torneo.participaciones.map((p) => {
        const al = alumnos.find((a) => a.id === p.alumno_id);
        return {
          alumno_id: p.alumno_id,
          alumno_nombre: p.alumno_nombre || (al ? `${al.nombre} ${al.apellido}` : "Alumno"),
          alumno_cinturon: (p.alumno_cinturon || al?.cinturon_actual || "Blanco") as KarateBelt,
          alumno_subcategoria: p.alumno_subcategoria || al?.subcategoria_actual,
          categoria: p.categoria || "General",
          puesto_premio: p.puesto_premio,
          medalla: p.medalla || "OTRO",
          notas: p.notas || "",
        };
      })
    );
    setAlumnoSearch("");
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  // Agregar alumno a competidores
  const handleAddAlumno = (alumno: Alumno) => {
    if (competidores.some((c) => c.alumno_id === alumno.id)) {
      return;
    }
    const nuevo: CompetidorDraft = {
      alumno_id: alumno.id,
      alumno_nombre: `${alumno.nombre} ${alumno.apellido}`,
      alumno_cinturon: alumno.cinturon_actual,
      alumno_subcategoria: alumno.subcategoria_actual,
      categoria: "Kumite",
      puesto_premio: "1° Puesto (Oro)",
      medalla: "ORO",
      notas: "",
    };
    setCompetidores((prev) => [...prev, nuevo]);
    setAlumnoSearch("");
  };

  // Quitar alumno de competidores
  const handleRemoveAlumno = (alumnoId: string) => {
    setCompetidores((prev) => prev.filter((c) => c.alumno_id !== alumnoId));
  };

  // Modificar campo de un competidor
  const handleUpdateCompetidor = (
    alumnoId: string,
    field: keyof CompetidorDraft,
    value: any
  ) => {
    setCompetidores((prev) =>
      prev.map((c) => {
        if (c.alumno_id !== alumnoId) return c;
        const updated = { ...c, [field]: value };

        // Si cambia la medalla rápida, autocompletar puesto sugerido
        if (field === "medalla") {
          if (value === "ORO") updated.puesto_premio = "1° Puesto (Oro)";
          else if (value === "PLATA") updated.puesto_premio = "2° Puesto (Plata)";
          else if (value === "BRONCE") updated.puesto_premio = "3° Puesto (Bronce)";
          else if (value === "PARTICIPACION") updated.puesto_premio = "Participación / Diploma";
        }

        return updated;
      })
    );
  };

  // Guardar torneo
  const handleSubmitTorneo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre del torneo es obligatorio.");
      return;
    }
    if (!fecha) {
      setErrorMsg("Debe especificar la fecha del torneo.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const payload = {
      nombre: nombre.trim(),
      fecha,
      lugar: lugar.trim() || null,
      descripcion: descripcion.trim() || null,
      participaciones: competidores.map((c) => ({
        alumno_id: c.alumno_id,
        categoria: c.categoria.trim() || "General",
        puesto_premio: c.puesto_premio.trim() || "Participación",
        medalla: c.medalla,
        notas: c.notas.trim() || null,
      })),
    };

    if (editingTorneoId) {
      const res = await actualizarTorneoAction(editingTorneoId, payload);
      setIsSaving(false);
      if (res.success) {
        setTorneos((prev) =>
          prev.map((t) => (t.id === editingTorneoId ? res.data : t))
        );
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.error || "No se pudo actualizar el torneo.");
      }
    } else {
      const res = await crearTorneoAction(payload);
      setIsSaving(false);
      if (res.success) {
        setTorneos((prev) => [res.data, ...prev]);
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.error || "No se pudo crear el torneo.");
      }
    }
  };

  // Eliminar torneo
  const handleConfirmDelete = async () => {
    if (!deletingTorneoId) return;
    setIsDeleting(true);
    const res = await eliminarTorneoAction(deletingTorneoId);
    setIsDeleting(false);
    if (res.success) {
      setTorneos((prev) => prev.filter((t) => t.id !== deletingTorneoId));
      setDeletingTorneoId(null);
    } else {
      alert(res.error || "Error al eliminar el torneo.");
    }
  };

  // Filtro de alumnos candidatos a competir (no repetidos)
  const candidatosAlumnos = useMemo(() => {
    const q = alumnoSearch.toLowerCase().trim();
    return alumnos
      .filter((a) => {
        if (competidores.some((c) => c.alumno_id === a.id)) return false;
        if (!q) return true;
        const full = `${a.nombre} ${a.apellido}`.toLowerCase();
        return (
          full.includes(q) ||
          a.cinturon_actual.toLowerCase().includes(q) ||
          (a.subcategoria_actual && a.subcategoria_actual.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [alumnos, competidores, alumnoSearch]);

  // Torneos filtrados
  const torneosFiltrados = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return torneos;
    return torneos.filter(
      (t) =>
        t.nombre.toLowerCase().includes(q) ||
        (t.lugar && t.lugar.toLowerCase().includes(q)) ||
        t.fecha.includes(q) ||
        t.participaciones.some((p) => (p.alumno_nombre || "").toLowerCase().includes(q))
    );
  }, [torneos, searchQuery]);

  // Estadísticas globales de torneos
  const stats = useMemo(() => {
    const totalTorneos = torneos.length;
    const alumnosCompitieronIds = new Set<string>();
    let totalOros = 0;
    let totalPlatas = 0;
    let totalBronces = 0;
    let totalParticipaciones = 0;

    for (const t of torneos) {
      for (const p of t.participaciones) {
        alumnosCompitieronIds.add(p.alumno_id);
        totalParticipaciones++;
        if (p.medalla === "ORO" || p.puesto_premio.toLowerCase().includes("1")) totalOros++;
        else if (p.medalla === "PLATA" || p.puesto_premio.toLowerCase().includes("2")) totalPlatas++;
        else if (p.medalla === "BRONCE" || p.puesto_premio.toLowerCase().includes("3")) totalBronces++;
      }
    }

    return {
      totalTorneos,
      totalCompetidores: alumnosCompitieronIds.size,
      totalParticipaciones,
      totalOros,
      totalPlatas,
      totalBronces,
    };
  }, [torneos]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-1.5 text-xs text-[#0F3E86] hover:text-blue-900 font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#0F3E86]" />
          <span>Volver a Dirección</span>
        </Link>

        <span className="text-xs font-bold text-[#0F3E86] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Módulo de Torneos
        </span>
      </div>

      {/* 1. Header Banner Oficial Nievas */}
      <div className="p-4 sm:p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-blue-950/15">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white border border-white shadow-xs shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Logo Nievas"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                Torneos & Competición
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-xs text-blue-200 font-medium">
              Historial de competencias, delegaciones de alumnos y premiaciones del dojo
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCrear}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Torneo</span>
        </button>
      </div>

      {/* 2. Cards de Métricas de Torneo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Card 1: Total Torneos */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl p-4 shadow-lg shadow-blue-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Torneos
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {stats.totalTorneos}
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Eventos registrados
            </p>
          </div>
        </div>

        {/* Card 2: Alumnos Competidores */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl p-4 shadow-lg shadow-blue-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Competidores
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-cyan-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-cyan-300 tracking-tight">
              {stats.totalCompetidores}
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Alumnos que compitieron
            </p>
          </div>
        </div>

        {/* Card 3: Participaciones Totales */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl p-4 shadow-lg shadow-blue-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
              Inscripciones
            </span>
            <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-emerald-300 tracking-tight">
              {stats.totalParticipaciones}
            </span>
            <p className="text-[11px] text-blue-200 mt-0.5 font-medium">
              Participaciones acumuladas
            </p>
          </div>
        </div>

        {/* Card 4: Medallero */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl p-4 shadow-lg shadow-blue-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              Medallero
            </span>
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
              <Medal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1" title="Medallas de Oro">
              <span className="text-xl font-black text-amber-300">🥇 {stats.totalOros}</span>
            </div>
            <div className="flex items-center gap-1" title="Medallas de Plata">
              <span className="text-xl font-black text-slate-200">🥈 {stats.totalPlatas}</span>
            </div>
            <div className="flex items-center gap-1" title="Medallas de Bronce">
              <span className="text-xl font-black text-amber-500">🥉 {stats.totalBronces}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Buscador */}
      <div className="p-3 bg-[#0F3E86] border-2 border-[#1E57A8] rounded-2xl shadow-md flex items-center gap-2">
        <Search className="w-4 h-4 text-cyan-300 ml-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar torneo por nombre, lugar, fecha o competidor..."
          className="w-full bg-transparent text-xs text-white placeholder-blue-300 focus:outline-none font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-blue-300 hover:text-white p-1 text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Listado de Torneos */}
      <div className="space-y-4">
        {torneosFiltrados.length === 0 ? (
          <div className="p-10 text-center bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-lg">
            <Trophy className="w-10 h-10 text-amber-300 mx-auto mb-2 opacity-60" />
            <h3 className="text-base font-bold">No se encontraron torneos</h3>
            <p className="text-xs text-blue-200 mt-1 max-w-md mx-auto">
              {searchQuery
                ? "No hay resultados para la búsqueda ingresada."
                : "Todavía no registraste ningún torneo. Hacé clic en 'Crear Torneo' para sumar el primero con sus competidores y premios."}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCrear}
                className="mt-4 px-4 py-2 bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer hover:bg-amber-300"
              >
                + Crear Primer Torneo
              </button>
            )}
          </div>
        ) : (
          torneosFiltrados.map((torneo) => {
            const isExpanded = !!expandedTorneos[torneo.id];
            const partCount = torneo.participaciones.length;

            return (
              <div
                key={torneo.id}
                className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 overflow-hidden transition-all"
              >
                {/* Cabecera del Torneo */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        <Trophy className="w-4 h-4" />
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                        {torneo.nombre}
                      </h2>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-blue-200 flex-wrap">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-cyan-300" />
                        <span>{torneo.fecha}</span>
                      </div>
                      {torneo.lugar && (
                        <div className="flex items-center gap-1.5 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-rose-300" />
                          <span>{torneo.lugar}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                        <Users className="w-3.5 h-3.5" />
                        <span>{partCount} {partCount === 1 ? "alumno compitió" : "alumnos compitieron"}</span>
                      </div>
                    </div>

                    {torneo.descripcion && (
                      <p className="text-xs text-blue-100 font-medium italic pt-1">
                        &ldquo;{torneo.descripcion}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenEditar(torneo)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Editar Torneo"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setDeletingTorneoId(torneo.id)}
                      className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Eliminar Torneo"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                    </button>
                    <button
                      onClick={() => toggleExpand(torneo.id)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "Ocultar" : "Ver Delegación"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Delegación de Competidores Desplegable */}
                {isExpanded && (
                  <div className="border-t border-white/15 bg-[#0A2E65] p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        Competidores y Resultados del Dojo ({partCount})
                      </span>
                      <button
                        onClick={() => handleOpenEditar(torneo)}
                        className="text-[11px] text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                      >
                        + Agregar / Modificar Alumnos
                      </button>
                    </div>

                    {torneo.participaciones.length === 0 ? (
                      <p className="text-xs text-blue-300 italic py-2">
                        No hay alumnos cargados en este torneo aún. Hacé clic en &quot;Editar&quot; para sumar los competidores y sus premios.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {torneo.participaciones.map((part) => {
                          const isOro = part.medalla === "ORO" || part.puesto_premio.toLowerCase().includes("1");
                          const isPlata = part.medalla === "PLATA" || part.puesto_premio.toLowerCase().includes("2");
                          const isBronce = part.medalla === "BRONCE" || part.puesto_premio.toLowerCase().includes("3");

                          return (
                            <div
                              key={part.id}
                              className="p-3.5 rounded-xl bg-white/5 border border-white/15 flex items-center justify-between gap-3 hover:bg-white/10 transition-colors"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-sm truncate">
                                    {part.alumno_nombre || "Alumno"}
                                  </span>
                                  {part.alumno_cinturon && (
                                    <BeltBadge belt={part.alumno_cinturon} size="sm" />
                                  )}
                                  {part.alumno_subcategoria && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 border border-white/15">
                                      {part.alumno_subcategoria}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-blue-200">
                                  Categoría: <strong className="text-white">{part.categoria || "General"}</strong>
                                  {part.notas && ` • ${part.notas}`}
                                </p>
                              </div>

                              {/* Badge de Puesto / Medalla */}
                              <div
                                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border flex items-center gap-1.5 ${
                                  isOro
                                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                                    : isPlata
                                    ? "bg-slate-200 text-slate-900 border-slate-300 shadow-md"
                                    : isBronce
                                    ? "bg-amber-800 text-amber-100 border-amber-700"
                                    : "bg-blue-600/40 text-blue-100 border-blue-400/40"
                                }`}
                              >
                                <span>{isOro ? "🥇" : isPlata ? "🥈" : isBronce ? "🥉" : "🎖️"}</span>
                                <span>{part.puesto_premio}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. MODAL FORMULARIO DE TORNEO (CREAR / EDITAR) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/15 flex items-center justify-between bg-[#0A2E65]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {editingTorneoId ? "Editar Torneo" : "Registrar Nuevo Torneo"}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Cargá los datos del torneo, competidores de Nievas Academia y sus puestos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitTorneo} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-500/20 border border-rose-400/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Datos Básicos del Torneo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-blue-100">
                    Nombre del Torneo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Torneo Nacional Clausura 2026, Copa Sensei Nievas..."
                    className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-100">
                    Fecha del Torneo *
                  </label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-100">
                    Lugar / Sede (opcional)
                  </label>
                  <input
                    type="text"
                    value={lugar}
                    onChange={(e) => setLugar(e.target.value)}
                    placeholder="Ej: Club Central, Polideportivo Municipal..."
                    className="w-full px-3.5 py-2.5 bg-[#0A2E65] border border-[#2056A8] focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-blue-100">
                    Descripción / Observaciones (opcional)
                  </label>
                  <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: Clasificatorio para el Sudamericano, excelente desempeño del equipo..."
                    className="w-full px-3.5 py-2 bg-[#0A2E65] border border-[#2056A8] focus:border-amber-400 rounded-xl text-white text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* SECCIÓN COMPETIDORES */}
              <div className="pt-3 border-t border-white/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider">
                      Delegación de Alumnos Competidores ({competidores.length})
                    </h4>
                    <p className="text-[11px] text-blue-200">
                      Buscá y seleccioná a los alumnos de la academia que participaron
                    </p>
                  </div>
                </div>

                {/* Buscador de alumnos para sumar */}
                <div className="relative">
                  <div className="flex items-center gap-2 p-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl">
                    <Search className="w-4 h-4 text-cyan-300 ml-1.5 shrink-0" />
                    <input
                      type="text"
                      value={alumnoSearch}
                      onChange={(e) => setAlumnoSearch(e.target.value)}
                      placeholder="Escribí el nombre del alumno para sumarlo a la lista..."
                      className="w-full bg-transparent text-xs text-white placeholder-blue-300 focus:outline-none font-medium"
                    />
                    {alumnoSearch && (
                      <button
                        type="button"
                        onClick={() => setAlumnoSearch("")}
                        className="text-blue-300 hover:text-white p-1 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sugerencias desplegables de alumnos */}
                  {alumnoSearch && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[#0A2E65] border-2 border-[#1E57A8] rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-white/10">
                      {candidatosAlumnos.length === 0 ? (
                        <p className="p-3 text-xs text-blue-300 text-center">
                          No se encontraron alumnos con ese nombre
                        </p>
                      ) : (
                        candidatosAlumnos.map((al) => (
                          <button
                            key={al.id}
                            type="button"
                            onClick={() => handleAddAlumno(al)}
                            className="w-full p-2.5 text-left hover:bg-white/10 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">
                                {al.nombre} {al.apellido}
                              </span>
                              <BeltBadge belt={al.cinturon_actual} size="sm" />
                              {al.subcategoria_actual && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-cyan-200">
                                  {al.subcategoria_actual}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-amber-300">+ Sumar</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de competidores ya agregados */}
                {competidores.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                    <Users className="w-8 h-8 text-blue-300 mx-auto mb-1.5 opacity-50" />
                    <p className="text-xs text-blue-200 font-medium">
                      Todavía no agregaste ningún competidor a este torneo.
                    </p>
                    <p className="text-[11px] text-blue-300">
                      Usá el buscador de arriba para elegir los alumnos que compitieron.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {competidores.map((comp) => (
                      <div
                        key={comp.alumno_id}
                        className="p-3.5 bg-white/5 border border-white/20 rounded-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs">
                              {comp.alumno_nombre}
                            </span>
                            <BeltBadge belt={comp.alumno_cinturon} size="sm" />
                            {comp.alumno_subcategoria && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-cyan-200">
                                {comp.alumno_subcategoria}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAlumno(comp.alumno_id)}
                            className="text-rose-300 hover:text-rose-100 p-1 text-xs font-bold transition-colors cursor-pointer"
                            title="Quitar competidor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Campos de Categoría, Puesto y Medalla */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Categoría */}
                          <div>
                            <label className="text-[10px] font-bold text-blue-200 block mb-1">
                              Categoría / Modalidad:
                            </label>
                            <input
                              type="text"
                              value={comp.categoria}
                              onChange={(e) =>
                                handleUpdateCompetidor(comp.alumno_id, "categoria", e.target.value)
                              }
                              placeholder="Ej: Kumite Juvenil, Kata..."
                              className="w-full px-2.5 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-lg text-white text-xs font-semibold focus:outline-none"
                            />
                          </div>

                          {/* Medalla rápida */}
                          <div>
                            <label className="text-[10px] font-bold text-blue-200 block mb-1">
                              Medalla / Premio:
                            </label>
                            <select
                              value={comp.medalla}
                              onChange={(e) =>
                                handleUpdateCompetidor(comp.alumno_id, "medalla", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-lg text-white text-xs font-bold focus:outline-none"
                            >
                              <option value="ORO">🥇 1° Puesto (Oro)</option>
                              <option value="PLATA">🥈 2° Puesto (Plata)</option>
                              <option value="BRONCE">🥉 3° Puesto (Bronce)</option>
                              <option value="PARTICIPACION">🎖️ Participación / Diploma</option>
                              <option value="OTRO">✏️ Otro puesto / mención</option>
                            </select>
                          </div>

                          {/* Puesto / Texto libre */}
                          <div>
                            <label className="text-[10px] font-bold text-blue-200 block mb-1">
                              Detalle del Puesto / Premio:
                            </label>
                            <input
                              type="text"
                              value={comp.puesto_premio}
                              onChange={(e) =>
                                handleUpdateCompetidor(comp.alumno_id, "puesto_premio", e.target.value)
                              }
                              placeholder="Ej: 1° Puesto, Campeón..."
                              className="w-full px-2.5 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-lg text-white text-xs font-semibold focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de acción modal */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? "Guardando..." : editingTorneoId ? "Actualizar Torneo" : "Guardar Torneo 🥋"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL CONFIRMACIÓN ELIMINAR */}
      {deletingTorneoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0F3E86] text-white border-2 border-rose-500/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">¿Eliminar este Torneo?</h4>
                <p className="text-xs text-blue-200">
                  Esta acción eliminará el registro del torneo y las participaciones asociadas.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTorneoId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-md transition-all cursor-pointer"
              >
                {isDeleting ? "Eliminando..." : "Sí, Eliminar Torneo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
