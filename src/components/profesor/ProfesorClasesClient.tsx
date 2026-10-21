"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Usuario,
  ClaseHistorialItem,
  ListaAlumnos,
  Alumno,
  Clase,
  ClaseAbiertaItem,
} from "@/types";
import { ModalCrearClaseProfesor } from "./ModalCrearClaseProfesor";
import { ModalCrearListaAlumnos } from "./ModalCrearListaAlumnos";
import { ModalVerListaAlumnos } from "./ModalVerListaAlumnos";
import { ModalEditarListaAlumnos } from "./ModalEditarListaAlumnos";
import { ModalVerClaseInfo } from "./ModalVerClaseInfo";
import { ModalEditarClaseHistorial } from "./ModalEditarClaseHistorial";
import { ModalInscribirAlumno } from "@/components/tatami/ModalInscribirAlumno";
import { TerminalSessionWatcher } from "@/components/terminal/TerminalSessionWatcher";
import { formatDaysList, formatTime } from "@/lib/utils";
import { cerrarClaseAction } from "@/lib/actions/asistencia.actions";
import { eliminarListaAlumnosAction } from "@/lib/actions/clases.actions";
import {
  CalendarDays,
  Clock,
  Users,
  ClipboardCheck,
  PlusCircle,
  History,
  ChevronRight,
  ListPlus,
  Sparkles,
  CheckCircle2,
  Radio,
  Lock,
  Eye,
  Edit2,
  Trash2,
  Menu,
  User,
  AlertTriangle,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface ProfesorClasesClientProps {
  currentUser: Usuario;
  initialUltimasClases: ClaseHistorialItem[];
  initialListasAlumnos: ListaAlumnos[];
  alumnosDisponibles: Alumno[];
  initialClasesAbiertas?: ClaseAbiertaItem[];
  profesoresDisponibles?: Usuario[];
}

export function ProfesorClasesClient({
  currentUser,
  initialUltimasClases,
  initialListasAlumnos,
  alumnosDisponibles,
  initialClasesAbiertas = [],
  profesoresDisponibles = [],
}: ProfesorClasesClientProps) {
  const router = useRouter();

  const [ultimasClases, setUltimasClases] =
    useState<ClaseHistorialItem[]>(initialUltimasClases);
  const [listasAlumnos, setListasAlumnos] =
    useState<ListaAlumnos[]>(initialListasAlumnos);
  const [clasesAbiertas, setClasesAbiertas] =
    useState<ClaseAbiertaItem[]>(initialClasesAbiertas);
  const [alumnos, setAlumnos] = useState<Alumno[]>(alumnosDisponibles);
  const [cerrandoSesionId, setCerrandoSesionId] = useState<string | null>(null);

  const [isCrearClaseOpen, setIsCrearClaseOpen] = useState(false);
  const [isCrearListaOpen, setIsCrearListaOpen] = useState(false);

  // Estado para Sumar Alumno a Clase Abierta (Modal)
  const [claseParaInscribir, setClaseParaInscribir] = useState<ClaseAbiertaItem | null>(null);

  // Estados para Ver y Editar Listas de Alumnos Guardadas
  const [listaParaVer, setListaParaVer] = useState<ListaAlumnos | null>(null);
  const [listaParaEditar, setListaParaEditar] = useState<ListaAlumnos | null>(null);
  const [eliminandoListaId, setEliminandoListaId] = useState<string | null>(null);
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);

  // Estados para Ver Info, Editar Horario y Menú de Clases del Historial
  const [claseParaVerInfo, setClaseParaVerInfo] = useState<ClaseHistorialItem | null>(null);
  const [claseParaEditar, setClaseParaEditar] = useState<ClaseHistorialItem | null>(null);
  const [menuClaseAbiertoId, setMenuClaseAbiertoId] = useState<string | null>(null);

  // Sincronizar ultimasClases, clasesAbiertas y alumnos cuando las props del servidor cambien
  React.useEffect(() => {
    setUltimasClases(initialUltimasClases);
  }, [initialUltimasClases]);

  React.useEffect(() => {
    setClasesAbiertas(initialClasesAbiertas);
  }, [initialClasesAbiertas]);

  React.useEffect(() => {
    setAlumnos(alumnosDisponibles);
  }, [alumnosDisponibles]);

  const handleAlumnoCreado = (nuevoAlumno: Alumno) => {
    setAlumnos((prev) => {
      const exists = prev.some((a) => a.id === nuevoAlumno.id);
      if (exists) return prev.map((a) => (a.id === nuevoAlumno.id ? nuevoAlumno : a));
      return [nuevoAlumno, ...prev];
    });
  };

  // Nombre limpio sin sufijos como (Admin) o (SuperAdmin)
  const cleanNombre = currentUser.nombre_completo
    .replace(/\s*\((admin|superadmin|profesor)\)/gi, "")
    .trim();

  const handleListaCreada = (nuevaLista: ListaAlumnos) => {
    setListasAlumnos((prev) => [nuevaLista, ...prev]);
  };

  const handleListaActualizada = (listaActualizada: ListaAlumnos) => {
    setListasAlumnos((prev) =>
      prev.map((l) => (l.id === listaActualizada.id ? listaActualizada : l))
    );
  };

  const handleEliminarLista = async (lista: ListaAlumnos) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar la lista "${lista.nombre}"?`
    );
    if (!confirmar) return;

    setEliminandoListaId(lista.id);
    try {
      const res = await eliminarListaAlumnosAction(lista.id);
      if (res.success) {
        setListasAlumnos((prev) => prev.filter((l) => l.id !== lista.id));
        if (listaParaVer?.id === lista.id) setListaParaVer(null);
        if (listaParaEditar?.id === lista.id) setListaParaEditar(null);
      } else {
        alert(res.error || "No se pudo eliminar la lista");
      }
    } catch {
      alert("Error al eliminar la lista de alumnos");
    } finally {
      setEliminandoListaId(null);
    }
  };

  const handleClaseCreada = (nuevaClase: Clase) => {
    // Agregar a la lista de clases abiertas parpadeando con ID real
    const realSesionId = (nuevaClase as any).sesion_id || "s" + Date.now().toString(36);
    const nuevaAbierta: ClaseAbiertaItem = {
      sesion: {
        id: realSesionId,
        clase_id: nuevaClase.id,
        profesor_id: currentUser.id,
        fecha: new Date().toISOString().split("T")[0],
        hora_apertura: new Date().toISOString(),
        estado: "ABIERTA",
        observaciones: "",
        created_at: new Date().toISOString(),
        clase_nombre: nuevaClase.nombre,
      },
      clase: nuevaClase,
      presentesCount: 0,
      tardesCount: 0,
      ausentesCount: nuevaClase.total_inscriptos || 0,
      totalCount: nuevaClase.total_inscriptos || 0,
    };
    setClasesAbiertas((prev) => [nuevaAbierta, ...prev]);
    router.refresh();
  };

  const handleCerrarClase = async (sesionId: string) => {
    const confirmar = window.confirm("¿Deseas cerrar y finalizar esta clase de tatami?");
    if (!confirmar) return;

    setCerrandoSesionId(sesionId);
    try {
      const res = await cerrarClaseAction(sesionId);
      if (res.success) {
        // Encontrar los datos de la sesión abierta que se cerró
        const sesionCerrada = clasesAbiertas.find((it) => it.sesion.id === sesionId);
        setClasesAbiertas((prev) => prev.filter((item) => item.sesion.id !== sesionId));

        if (sesionCerrada) {
          const pres = sesionCerrada.presentesCount || 0;
          const tard = sesionCerrada.tardesCount || 0;
          const tot = sesionCerrada.totalCount || 0;
          const aus = sesionCerrada.ausentesCount ?? Math.max(0, tot - pres);

          const itemHistorial: ClaseHistorialItem = {
            clase: sesionCerrada.clase,
            sesion: { ...sesionCerrada.sesion, estado: "FINALIZADA" },
            fecha: sesionCerrada.sesion.fecha || new Date().toISOString().split("T")[0],
            totalInscriptos: tot,
            totalPresentes: pres,
            totalAusentes: aus,
            totalTardes: tard,
          };

          setUltimasClases((prev) => {
            const filtered = prev.filter((it) => it.sesion?.id !== sesionId);
            return [itemHistorial, ...filtered.slice(0, 2)];
          });
        }

        router.refresh();
      } else {
        alert(res.error || "No se pudo cerrar la clase");
      }
    } catch {
      alert("Error de conexión al cerrar la clase");
    } finally {
      setCerrandoSesionId(null);
    }
  };

  // Detección reactiva de Modo Tablet / Kiosk
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);

  React.useEffect(() => {
    const checkKiosk = () => {
      try {
        const isKiosk =
          localStorage.getItem("nievas_kiosk_mode") === "true" ||
          (typeof window !== "undefined" && window.location.search.includes("terminal=1"));
        setIsKioskMode(isKiosk);
      } catch {
        setIsKioskMode(false);
      }
    };

    checkKiosk();
    window.addEventListener("kiosk_mode_change", checkKiosk);
    window.addEventListener("storage", checkKiosk);
    return () => {
      window.removeEventListener("kiosk_mode_change", checkKiosk);
      window.removeEventListener("storage", checkKiosk);
    };
  }, []);

  // VISTA EXCLUSIVA MODO TABLET (PANTALLA AZUL CON LOS 2 BOTONES PRINCIPALES)
  if (isKioskMode) {
    return (
      <div className="min-h-[calc(100vh-2rem)] flex flex-col justify-between py-2 sm:py-4 space-y-6">
        {/* Componente Centinela de Modo Terminal / Kiosk (Sede Central) */}
        <TerminalSessionWatcher currentUser={currentUser} />

        {/* 1. CLASE ABIERTA PARPADEANDO (Si hay una clase en curso en el tatami) */}
        {clasesAbiertas.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            {clasesAbiertas.map((item) => (
              <div
                key={item.sesion.id}
                className="p-4 bg-gradient-to-r from-[#0F3E86] via-[#164e9e] to-[#0A2E65] text-white border-2 border-emerald-400 rounded-3xl shadow-2xl animate-open-class"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300 uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/60 px-2.5 py-1 rounded-full shrink-0">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                        </span>
                        <span>CLASE EN CURSO EN TATAMI</span>
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                        {item.clase.nombre}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200">
                      <span className="flex items-center gap-1 font-semibold text-blue-100">
                        <Clock className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                        <span>
                          {formatTime(item.clase.hora_inicio)} - {formatTime(item.clase.hora_fin)}
                        </span>
                      </span>
                      <span className="text-emerald-300 font-bold text-xs flex items-center gap-1 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{item.presentesCount} presentes</span>
                      </span>
                      <span className="text-rose-300 font-semibold text-xs flex items-center gap-1 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/30">
                        <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>
                          {item.ausentesCount ??
                            Math.max(0, item.totalCount - item.presentesCount - (item.tardesCount || 0))}{" "}
                          ausentes
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setClaseParaInscribir(item)}
                      className="px-3 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer touch-target-safe"
                    >
                      <PlusCircle className="w-4 h-4 text-cyan-300" />
                      <span>+ Sumar Alumno</span>
                    </button>
                    <Link
                      href={`/profesor/clases/${item.clase.id}/asistencia`}
                      className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 touch-target-safe text-sm"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>CONTINUAR ASISTENCIA</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCerrarClase(item.sesion.id)}
                      disabled={cerrandoSesionId === item.sesion.id}
                      className="px-3 py-2.5 bg-white/10 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-400/30 font-bold rounded-2xl text-xs transition-all flex items-center gap-1 cursor-pointer touch-target-safe"
                      title="Cerrar tatami y finalizar clase"
                    >
                      {cerrandoSesionId === item.sesion.id ? (
                        <span>Cerrando...</span>
                      ) : (
                        <span>Finalizar</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. ÁREA CENTRAL EXCLUSIVA: PANTALLA AZUL CON LOS DOS BOTONES GIGANTES */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 max-w-4xl mx-auto w-full px-2">
          {/* Logo y Encabezado de Modo Tablet */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center p-3.5 bg-white rounded-3xl shadow-xl border-2 border-blue-200/50 mb-1">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden">
                <Image
                  src="/nievas-logo.jpg"
                  alt="Nievas Academia Deportiva"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-md mb-2">
                Tablet Tatami • Sede Central
              </span>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Sensei {cleanNombre}
              </h1>
              <p className="text-sm sm:text-base text-blue-200/90 font-medium max-w-md mx-auto mt-1">
                Seleccioná una acción rápida para iniciar en la tablet:
              </p>
            </div>
          </div>

          {/* LOS DOS BOTONES GIGANTES TÁCTILES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 w-full">
            {/* BOTÓN 1: CREAR NUEVA CLASE */}
            <button
              type="button"
              id="btn-crear-nueva-clase-tablet"
              onClick={() => setIsCrearClaseOpen(true)}
              className="group relative flex flex-col items-center justify-center p-7 sm:p-9 bg-gradient-to-br from-[#0F3E86] to-[#0A2E65] hover:from-[#164e9e] hover:to-[#0F3E86] text-white border-2 border-[#2A6CD1] hover:border-amber-400 rounded-3xl shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer text-center overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-400/20 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />

              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-400 group-hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-xl mb-5 transition-transform duration-300 group-hover:scale-110">
                <ClipboardCheck className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-200 tracking-tight leading-snug transition-colors">
                Crear Nueva Clase
              </h2>
              <p className="text-xs sm:text-sm text-blue-200/90 mt-2 font-medium max-w-xs leading-relaxed">
                Elegí la lista de alumnos, horario e iniciá la asistencia en tatami
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-amber-300 uppercase tracking-wider bg-white/10 px-4 py-1.5 rounded-full border border-white/20 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                <span>Comenzar Clase</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* BOTÓN 2: CREAR LISTA DE ALUMNOS */}
            <button
              type="button"
              id="btn-crear-lista-alumnos-tablet"
              onClick={() => setIsCrearListaOpen(true)}
              className="group relative flex flex-col items-center justify-center p-7 sm:p-9 bg-gradient-to-br from-[#0A2E65] to-[#082046] hover:from-[#0F3E86] hover:to-[#0A2E65] text-white border-2 border-[#1E57A8] hover:border-cyan-400 rounded-3xl shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer text-center overflow-hidden"
            >
              <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-cyan-400/15 rounded-full blur-2xl group-hover:bg-cyan-400/25 transition-all" />

              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-cyan-400 group-hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-xl mb-5 transition-transform duration-300 group-hover:scale-110">
                <ListPlus className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-200 tracking-tight leading-snug transition-colors">
                Crear Lista de Alumnos
              </h2>
              <p className="text-xs sm:text-sm text-blue-200/90 mt-2 font-medium max-w-xs leading-relaxed">
                Armá una nueva nómina para clases o subí un nuevo alumno
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-cyan-300 uppercase tracking-wider bg-white/10 px-4 py-1.5 rounded-full border border-white/20 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-colors">
                <span>Nueva Nómina</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        </div>

        {/* Modales Necesarios en Modo Tablet */}
        <ModalCrearClaseProfesor
          isOpen={isCrearClaseOpen}
          onClose={() => setIsCrearClaseOpen(false)}
          listasDisponibles={listasAlumnos}
          onOpenCrearLista={() => {
            setIsCrearClaseOpen(false);
            setIsCrearListaOpen(true);
          }}
          profesorId={currentUser.id}
          onClaseCreada={handleClaseCreada}
        />

        <ModalCrearListaAlumnos
          isOpen={isCrearListaOpen}
          onClose={() => setIsCrearListaOpen(false)}
          alumnosDisponibles={alumnos}
          currentUser={currentUser}
          profesoresDisponibles={profesoresDisponibles}
          onListaCreada={(nuevaLista) => {
            handleListaCreada(nuevaLista);
            setIsCrearClaseOpen(true);
          }}
          onAlumnoCreado={handleAlumnoCreado}
        />

        {claseParaInscribir && (
          <ModalInscribirAlumno
            isOpen={!!claseParaInscribir}
            onClose={() => setClaseParaInscribir(null)}
            claseId={claseParaInscribir.clase.id}
            claseNombre={claseParaInscribir.clase.nombre}
            sesionId={claseParaInscribir.sesion.id}
            alumnosDisponibles={alumnos}
            onAlumnoInscripto={(nuevoAlumno) => {
              handleAlumnoCreado(nuevoAlumno);
              setClasesAbiertas((prev) =>
                prev.map((c) =>
                  c.sesion.id === claseParaInscribir.sesion.id
                    ? {
                        ...c,
                        totalCount: (c.totalCount || 0) + 1,
                        presentesCount: (c.presentesCount || 0) + 1,
                      }
                    : c
                )
              );
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Componente Centinela de Modo Terminal / Kiosk (Sede Central) */}
      <TerminalSessionWatcher currentUser={currentUser} />

      {/* 1. Banner Principal del Sensei - Card Reducida y Compacta en Azul Oficial #0F3E86 */}
      <div className="p-3.5 sm:p-4 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-blue-950/15">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white border border-white shadow-xs shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Logo Nievas"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
              {cleanNombre}
            </h1>
            <p className="text-[11px] text-blue-200 font-medium truncate">
              Gestión de clases y asistencia en tatami
            </p>
          </div>
        </div>
      </div>

      {/* 2. CLASE ABIERTA PARPADEANDO (Aparece en la parte superior debajo de la card principal) */}
      {clasesAbiertas.length > 0 && (
        <div className="space-y-3">
          {clasesAbiertas.map((item) => (
            <div
              key={item.sesion.id}
              className="p-3 sm:py-2.5 sm:px-4 bg-gradient-to-r from-[#0F3E86] via-[#124694] to-[#0F3E86] text-white border-2 border-emerald-400 rounded-2xl shadow-lg animate-open-class transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                {/* Info agrupada: Título, estado y metadatos ultra compactos */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-300 uppercase tracking-wider bg-emerald-950/70 border border-emerald-500/50 px-2 py-0.5 rounded-full shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      <span>CLASE ABIERTA</span>
                    </span>

                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                      {item.clase.nombre}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200">
                    <span className="flex items-center gap-1 text-[11px] text-blue-100">
                      <Clock className="w-3 h-3 text-cyan-300 shrink-0" />
                      <span>
                        {formatTime(item.clase.hora_inicio)} - {formatTime(item.clase.hora_fin)}
                      </span>
                    </span>
                    <span className="text-blue-300/40 hidden xs:inline">•</span>
                    <span className="flex items-center gap-1 text-[11px] text-blue-100">
                      <Users className="w-3 h-3 text-cyan-300 shrink-0" />
                      <span>{item.totalCount} alumnos</span>
                    </span>
                    <span className="text-blue-300/40 hidden xs:inline">•</span>
                    <span className="text-emerald-300 font-bold text-[11px] flex items-center gap-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{item.presentesCount} presentes</span>
                    </span>
                    {typeof item.tardesCount === "number" && item.tardesCount > 0 && (
                      <span className="text-amber-300 font-bold text-[11px] flex items-center gap-1 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{item.tardesCount} tardes</span>
                      </span>
                    )}
                    <span className="text-rose-300 font-semibold text-[11px] flex items-center gap-1 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/30">
                      <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{item.ausentesCount ?? Math.max(0, item.totalCount - item.presentesCount - (item.tardesCount || 0))} ausentes</span>
                    </span>
                    {item.clase.profesor_nombre && (
                      <>
                        <span className="text-blue-300/40 hidden xs:inline">•</span>
                        <span className="flex items-center gap-1 text-[11px] text-cyan-200 bg-[#082552] px-2 py-0.5 rounded-md border border-[#2056A8]">
                          <User className="w-3 h-3 text-cyan-300 shrink-0" />
                          <span>Sensei: {item.clase.profesor_nombre}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Botones de Acción Alineados */}
                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto pt-1 lg:pt-0">
                  <button
                    type="button"
                    onClick={() => setClaseParaInscribir(item)}
                    className="py-2 px-3 bg-white hover:bg-blue-50 text-[#0F3E86] text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98 touch-target-safe cursor-pointer shrink-0"
                    title="Sumar alumno del padrón o registrar nuevo en esta clase abierta"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#0F3E86]" />
                    <span>+ Sumar Alumno</span>
                  </button>
                  <Link
                    href={`/profesor/clases/${item.clase.id}/asistencia?sesionId=${item.sesion.id}`}
                    className="flex-1 lg:flex-initial py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all touch-target-safe cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>CONTINUAR ASISTENCIA</span>
                  </Link>
                  <button
                    onClick={() => handleCerrarClase(item.sesion.id)}
                    disabled={cerrandoSesionId === item.sesion.id}
                    className="py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-400/40 text-xs font-bold rounded-xl transition-all active:scale-98 touch-target-safe cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
                  >
                    <Lock className="w-3 h-3 text-rose-300 shrink-0" />
                    <span>{cerrandoSesionId === item.sesion.id ? "..." : "Cerrar"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. ACCIONES PRINCIPALES: Botones Compactos de Crear Clase y Lista */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Botón Crear Nueva Clase */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl p-2.5 sm:p-3 shadow-md shadow-blue-950/15 flex items-center">
          <button
            onClick={() => setIsCrearClaseOpen(true)}
            className="w-full py-3.5 px-4 bg-white hover:bg-blue-50 active:scale-98 text-[#0F3E86] font-black text-sm rounded-xl shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer touch-target-safe"
          >
            <PlusCircle className="w-5 h-5 text-[#0F3E86]" />
            <span>CREAR NUEVA CLASE</span>
          </button>
        </div>

        {/* Card 2: Botón Crear Nueva Lista de Alumnos */}
        <div className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-2xl p-2.5 sm:p-3 shadow-md shadow-blue-950/15 flex items-center">
          <button
            onClick={() => setIsCrearListaOpen(true)}
            className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/30 active:scale-98 font-black text-sm rounded-xl shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer touch-target-safe"
          >
            <Users className="w-5 h-5 text-cyan-300" />
            <span>CREAR NUEVA LISTA DE ALUMNOS</span>
          </button>
        </div>
      </div>

      {/* Resumen y Gestión de Listas de Alumnos Guardadas */}
      {listasAlumnos.length > 0 && (
        <div className="p-4 sm:p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-xl shadow-blue-950/15 space-y-3.5 relative">
          {/* Header de la Card: Sin botón de nueva lista (pedido expreso del usuario) */}
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Listas de Alumnos Guardadas ({listasAlumnos.length})</span>
          </div>

          {/* Backdrop invisible para cerrar el menú si está abierto al tocar afuera */}
          {menuAbiertoId && (
            <div
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setMenuAbiertoId(null)}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {listasAlumnos.map((lista) => {
              const isMenuOpen = menuAbiertoId === lista.id;

              return (
                <div
                  key={lista.id}
                  className="p-3 bg-[#0A2E65] border border-[#2056A8] hover:border-cyan-400/50 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-sm relative"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {lista.nombre}
                      </span>
                      <span className="font-mono text-[10px] bg-white/15 px-1.5 py-0.2 rounded-md font-bold text-cyan-200 shrink-0">
                        {lista.total_alumnos || lista.alumnos_ids.length}
                      </span>
                    </div>
                    {lista.descripcion && (
                      <p className="text-[11px] text-blue-200 truncate mt-0.5">
                        {lista.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Botón Hamburguesa con Opciones Encapsuladas */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAbiertoId(isMenuOpen ? null : lista.id);
                      }}
                      className={`p-2.5 rounded-xl transition-all cursor-pointer touch-target-safe flex items-center justify-center ${
                        isMenuOpen
                          ? "bg-white text-[#0F3E86] shadow-md scale-105"
                          : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      title="Opciones de la lista"
                      aria-label={`Opciones de la lista ${lista.nombre}`}
                    >
                      <Menu className="w-4 h-4" />
                    </button>

                    {/* Menú Desplegable con Ver, Editar y Eliminar */}
                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-2 z-30 w-44 bg-[#082552] border border-[#2056A8] rounded-2xl shadow-2xl shadow-blue-950/80 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                      >
                        <button
                          onClick={() => {
                            setMenuAbiertoId(null);
                            setListaParaVer(lista);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-cyan-300 shrink-0" />
                          <span>Ver Alumnos</span>
                        </button>

                        <button
                          onClick={() => {
                            setMenuAbiertoId(null);
                            setListaParaEditar(lista);
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 text-blue-300 shrink-0" />
                          <span>Editar Información</span>
                        </button>

                        <div className="my-1 border-t border-[#1E57A8]/80" />

                        <button
                          onClick={() => {
                            setMenuAbiertoId(null);
                            handleEliminarLista(lista);
                          }}
                          disabled={eliminandoListaId === lista.id}
                          className="w-full px-3.5 py-2.5 text-left text-xs text-rose-300 hover:bg-rose-500/20 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Eliminar Lista</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. HISTORIAL DE LAS ÚLTIMAS CLASES (Cards Azules #0F3E86) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0F3E86] border border-[#1E57A8] text-white shadow-xs">
            <History className="w-5 h-5 text-cyan-300" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Historial de Últimas Clases
          </h2>
        </div>

        {/* Backdrop invisible para cerrar el menú de clase si está abierto al tocar afuera */}
        {menuClaseAbiertoId && (
          <div
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setMenuClaseAbiertoId(null)}
          />
        )}

        {ultimasClases.length === 0 ? (
          <div className="p-8 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl text-center space-y-3 shadow-lg">
            <p className="text-sm font-bold text-white">
              Aún no tienes clases registradas en tu historial.
            </p>
            <p className="text-xs text-blue-200 max-w-md mx-auto">
              Utiliza el botón de arriba &quot;Crear Nueva Clase&quot; para seleccionar una lista de alumnos e iniciar el registro de asistencia en el tatami.
            </p>
            <button
              onClick={() => setIsCrearClaseOpen(true)}
              className="px-5 py-2.5 bg-white text-[#0F3E86] text-xs font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            >
              Crear mi primera clase
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {ultimasClases.slice(0, 3).map((item) => {
              const isMenuOpen = menuClaseAbiertoId === item.clase.id;

              return (
                <div
                  key={item.clase.id}
                  className="bg-[#0F3E86] text-white border-2 border-[#1E57A8] hover:border-blue-400 rounded-2xl p-4 shadow-xl shadow-blue-950/20 flex flex-col justify-between gap-3 transition-all relative"
                >
                  {/* Fila Superior: Nombre de la clase + Menú Hamburguesa */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-snug truncate"
                        title={item.clase.nombre}
                      >
                        {item.clase.nombre}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-blue-200 flex-wrap">
                        <span className="font-bold text-cyan-200 bg-white/10 px-2 py-0.5 rounded-md border border-white/15 text-[11px]">
                          {item.fecha || "Tatami"}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-blue-100">
                          <Clock className="w-3 h-3 text-cyan-300" />
                          <span>
                            {formatTime(item.clase.hora_inicio)} - {formatTime(item.clase.hora_fin)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Menú Hamburguesa con Ver Info y Editar Asistencia */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuClaseAbiertoId(isMenuOpen ? null : item.clase.id);
                        }}
                        className={`p-2 rounded-xl transition-all cursor-pointer touch-target-safe flex items-center justify-center ${
                          isMenuOpen
                            ? "bg-white text-[#0F3E86] shadow-md scale-105"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                        title="Opciones de la clase"
                        aria-label={`Opciones de la clase ${item.clase.nombre}`}
                      >
                        <Menu className="w-4 h-4" />
                      </button>

                      {/* Dropdown del menú */}
                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-2 z-30 w-44 bg-[#082552] border border-[#2056A8] rounded-2xl shadow-2xl shadow-blue-950/80 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuClaseAbiertoId(null);
                              setClaseParaVerInfo(item);
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-cyan-300 shrink-0" />
                            <span>Ver Info</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMenuClaseAbiertoId(null);
                              setClaseParaEditar(item);
                            }}
                            className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                          >
                            <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                            <span>Editar Horario / Clase</span>
                          </button>

                          <Link
                            href={`/profesor/clases/${item.clase.id}/asistencia${item.sesion?.id ? `?sesionId=${item.sesion.id}` : ""}`}
                            onClick={() => setMenuClaseAbiertoId(null)}
                            className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-white/10 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4 text-emerald-300 shrink-0" />
                            <span>Editar Asistencia</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila Inferior: Conteo de Asistencia Limpio y Compacto */}
                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-white/15">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-emerald-300 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{item.totalPresentes} presentes</span>
                      </span>
                      {item.totalTardes > 0 && (
                        <span className="flex items-center gap-1 text-amber-300 font-bold text-xs bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>({item.totalTardes} tarde)</span>
                        </span>
                      )}
                      <span className="text-blue-200/90 text-xs font-medium">
                        {item.totalAusentes} ausentes
                      </span>
                    </div>

                    <span className="text-blue-100 font-bold flex items-center gap-1 text-xs">
                      <Users className="w-3.5 h-3.5 text-cyan-300" />
                      <span>{item.totalInscriptos}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. BOTÓN: VER TODO EL HISTORIAL */}
        <div className="pt-2 flex justify-center">
          <Link
            href="/profesor/historial"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#0F3E86] hover:bg-[#144EAA] text-white border-2 border-[#1E57A8] rounded-2xl font-black text-sm shadow-xl shadow-blue-950/20 flex items-center justify-center gap-2.5 transition-all hover:scale-101 active:scale-98 touch-target-safe cursor-pointer"
          >
            <History className="w-4 h-4 text-cyan-300" />
            <span>VER TODO EL HISTORIAL DE CLASES</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </Link>
        </div>
      </section>

      {/* Modales */}
      <ModalCrearClaseProfesor
        isOpen={isCrearClaseOpen}
        onClose={() => setIsCrearClaseOpen(false)}
        listasDisponibles={listasAlumnos}
        onOpenCrearLista={() => {
          setIsCrearClaseOpen(false);
          setIsCrearListaOpen(true);
        }}
        profesorId={currentUser.id}
        onClaseCreada={handleClaseCreada}
      />

      <ModalCrearListaAlumnos
        isOpen={isCrearListaOpen}
        onClose={() => setIsCrearListaOpen(false)}
        alumnosDisponibles={alumnos}
        currentUser={currentUser}
        profesoresDisponibles={profesoresDisponibles}
        onListaCreada={(nuevaLista) => {
          handleListaCreada(nuevaLista);
          setIsCrearClaseOpen(true);
        }}
        onAlumnoCreado={handleAlumnoCreado}
      />

      {/* Modal para Ver Detalles de Alumnos de la Lista */}
      <ModalVerListaAlumnos
        isOpen={!!listaParaVer}
        lista={listaParaVer}
        alumnosDisponibles={alumnos}
        onClose={() => setListaParaVer(null)}
        onEditar={(lista) => {
          setListaParaVer(null);
          setListaParaEditar(lista);
        }}
      />

      {/* Modal para Editar Nombre, Descripción, Alumnos y Cinturones */}
      <ModalEditarListaAlumnos
        isOpen={!!listaParaEditar}
        lista={listaParaEditar}
        alumnosDisponibles={alumnos}
        currentUser={currentUser}
        profesoresDisponibles={profesoresDisponibles}
        onClose={() => setListaParaEditar(null)}
        onListaActualizada={(listaActualizada) => {
          handleListaActualizada(listaActualizada);
          setListaParaEditar(null);
        }}
        onAlumnoCreado={handleAlumnoCreado}
      />

      {/* Modal para Sumar Alumno a Clase Abierta (Padrón General o Alta Rápida) */}
      {claseParaInscribir && (
        <ModalInscribirAlumno
          isOpen={!!claseParaInscribir}
          onClose={() => setClaseParaInscribir(null)}
          claseId={claseParaInscribir.clase.id}
          claseNombre={claseParaInscribir.clase.nombre}
          sesionId={claseParaInscribir.sesion.id}
          alumnosDisponibles={alumnos}
          onAlumnoInscripto={(nuevoAlumno) => {
            handleAlumnoCreado(nuevoAlumno);
            setClasesAbiertas((prev) =>
              prev.map((c) =>
                c.sesion.id === claseParaInscribir.sesion.id
                  ? {
                      ...c,
                      totalCount: (c.totalCount || 0) + 1,
                      presentesCount: (c.presentesCount || 0) + 1,
                    }
                  : c
              )
            );
          }}
        />
      )}

      {/* Modal para Ver Info Completa de Clase Cerrada */}
      <ModalVerClaseInfo
        isOpen={!!claseParaVerInfo}
        item={claseParaVerInfo}
        onClose={() => setClaseParaVerInfo(null)}
      />

      {/* Modal para Editar Horario/Datos de Clase del Historial */}
      <ModalEditarClaseHistorial
        isOpen={!!claseParaEditar}
        item={claseParaEditar}
        profesoresDisponibles={profesoresDisponibles}
        onClose={() => setClaseParaEditar(null)}
        onClaseActualizada={(itemActualizado) => {
          setUltimasClases((prev) =>
            prev.map((it) =>
              it.clase.id === itemActualizado.clase.id ? itemActualizado : it
            )
          );
          setClaseParaEditar(null);
          router.refresh();
        }}
      />
    </div>
  );
}
