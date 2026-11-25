"use client";

import React, { useState, useMemo, useRef } from "react";
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
  Tag,
  Layers,
  FolderPlus,
  Pencil,
  Sparkles,
  Check,
  Filter,
} from "lucide-react";
import { Torneo, Alumno, TipoMedalla, Usuario, KarateBelt } from "@/types";
import { BeltBadge } from "@/components/ui/BeltBadge";
import { cn } from "@/lib/utils";
import {
  crearTorneoAction,
  actualizarTorneoAction,
  eliminarTorneoAction,
} from "@/lib/actions/torneos.actions";
import {
  CATEGORIAS_OFICIALES_TORNEO,
  CategoriaOficialTorneo,
} from "@/lib/constants/torneoCategorias";

interface SelectorCategoriaAlumnoDropdownProps {
  alumno: Alumno;
  assignedCategorias: string[];
  onToggleCategoria: (catNombre: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

function SelectorCategoriaAlumnoDropdown({
  alumno,
  assignedCategorias,
  onToggleCategoria,
  isOpen,
  onToggleOpen,
}: SelectorCategoriaAlumnoDropdownProps) {
  const [query, setQuery] = useState("");
  const [disciplina, setDisciplina] = useState<"TODAS" | "KATA" | "KUMITE" | "PARA-KARATE">("TODAS");
  const [customCatInput, setCustomCatInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return CATEGORIAS_OFICIALES_TORNEO.filter((cat) => {
      if (disciplina !== "TODAS" && cat.disciplina !== disciplina) {
        return false;
      }
      if (q) {
        const matchCode = cat.codigo.toLowerCase().includes(q);
        const matchName = cat.nombre.toLowerCase().includes(q);
        const matchGroup = cat.grupo.toLowerCase().includes(q);
        return matchCode || matchName || matchGroup;
      }
      return true;
    });
  }, [query, disciplina]);

  const handleAddCustom = () => {
    const trimmed = customCatInput.trim();
    if (!trimmed) {
      setCustomError("Escribí el nombre de la categoría.");
      return;
    }
    if (assignedCategorias.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCustomError("Este alumno ya tiene asignada esa categoría.");
      return;
    }
    onToggleCategoria(trimmed);
    setCustomCatInput("");
    setShowCustom(false);
    setCustomError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-[11px] font-bold text-blue-100 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Categorías para {alumno.nombre}:</span>
        </label>

        <button
          type="button"
          onClick={onToggleOpen}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${isOpen
              ? "bg-amber-300 text-slate-950 border border-amber-200"
              : "bg-amber-400 hover:bg-amber-300 text-slate-950"
            }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{isOpen ? "Cerrar lista desplegable" : "Desplegar lista de categorías"}</span>
          {assignedCategorias.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black ml-1">
              {assignedCategorias.length}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Menú Desplegable con Catálogo Completo */}
      {isOpen && (
        <div className="p-3 bg-[#072049] border-2 border-amber-400/40 rounded-xl space-y-3 shadow-xl animate-in fade-in slide-in-from-top-1">
          {/* Header del desplegable */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <p className="text-xs font-black text-white flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-300" />
                <span>Lista Desplegable de Categorías (Catálogo Oficial)</span>
              </p>
              <p className="text-[11px] text-blue-300">
                Hacé clic en una categoría para asignarla o quitarla para {alumno.nombre} {alumno.apellido}.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleOpen}
              className="text-xs font-bold text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Listo ✓
            </button>
          </div>

          {/* Buscador de categorías dentro del desplegable */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código (C01, C15, C76...), Kata, Kumite, Para-Karate, peso, edad..."
              className="w-full pl-8 pr-8 py-2 bg-[#0A2E65] border border-[#2056A8] focus:border-amber-400 rounded-lg text-white text-xs font-semibold focus:outline-none placeholder-blue-300"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros rápidos por Disciplina */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="font-bold text-blue-300 shrink-0">Filtro:</span>
            {(["TODAS", "KATA", "KUMITE", "PARA-KARATE"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDisciplina(d)}
                className={`px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer border ${disciplina === d
                    ? "bg-amber-400 text-slate-950 border-amber-300"
                    : "bg-white/5 text-blue-300 border-white/10 hover:bg-white/10"
                  }`}
              >
                {d}
              </button>
            ))}
            <span className="text-white/20">|</span>
            <span className="text-[10px] text-blue-300 font-medium">
              {filtered.length} disponibles
            </span>
          </div>

          {/* Lista de categorías para hacer scroll */}
          <div className="max-h-56 overflow-y-auto space-y-1 p-1 bg-[#051838] border border-white/10 rounded-lg">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-xs text-blue-300">
                No se encontraron categorías con esa búsqueda.
              </p>
            ) : (
              filtered.map((cat) => {
                const isAssigned = assignedCategorias.includes(cat.nombre);
                return (
                  <button
                    key={cat.codigo}
                    type="button"
                    onClick={() => onToggleCategoria(cat.nombre)}
                    className={`w-full p-2 rounded-lg flex items-center justify-between gap-2 text-left transition-all cursor-pointer border ${isAssigned
                        ? "bg-[#164E9E] border-emerald-400/80 text-white font-bold shadow-xs"
                        : "bg-transparent border-transparent hover:bg-white/5 text-blue-200"
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${isAssigned
                            ? "bg-emerald-400 border-emerald-400 text-slate-950"
                            : "border-white/30 bg-black/20"
                          }`}
                      >
                        {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded shrink-0 ${isAssigned
                            ? "bg-amber-400 text-slate-950"
                            : "bg-white/10 text-amber-300 border border-amber-400/20"
                          }`}
                      >
                        {cat.codigo}
                      </span>

                      <span
                        className={`text-[9px] font-black px-1 rounded shrink-0 uppercase ${cat.disciplina === "KATA"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : cat.disciplina === "KUMITE"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                      >
                        {cat.disciplina}
                      </span>

                      <span className="text-xs truncate text-white">
                        {cat.nombre}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 ${isAssigned
                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40"
                          : "text-amber-300 hover:text-white"
                        }`}
                    >
                      {isAssigned ? "✓ Inscripto" : "+ Inscribir"}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Categoría personalizada */}
          <div className="pt-2 border-t border-white/10">
            {!showCustom ? (
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="text-[11px] text-cyan-300 hover:text-cyan-100 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Agregar categoría personalizada (fuera del catálogo)</span>
              </button>
            ) : (
              <div className="space-y-1.5 p-2 bg-[#0A2E65] rounded-lg border border-[#2056A8]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customCatInput}
                    onChange={(e) => {
                      setCustomCatInput(e.target.value);
                      if (customError) setCustomError(null);
                    }}
                    placeholder="Ej: C146. Categoría Invitados Especiales..."
                    className="flex-1 px-2.5 py-1.5 bg-[#072049] border border-[#2056A8] rounded text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded transition-all cursor-pointer shrink-0"
                  >
                    + Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustom(false);
                      setCustomError(null);
                    }}
                    className="text-xs text-blue-300 hover:text-white px-2 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                {customError && (
                  <p className="text-[10px] text-rose-300 font-semibold">{customError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminTorneosClientProps {
  currentUser: Usuario;
  initialTorneos: Torneo[];
  alumnos: Alumno[];
}

interface CompetidorDraft {
  draftKey: string; // `${alumno_id}__${categoria}`
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
  // Pestaña de categoría activa en la tarjeta del torneo (torneoId -> categoria)
  const [activeCategoryPerTorneo, setActiveCategoryPerTorneo] = useState<Record<string, string>>({});

  // Estados de Modal Formulario (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTorneoId, setEditingTorneoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Alumnos seleccionados para el torneo en creación / edición
  const [selectedAlumnos, setSelectedAlumnos] = useState<Alumno[]>([]);
  // Competidores asignados a categorías con medallas y premios
  const [competidores, setCompetidores] = useState<CompetidorDraft[]>([]);
  // Alumno cuyo desplegable de categorías está abierto actualmente (alumnoId o null)
  const [openCategoryDropdownAlumnoId, setOpenCategoryDropdownAlumnoId] = useState<string | null>(null);

  // Búsqueda de alumnos para sumar al torneo
  const [alumnoSearch, setAlumnoSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal confirmación eliminar torneo
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
    setSelectedAlumnos([]);
    setCompetidores([]);
    setOpenCategoryDropdownAlumnoId(null);
    setAlumnoSearch("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEditar = (torneo: Torneo) => {
    setEditingTorneoId(torneo.id);
    setNombre(torneo.nombre);
    setFecha(torneo.fecha);
    setLugar(torneo.lugar || "");
    setDescripcion(torneo.descripcion || "");

    const loadedDrafts = torneo.participaciones.map((p) => {
      const al = alumnos.find((a) => a.id === p.alumno_id);
      const cat = p.categoria ? p.categoria.trim() : "General";
      return {
        draftKey: `${p.alumno_id}__${cat}__${p.id || Math.random()}`,
        alumno_id: p.alumno_id,
        alumno_nombre: p.alumno_nombre || (al ? `${al.nombre} ${al.apellido}` : "Alumno"),
        alumno_cinturon: (p.alumno_cinturon || al?.cinturon_actual || "Blanco") as KarateBelt,
        alumno_subcategoria: p.alumno_subcategoria || al?.subcategoria_actual,
        categoria: cat,
        puesto_premio: p.puesto_premio || "1° Puesto (Oro)",
        medalla: p.medalla || "OTRO",
        notas: p.notas || "",
      };
    });

    setCompetidores(loadedDrafts);

    // Obtener los alumnos únicos a partir de las participaciones
    const uniqueAlumnoIds = Array.from(new Set(loadedDrafts.map((d) => d.alumno_id)));
    const matchedAlumnos: Alumno[] = [];
    uniqueAlumnoIds.forEach((id) => {
      const al = alumnos.find((a) => a.id === id);
      if (al) {
        matchedAlumnos.push(al);
      } else {
        const draft = loadedDrafts.find((d) => d.alumno_id === id);
        matchedAlumnos.push({
          id,
          nombre: draft?.alumno_nombre.split(" ")[0] || "Alumno",
          apellido: draft?.alumno_nombre.split(" ").slice(1).join(" ") || "",
          fecha_nacimiento: "",
          telefono_contacto: "",
          contacto_emergencia: "",
          cinturon_actual: draft?.alumno_cinturon || "Blanco",
          subcategoria_actual: draft?.alumno_subcategoria || null,
          estado: "ACTIVO",
          created_at: new Date().toISOString(),
        });
      }
    });

    setSelectedAlumnos(matchedAlumnos);
    setOpenCategoryDropdownAlumnoId(null);
    setAlumnoSearch("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // -------------------------------------------------------------
  // Gestión de Alumnos Participantes
  // -------------------------------------------------------------
  const handleAddAlumno = (alumno: Alumno) => {
    if (!selectedAlumnos.some((a) => a.id === alumno.id)) {
      setSelectedAlumnos((prev) => [...prev, alumno]);
    }
    setOpenCategoryDropdownAlumnoId(alumno.id);
    setAlumnoSearch("");
    setErrorMsg(null);
  };

  const handleRemoveAlumno = (alumnoId: string) => {
    setSelectedAlumnos((prev) => prev.filter((a) => a.id !== alumnoId));
    setCompetidores((prev) => prev.filter((c) => c.alumno_id !== alumnoId));
    if (openCategoryDropdownAlumnoId === alumnoId) {
      setOpenCategoryDropdownAlumnoId(null);
    }
  };

  // -------------------------------------------------------------
  // Gestión de Categorías para un Alumno específico
  // -------------------------------------------------------------
  const handleToggleCategoriaParaAlumno = (alumno: Alumno, categoriaNombre: string) => {
    const trimmedCat = categoriaNombre.trim();
    if (!trimmedCat) return;

    const yaAsignada = competidores.some(
      (c) => c.alumno_id === alumno.id && c.categoria === trimmedCat
    );

    if (yaAsignada) {
      setCompetidores((prev) =>
        prev.filter((c) => !(c.alumno_id === alumno.id && c.categoria === trimmedCat))
      );
    } else {
      const nuevo: CompetidorDraft = {
        draftKey: `${alumno.id}__${trimmedCat}__${Date.now()}`,
        alumno_id: alumno.id,
        alumno_nombre: `${alumno.nombre} ${alumno.apellido}`,
        alumno_cinturon: (alumno.cinturon_actual === "Azul" ? "Violeta" : alumno.cinturon_actual) as KarateBelt,
        alumno_subcategoria: alumno.subcategoria_actual,
        categoria: trimmedCat,
        puesto_premio: "1° Puesto (Oro)",
        medalla: "ORO",
        notas: "",
      };
      setCompetidores((prev) => [...prev, nuevo]);
    }
    setErrorMsg(null);
  };

  const handleRemoveCategoriaDeAlumno = (draftKey: string) => {
    setCompetidores((prev) => prev.filter((c) => c.draftKey !== draftKey));
  };

  const handleUpdateCompetidor = (
    draftKey: string,
    field: keyof CompetidorDraft,
    value: any
  ) => {
    setCompetidores((prev) =>
      prev.map((c) => {
        if (c.draftKey !== draftKey) return c;
        const updated = { ...c, [field]: value };

        // Autocompletar texto de puesto sugerido al cambiar medalla
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

  // -------------------------------------------------------------
  // Guardar Torneo
  // -------------------------------------------------------------
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

    if (selectedAlumnos.length > 0) {
      const sinCategorias = selectedAlumnos.filter(
        (al) => !competidores.some((c) => c.alumno_id === al.id)
      );
      if (sinCategorias.length > 0) {
        setErrorMsg(
          `El alumno ${sinCategorias[0].nombre} ${sinCategorias[0].apellido} aún no tiene categorías asignadas. Por favor abrí su lista desplegable y seleccioná sus categorías o quitalo del torneo.`
        );
        return;
      }
    }

    // Resolver las categorías del torneo: todas las categorías en las que compiten los alumnos
    const resolvedCategorias = Array.from(
      new Set(competidores.map((c) => c.categoria.trim()).filter(Boolean))
    );

    setIsSaving(true);
    setErrorMsg(null);

    const payload = {
      nombre: nombre.trim(),
      fecha,
      lugar: lugar.trim() || null,
      descripcion: descripcion.trim() || null,
      categorias: resolvedCategorias,
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

  // -------------------------------------------------------------
  // Eliminar Torneo
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Filtro de Alumnos candidatos para sumar al torneo
  // -------------------------------------------------------------
  const candidatosAlumnosParaSumar = useMemo(() => {
    const q = alumnoSearch.toLowerCase().trim();
    if (!q) return [];

    return alumnos
      .filter((a) => {
        if (selectedAlumnos.some((sel) => sel.id === a.id)) return false;
        const full = `${a.nombre} ${a.apellido}`.toLowerCase();
        return (
          full.includes(q) ||
          a.cinturon_actual.toLowerCase().includes(q) ||
          (a.subcategoria_actual && a.subcategoria_actual.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);
  }, [alumnos, selectedAlumnos, alumnoSearch]);

  // Torneos filtrados
  const torneosFiltrados = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return torneos;
    return torneos.filter(
      (t) =>
        t.nombre.toLowerCase().includes(q) ||
        (t.lugar && t.lugar.toLowerCase().includes(q)) ||
        t.fecha.includes(q) ||
        (t.categorias && t.categorias.some((cat) => cat.toLowerCase().includes(q))) ||
        t.participaciones.some((p) =>
          (p.alumno_nombre || "").toLowerCase().includes(q) ||
          (p.categoria || "").toLowerCase().includes(q)
        )
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
          Módulo de Torneos & Categorías
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
              Configurá torneos con múltiples categorías y asigná la delegación de alumnos del dojo
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

        {/* Card 2: Alumnos Competidores Únicos */}
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
              Alumnos únicos
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
              Participaciones por categoría
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
          placeholder="Buscar torneo por nombre, lugar, fecha, categoría o competidor..."
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
                : "Todavía no registraste ningún torneo. Hacé clic en 'Crear Torneo' para configurar las categorías y competidores."}
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
            const uniqueStudentsCount = new Set(torneo.participaciones.map((p) => p.alumno_id)).size;

            // Extraer todas las categorías del torneo
            const catsSet = new Set<string>();
            if (torneo.categorias && torneo.categorias.length > 0) {
              torneo.categorias.forEach((c) => catsSet.add(c.trim()));
            }
            torneo.participaciones.forEach((p) => {
              if (p.categoria && p.categoria.trim()) catsSet.add(p.categoria.trim());
            });
            const torneoCategorias = Array.from(catsSet);

            // Categoría activa seleccionada para ver en la tarjeta
            const activeCardCategory = activeCategoryPerTorneo[torneo.id] || "TODAS";

            // Participaciones filtradas por categoría activa en la tarjeta
            const participacionesAMostrar =
              activeCardCategory === "TODAS"
                ? torneo.participaciones
                : torneo.participaciones.filter((p) => (p.categoria || "General") === activeCardCategory);

            return (
              <div
                key={torneo.id}
                className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl shadow-xl shadow-blue-950/15 overflow-hidden transition-all"
              >
                {/* Cabecera del Torneo */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        <Trophy className="w-4 h-4" />
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {torneo.nombre}
                      </h2>
                    </div>

                    {/* Metadatos: fecha, lugar, alumnos y participaciones */}
                    <div className="flex items-center gap-3.5 text-xs text-blue-200 flex-wrap">
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
                        <span>
                          {uniqueStudentsCount} {uniqueStudentsCount === 1 ? "alumno" : "alumnos"} ({partCount} {partCount === 1 ? "inscripción" : "inscripciones"})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {torneoCategorias.length} {torneoCategorias.length === 1 ? "categoría" : "categorías"}
                        </span>
                      </div>
                    </div>

                    {/* Badges de las categorías configuradas */}
                    {torneoCategorias.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mr-1">
                          Categorías:
                        </span>
                        {torneoCategorias.map((cat) => {
                          const countInCat = torneo.participaciones.filter(
                            (p) => (p.categoria || "General") === cat
                          ).length;
                          return (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#144794] text-cyan-200 border border-blue-400/30"
                            >
                              <Tag className="w-3 h-3 text-amber-300" />
                              <span>{cat}</span>
                              <span className="text-[10px] text-blue-300 bg-[#0A2E65] px-1.5 py-0.2 rounded-full font-black">
                                {countInCat}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {torneo.descripcion && (
                      <p className="text-xs text-blue-100 font-medium italic pt-1">
                        &ldquo;{torneo.descripcion}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                    <button
                      onClick={() => handleOpenEditar(torneo)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Editar Torneo y Categorías"
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
                      <span>{isExpanded ? "Ocultar" : "Ver Categorías & Delegación"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Delegación Desplegable Agrupada por Categorías */}
                {isExpanded && (
                  <div className="border-t border-white/15 bg-[#0A2E65] p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                          Competidores y Resultados por Categoría
                        </span>
                        <span className="text-xs text-blue-200 font-medium">
                          ({partCount} {partCount === 1 ? "participación" : "participaciones"})
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenEditar(torneo)}
                        className="text-xs text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer self-start sm:self-auto"
                      >
                        + Configurar Categorías / Alumnos
                      </button>
                    </div>

                    {/* Filtro por Categoría dentro de la tarjeta */}
                    {torneoCategorias.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <button
                          onClick={() =>
                            setActiveCategoryPerTorneo((prev) => ({
                              ...prev,
                              [torneo.id]: "TODAS",
                            }))
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${activeCardCategory === "TODAS"
                              ? "bg-amber-400 text-slate-950 shadow-sm"
                              : "bg-white/10 text-blue-200 hover:bg-white/20"
                            }`}
                        >
                          Todas las Categorías ({partCount})
                        </button>
                        {torneoCategorias.map((cat) => {
                          const catCount = torneo.participaciones.filter(
                            (p) => (p.categoria || "General") === cat
                          ).length;
                          const isCatActive = activeCardCategory === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() =>
                                setActiveCategoryPerTorneo((prev) => ({
                                  ...prev,
                                  [torneo.id]: cat,
                                }))
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${isCatActive
                                  ? "bg-cyan-400 text-slate-950 shadow-sm font-black"
                                  : "bg-white/10 text-blue-200 hover:bg-white/20"
                                }`}
                            >
                              <span>{cat}</span>
                              <span className="text-[10px] opacity-80">({catCount})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Contenido agrupado por categoría o filtrado */}
                    {participacionesAMostrar.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-xs text-blue-300 italic">
                          {torneoCategorias.length === 0
                            ? "No hay categorías ni alumnos cargados en este torneo todavía."
                            : `No hay alumnos cargados en la categoría "${activeCardCategory}".`}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {participacionesAMostrar.map((part) => {
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
                                <div className="flex items-center gap-2 text-[11px] text-blue-200 flex-wrap">
                                  <span className="inline-flex items-center gap-1 font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/30">
                                    <Tag className="w-3 h-3 text-cyan-400" />
                                    <span>{part.categoria || "General"}</span>
                                  </span>
                                  {part.notas && (
                                    <span className="italic text-blue-300">
                                      • {part.notas}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Badge de Puesto / Medalla */}
                              <div
                                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border flex items-center gap-1.5 ${isOro
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
          <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/15 flex items-center justify-between bg-[#0A2E65] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {editingTorneoId ? "Editar Torneo & Categorías" : "Registrar Nuevo Torneo"}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Definí las categorías del torneo y asigná los alumnos de la academia a cada una
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitTorneo} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-500/20 border border-rose-400/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Datos Básicos del Torneo */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>1. Datos del Evento</span>
                </h4>
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
                      placeholder="Ej: Torneo Panamericano CENARD, Copa Sensei Nievas 2026..."
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
                      placeholder="Ej: CENARD, CeNARD Hall 2, Polideportivo Municipal..."
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
                      placeholder="Ej: Clasificatorio oficial, delegación destacada con 12 medallas..."
                      className="w-full px-3.5 py-2 bg-[#0A2E65] border border-[#2056A8] focus:border-amber-400 rounded-xl text-white text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. SECCIÓN PARTICIPANTES Y CATEGORÍAS */}
              <div className="pt-4 border-t border-white/15 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>2. Alumnos Participantes ({selectedAlumnos.length})</span>
                    </h4>
                    <p className="text-[11px] text-blue-200">
                      Elegí el alumno participante y desplegá la lista para asignarle las categorías en las que va a competir.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black shadow-xs">
                      {selectedAlumnos.length} {selectedAlumnos.length === 1 ? "alumno" : "alumnos"} | {competidores.length} inscripciones
                    </span>
                  </div>
                </div>

                {/* Buscador / Selector para Elegir Alumno Participante */}
                <div className="relative">
                  <label className="text-xs font-bold text-blue-100 block mb-1">
                    Elegir Alumno Participante:
                  </label>
                  <div className="flex items-center gap-2 p-2.5 bg-[#0A2E65] border border-[#2056A8] focus-within:border-amber-400 rounded-xl">
                    <Search className="w-4 h-4 text-cyan-300 ml-1 shrink-0" />
                    <input
                      type="text"
                      value={alumnoSearch}
                      onChange={(e) => setAlumnoSearch(e.target.value)}
                      placeholder="Escribí el nombre o apellido del alumno para sumarlo al torneo..."
                      className="w-full bg-transparent text-xs text-white placeholder-blue-300 focus:outline-none font-medium"
                    />
                    {alumnoSearch && (
                      <button
                        type="button"
                        onClick={() => setAlumnoSearch("")}
                        className="text-blue-300 hover:text-white p-1 text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sugerencias de alumnos flotante */}
                  {alumnoSearch && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#0F3E86] border-2 border-[#1E57A8] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-white/10">
                      {candidatosAlumnosParaSumar.length === 0 ? (
                        <p className="p-3 text-xs text-blue-300 text-center">
                          No se encontraron alumnos disponibles con ese nombre
                        </p>
                      ) : (
                        candidatosAlumnosParaSumar.map((al) => (
                          <button
                            key={al.id}
                            type="button"
                            onClick={() => handleAddAlumno(al)}
                            className="w-full p-2.5 text-left hover:bg-white/10 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-white text-xs truncate">
                                {al.nombre} {al.apellido}
                              </span>
                              <BeltBadge belt={al.cinturon_actual} size="sm" />
                              {al.subcategoria_actual && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-cyan-200">
                                  {al.subcategoria_actual}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-amber-300 shrink-0">
                              + Sumar al Torneo
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Alumnos Participantes Seleccionados */}
                {selectedAlumnos.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-white/20 rounded-xl bg-white/5 space-y-2">
                    <Users className="w-8 h-8 text-blue-300 mx-auto opacity-50" />
                    <p className="text-xs text-blue-200 font-bold">
                      Aún no agregaste alumnos a este torneo.
                    </p>
                    <p className="text-[11px] text-blue-300 max-w-md mx-auto">
                      Usá el buscador de arriba para elegir un alumno. Al seleccionarlo, se desplegará la lista con todas las categorías oficiales para que elijas en cuáles va a competir.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedAlumnos.map((alumno) => {
                      const studentDrafts = competidores.filter((c) => c.alumno_id === alumno.id);
                      const assignedCatNames = studentDrafts.map((c) => c.categoria);
                      const isDropdownOpen = openCategoryDropdownAlumnoId === alumno.id;

                      return (
                        <div
                          key={alumno.id}
                          className="p-4 bg-[#0A2E65] border-2 border-[#1E57A8] rounded-2xl space-y-3.5 shadow-md"
                        >
                          {/* Header del Alumno */}
                          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-black text-white text-sm">
                                {alumno.nombre} {alumno.apellido}
                              </span>
                              <BeltBadge belt={alumno.cinturon_actual} size="sm" />
                              {alumno.subcategoria_actual && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-cyan-200 border border-white/15">
                                  {alumno.subcategoria_actual}
                                </span>
                              )}
                              <span className="text-[11px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                                {studentDrafts.length} {studentDrafts.length === 1 ? "categoría" : "categorías"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveAlumno(alumno.id)}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-500/30 flex items-center gap-1 shrink-0"
                              title="Quitar alumno del torneo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Quitar Alumno</span>
                            </button>
                          </div>

                          {/* Selector Desplegable de Categorías */}
                          <SelectorCategoriaAlumnoDropdown
                            alumno={alumno}
                            assignedCategorias={assignedCatNames}
                            onToggleCategoria={(catNombre) => handleToggleCategoriaParaAlumno(alumno, catNombre)}
                            isOpen={isDropdownOpen}
                            onToggleOpen={() =>
                              setOpenCategoryDropdownAlumnoId((curr) => (curr === alumno.id ? null : alumno.id))
                            }
                          />

                          {/* Tarjetas de Categorías Asignadas a este Alumno */}
                          {studentDrafts.length === 0 ? (
                            <div className="p-3 bg-amber-400/10 border border-amber-400/25 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>
                                Este alumno aún no tiene categorías asignadas. Hacé clic en{" "}
                                <strong>&quot;Desplegar lista de categorías&quot;</strong> para elegir en cuáles competirá.
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2.5 pt-1">
                              <span className="text-[11px] font-bold text-blue-200 block">
                                Categorías asignadas ({studentDrafts.length}):
                              </span>
                              {studentDrafts.map((comp) => {
                                const matchOficial = CATEGORIAS_OFICIALES_TORNEO.find(
                                  (c) => c.nombre === comp.categoria
                                );

                                return (
                                  <div
                                    key={comp.draftKey}
                                    className="p-3 bg-[#0F3E86] border border-[#2056A8] rounded-xl space-y-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        {matchOficial && (
                                          <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-black font-mono">
                                            {matchOficial.codigo}
                                          </span>
                                        )}
                                        <span className="text-xs font-bold text-white truncate max-w-[320px] sm:max-w-md">
                                          {comp.categoria}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCategoriaDeAlumno(comp.draftKey)}
                                        className="text-rose-300 hover:text-rose-100 p-1 text-xs font-bold transition-colors cursor-pointer"
                                        title="Quitar esta categoría"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Campos Medalla, Puesto y Notas */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div>
                                        <label className="text-[10px] font-bold text-blue-200 block mb-1">
                                          Medalla / Premio:
                                        </label>
                                        <select
                                          value={comp.medalla}
                                          onChange={(e) =>
                                            handleUpdateCompetidor(comp.draftKey, "medalla", e.target.value)
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

                                      <div>
                                        <label className="text-[10px] font-bold text-blue-200 block mb-1">
                                          Detalle del Puesto:
                                        </label>
                                        <input
                                          type="text"
                                          value={comp.puesto_premio}
                                          onChange={(e) =>
                                            handleUpdateCompetidor(comp.draftKey, "puesto_premio", e.target.value)
                                          }
                                          placeholder="Ej: 1° Puesto (Oro), Campeón..."
                                          className="w-full px-2.5 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-lg text-white text-xs font-semibold focus:outline-none"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-bold text-blue-200 block mb-1">
                                          Notas de Combate (opcional):
                                        </label>
                                        <input
                                          type="text"
                                          value={comp.notas}
                                          onChange={(e) =>
                                            handleUpdateCompetidor(comp.draftKey, "notas", e.target.value)
                                          }
                                          placeholder="Ej: Ganó 3 combates por ippon..."
                                          className="w-full px-2.5 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-lg text-white text-xs font-medium focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botones de acción modal */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-between gap-3">
                <span className="text-xs text-blue-200 font-semibold">
                  Total de inscripciones acumuladas: <strong className="text-amber-300">{competidores.length}</strong>
                </span>

                <div className="flex items-center gap-3">
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
                  Esta acción eliminará el registro del torneo, sus categorías y las participaciones asociadas.
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
