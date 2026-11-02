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
  Tag,
  Layers,
  FolderPlus,
  Pencil,
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

  // Categorías del torneo en edición
  const [categorias, setCategorias] = useState<string[]>([]);
  const [activeCatTab, setActiveCatTab] = useState<string>("");
  const [newCatInput, setNewCatInput] = useState("");
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState("");

  // Competidores asignados a categorías
  const [competidores, setCompetidores] = useState<CompetidorDraft[]>([]);

  // Búsqueda de alumnos en la categoría activa del modal
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
    setCategorias([]);
    setActiveCatTab("");
    setNewCatInput("");
    setEditingCatIndex(null);
    setCompetidores([]);
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

    // Extraer categorías del torneo o de sus participaciones
    const catsSet = new Set<string>();
    if (torneo.categorias && torneo.categorias.length > 0) {
      torneo.categorias.forEach((c) => catsSet.add(c.trim()));
    }
    torneo.participaciones.forEach((p) => {
      if (p.categoria && p.categoria.trim()) {
        catsSet.add(p.categoria.trim());
      }
    });

    const parsedCats = Array.from(catsSet);
    setCategorias(parsedCats);
    setActiveCatTab(parsedCats[0] || "");
    setNewCatInput("");
    setEditingCatIndex(null);

    setCompetidores(
      torneo.participaciones.map((p) => {
        const al = alumnos.find((a) => a.id === p.alumno_id);
        const cat = p.categoria ? p.categoria.trim() : "General";
        return {
          draftKey: `${p.alumno_id}__${cat}__${p.id}`,
          alumno_id: p.alumno_id,
          alumno_nombre: p.alumno_nombre || (al ? `${al.nombre} ${al.apellido}` : "Alumno"),
          alumno_cinturon: (p.alumno_cinturon || al?.cinturon_actual || "Blanco") as KarateBelt,
          alumno_subcategoria: p.alumno_subcategoria || al?.subcategoria_actual,
          categoria: cat,
          puesto_premio: p.puesto_premio,
          medalla: p.medalla || "OTRO",
          notas: p.notas || "",
        };
      })
    );
    setAlumnoSearch("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // -------------------------------------------------------------
  // Gestión de Categorías en el Modal
  // -------------------------------------------------------------
  const handleAddCategoria = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;

    // Verificar si ya existe (case-insensitive)
    const exists = categorias.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setErrorMsg(`La categoría "${trimmed}" ya fue agregada.`);
      return;
    }

    const updated = [...categorias, trimmed];
    setCategorias(updated);
    setActiveCatTab(trimmed);
    setNewCatInput("");
    setErrorMsg(null);
  };

  const handleRemoveCategoria = (catName: string) => {
    const updated = categorias.filter((c) => c !== catName);
    setCategorias(updated);
    // Quitar también los competidores anotados en esa categoría
    setCompetidores((prev) => prev.filter((c) => c.categoria !== catName));

    if (activeCatTab === catName) {
      setActiveCatTab(updated[0] || "");
    }
  };

  const handleStartRenameCat = (index: number) => {
    setEditingCatIndex(index);
    setEditingCatValue(categorias[index]);
  };

  const handleSaveRenameCat = (index: number) => {
    const oldName = categorias[index];
    const newName = editingCatValue.trim();

    if (!newName || newName === oldName) {
      setEditingCatIndex(null);
      return;
    }

    // Verificar duplicado
    if (categorias.some((c, i) => i !== index && c.toLowerCase() === newName.toLowerCase())) {
      setErrorMsg(`Ya existe otra categoría con el nombre "${newName}".`);
      return;
    }

    const updated = [...categorias];
    updated[index] = newName;
    setCategorias(updated);

    // Actualizar categoría en los competidores existentes
    setCompetidores((prev) =>
      prev.map((c) => {
        if (c.categoria === oldName) {
          return {
            ...c,
            categoria: newName,
            draftKey: `${c.alumno_id}__${newName}`,
          };
        }
        return c;
      })
    );

    if (activeCatTab === oldName) {
      setActiveCatTab(newName);
    }
    setEditingCatIndex(null);
    setErrorMsg(null);
  };

  // -------------------------------------------------------------
  // Gestión de Alumnos en la Categoría Activa
  // -------------------------------------------------------------
  const handleAddAlumnoToCategoria = (alumno: Alumno, categoria: string) => {
    if (!categoria) return;

    // Verificar si ya está en ESTA categoría
    const yaEnCategoria = competidores.some(
      (c) => c.alumno_id === alumno.id && c.categoria === categoria
    );
    if (yaEnCategoria) {
      setErrorMsg(`El alumno ya está inscripto en la categoría "${categoria}".`);
      return;
    }

    const nuevo: CompetidorDraft = {
      draftKey: `${alumno.id}__${categoria}`,
      alumno_id: alumno.id,
      alumno_nombre: `${alumno.nombre} ${alumno.apellido}`,
      alumno_cinturon: (alumno.cinturon_actual === "Azul" ? "Violeta" : alumno.cinturon_actual) as KarateBelt,
      alumno_subcategoria: alumno.subcategoria_actual,
      categoria,
      puesto_premio: "1° Puesto (Oro)",
      medalla: "ORO",
      notas: "",
    };

    setCompetidores((prev) => [...prev, nuevo]);
    setAlumnoSearch("");
    setErrorMsg(null);
  };

  const handleRemoveCompetidor = (draftKey: string) => {
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

    // Asegurarse de resolver todas las categorías
    const resolvedCategorias = Array.from(
      new Set([
        ...categorias.map((c) => c.trim()).filter(Boolean),
        ...competidores.map((c) => c.categoria.trim()).filter(Boolean),
      ])
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
  // Filtro de Alumnos candidatos para la categoría activa
  // (Un alumno puede estar en varias categorías, pero no repetido en la MISMA)
  // -------------------------------------------------------------
  const candidatosAlumnosParaCatActiva = useMemo(() => {
    if (!activeCatTab) return [];
    const q = alumnoSearch.toLowerCase().trim();

    return alumnos
      .filter((a) => {
        // No mostrar si ya está en esta categoría
        const yaEnEstaCat = competidores.some(
          (c) => c.alumno_id === a.id && c.categoria === activeCatTab
        );
        if (yaEnEstaCat) return false;

        if (!q) return true;
        const full = `${a.nombre} ${a.apellido}`.toLowerCase();
        return (
          full.includes(q) ||
          a.cinturon_actual.toLowerCase().includes(q) ||
          (a.subcategoria_actual && a.subcategoria_actual.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);
  }, [alumnos, competidores, activeCatTab, alumnoSearch]);

  // Alumnos que ya compiten en otras categorías (para dar feedback útil)
  const getOtrasCategoriasAlumno = (alumnoId: string, currentCat: string) => {
    return competidores
      .filter((c) => c.alumno_id === alumnoId && c.categoria !== currentCat)
      .map((c) => c.categoria);
  };

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
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            activeCardCategory === "TODAS"
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
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                isCatActive
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

              {/* 2. SECCIÓN CATEGORÍAS DEL TORNEO */}
              <div className="pt-4 border-t border-white/15 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>2. Categorías del Torneo ({categorias.length})</span>
                    </h4>
                    <p className="text-[11px] text-blue-200">
                      Creá las categorías que tiene este torneo (ej: Sub-12, Sub-14, Kata Mayores) para luego cargar los alumnos en cada una.
                    </p>
                  </div>
                </div>

                {/* Barra para crear nueva categoría libre */}
                <div className="p-3 bg-[#0A2E65] border border-[#2056A8] rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                    <input
                      type="text"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategoria();
                        }
                      }}
                      placeholder="Escribí el nombre de la categoría (ej: Sub-12, Sub-14 Kumite, Kata Infantiles)..."
                      className="w-full bg-transparent text-xs text-white placeholder-blue-300 focus:outline-none font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCategoria}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>+ Crear Categoría</span>
                  </button>
                </div>

                {/* Si no hay categorías creadas aún */}
                {categorias.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-white/20 rounded-xl bg-white/5 space-y-2">
                    <Layers className="w-8 h-8 text-blue-300 mx-auto opacity-50" />
                    <p className="text-xs text-blue-200 font-bold">
                      Aún no creaste categorías para este torneo.
                    </p>
                    <p className="text-[11px] text-blue-300 max-w-md mx-auto">
                      Un torneo puede tener muchas categorías (por ejemplo: Sub-12, Sub-14, Kata, Kumite).
                      Escribí el nombre arriba y hacé clic en &quot;+ Crear Categoría&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selector de Pestañas de Categoría */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
                      {categorias.map((cat, idx) => {
                        const countInThisCat = competidores.filter((c) => c.categoria === cat).length;
                        const isSelected = activeCatTab === cat;
                        const isRenaming = editingCatIndex === idx;

                        return (
                          <div
                            key={cat}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                              isSelected
                                ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black"
                                : "bg-[#0A2E65] text-blue-200 hover:bg-white/10 border-[#2056A8]"
                            }`}
                          >
                            {isRenaming ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingCatValue}
                                  onChange={(e) => setEditingCatValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveRenameCat(idx);
                                    } else if (e.key === "Escape") {
                                      setEditingCatIndex(null);
                                    }
                                  }}
                                  className="px-2 py-0.5 bg-slate-900 text-white rounded text-xs font-bold focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRenameCat(idx)}
                                  className="text-emerald-400 hover:text-emerald-200 p-0.5 cursor-pointer"
                                  title="Guardar nombre"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCatIndex(null)}
                                  className="text-rose-400 hover:text-rose-200 p-0.5 cursor-pointer"
                                  title="Cancelar"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setActiveCatTab(cat)}
                                  className="flex items-center gap-1.5 cursor-pointer text-left"
                                >
                                  <Tag className="w-3.5 h-3.5" />
                                  <span>{cat}</span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                      isSelected
                                        ? "bg-slate-950 text-amber-300"
                                        : "bg-white/15 text-blue-200"
                                    }`}
                                  >
                                    {countInThisCat}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStartRenameCat(idx)}
                                  className={`p-1 rounded hover:bg-black/20 cursor-pointer ${
                                    isSelected ? "text-slate-950 hover:text-black" : "text-blue-300 hover:text-white"
                                  }`}
                                  title="Renombrar categoría"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategoria(cat)}
                                  className={`p-1 rounded hover:bg-black/20 cursor-pointer ${
                                    isSelected ? "text-rose-950 hover:text-rose-800" : "text-rose-300 hover:text-rose-100"
                                  }`}
                                  title="Eliminar categoría"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Panel de la Categoría Activa */}
                    {activeCatTab && (
                      <div className="bg-[#0A2E65] border-2 border-[#1E57A8] rounded-2xl p-4 sm:p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-lg bg-amber-400 text-slate-950 font-black">
                                <Tag className="w-3.5 h-3.5" />
                              </span>
                              <h5 className="text-sm font-black text-white">
                                Alumnos en categoría: <span className="text-amber-300">{activeCatTab}</span>
                              </h5>
                              <span className="text-xs text-blue-200 font-semibold">
                                ({competidores.filter((c) => c.categoria === activeCatTab).length} inscriptos)
                              </span>
                            </div>
                            <p className="text-[11px] text-blue-300 mt-0.5">
                              Un alumno puede competir en esta categoría y también en otras categorías del mismo torneo.
                            </p>
                          </div>
                        </div>

                        {/* Buscador de alumnos para sumar a ESTA categoría */}
                        <div className="relative">
                          <label className="text-[11px] font-bold text-blue-200 block mb-1">
                            Sumar Alumno a &quot;{activeCatTab}&quot;:
                          </label>
                          <div className="flex items-center gap-2 p-2.5 bg-[#0F3E86] border border-[#2056A8] focus-within:border-amber-400 rounded-xl">
                            <Search className="w-4 h-4 text-cyan-300 ml-1 shrink-0" />
                            <input
                              type="text"
                              value={alumnoSearch}
                              onChange={(e) => setAlumnoSearch(e.target.value)}
                              placeholder={`Escribí el nombre para inscribir a ${activeCatTab}...`}
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

                          {/* Menú desplegable de sugerencias de alumnos */}
                          {alumnoSearch && (
                            <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#0F3E86] border-2 border-[#1E57A8] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-white/10">
                              {candidatosAlumnosParaCatActiva.length === 0 ? (
                                <p className="p-3 text-xs text-blue-300 text-center">
                                  No se encontraron alumnos disponibles con ese nombre
                                </p>
                              ) : (
                                candidatosAlumnosParaCatActiva.map((al) => {
                                  const otrasCats = getOtrasCategoriasAlumno(al.id, activeCatTab);
                                  return (
                                    <button
                                      key={al.id}
                                      type="button"
                                      onClick={() => handleAddAlumnoToCategoria(al, activeCatTab)}
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
                                        {otrasCats.length > 0 && (
                                          <span className="text-[10px] text-amber-300 bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.2 rounded font-semibold truncate">
                                            Ya compite en: {otrasCats.join(", ")}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-bold text-amber-300 shrink-0">
                                        + Inscribir
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>

                        {/* Lista de competidores en esta categoría */}
                        {competidores.filter((c) => c.categoria === activeCatTab).length === 0 ? (
                          <div className="p-5 text-center border-2 border-dashed border-white/15 rounded-xl bg-white/5">
                            <Users className="w-7 h-7 text-blue-300 mx-auto mb-1.5 opacity-50" />
                            <p className="text-xs text-blue-200 font-semibold">
                              No hay alumnos inscriptos en &quot;{activeCatTab}&quot; aún.
                            </p>
                            <p className="text-[11px] text-blue-300">
                              Usá el buscador de arriba para inscribir alumnos en esta categoría.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {competidores
                              .filter((c) => c.categoria === activeCatTab)
                              .map((comp) => (
                                <div
                                  key={comp.draftKey}
                                  className="p-3 bg-[#0F3E86] border border-[#2056A8] rounded-xl space-y-2.5"
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
                                      <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                                        {comp.categoria}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCompetidor(comp.draftKey)}
                                      className="text-rose-300 hover:text-rose-100 p-1 text-xs font-bold transition-colors cursor-pointer"
                                      title="Quitar de esta categoría"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Campos de Medalla, Puesto y Notas */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {/* Medalla rápida */}
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

                                    {/* Puesto / Texto libre */}
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
                                        placeholder="Ej: 1° Puesto, Campeón, 3er Puesto..."
                                        className="w-full px-2.5 py-1.5 bg-[#0A2E65] border border-[#2056A8] rounded-lg text-white text-xs font-semibold focus:outline-none"
                                      />
                                    </div>

                                    {/* Notas / Observaciones */}
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
                              ))}
                          </div>
                        )}
                      </div>
                    )}
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
