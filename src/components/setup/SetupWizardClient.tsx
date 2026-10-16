"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { checkDatabaseConnectionAction, crearDirectorMaestroAction, SetupStatus } from "@/lib/actions/setup.actions";

export function SetupWizardClient() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Formulario Director
  const [directorNombre, setDirectorNombre] = useState("Francisco Nievas");
  const [directorEmail, setDirectorEmail] = useState("francisco.nievas@nievasacademia.com");
  const [directorTelefono, setDirectorTelefono] = useState("+54 9 11 5555-0101");
  const [guardandoDirector, setGuardandoDirector] = useState(false);
  const [mensajeDirector, setMensajeDirector] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    const res = await checkDatabaseConnectionAction();
    setStatus(res);
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleCopySql = () => {
    const sqlText = `-- NIEVAS ACADEMIA DEPORTIVA - SCHEMA SQL
-- Ejecuta este script en: https://supabase.com/dashboard/project/ydophhbpkfurlspxczug/sql/new

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'PROFESOR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE cinturon_karate AS ENUM ('Blanco', 'Blanco/Amarillo', 'Amarillo', 'Naranja', 'Verde', 'Azul', 'Marrón', 'Negro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE estado_alumno AS ENUM ('ACTIVO', 'INACTIVO'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE estado_sesion AS ENUM ('ABIERTA', 'FINALIZADA'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE estado_asistencia AS ENUM ('PRESENTE', 'AUSENTE', 'TARDE'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    rol rol_usuario NOT NULL DEFAULT 'PROFESOR',
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL DEFAULT '2015-01-01',
    telefono_contacto TEXT NOT NULL DEFAULT 'Sin registrar',
    contacto_emergencia TEXT NOT NULL DEFAULT 'Sin registrar',
    cinturon_actual cinturon_karate NOT NULL DEFAULT 'Blanco',
    estado estado_alumno NOT NULL DEFAULT 'ACTIVO',
    notas_privadas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.listas_alumnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.lista_alumnos_items (
    lista_id UUID NOT NULL REFERENCES public.listas_alumnos(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (lista_id, alumno_id)
);

CREATE TABLE IF NOT EXISTS public.clases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    profesor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    dias_semana INTEGER[] NOT NULL DEFAULT ARRAY[1, 3, 5],
    hora_inicio TIME NOT NULL DEFAULT '18:00:00',
    hora_fin TIME NOT NULL DEFAULT '19:15:00',
    cupo_maximo INTEGER NOT NULL DEFAULT 30,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_clase_alumno UNIQUE (clase_id, alumno_id)
);

CREATE TABLE IF NOT EXISTS public.sesiones_clase (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    profesor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_apertura TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    estado estado_sesion NOT NULL DEFAULT 'ABIERTA',
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_id UUID NOT NULL REFERENCES public.sesiones_clase(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    estado estado_asistencia NOT NULL DEFAULT 'AUSENTE',
    es_recuperacion BOOLEAN NOT NULL DEFAULT false,
    marcado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_sesion_alumno UNIQUE (sesion_id, alumno_id)
);

CREATE TABLE IF NOT EXISTS public.historial_graduaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    cinturon cinturon_karate NOT NULL,
    fecha_graduacion DATE NOT NULL DEFAULT CURRENT_DATE,
    graduado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_alumnos_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_graduaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura usuarios" ON public.usuarios FOR ALL USING (true);
CREATE POLICY "Gestion alumnos" ON public.alumnos FOR ALL USING (true);
CREATE POLICY "Gestion listas" ON public.listas_alumnos FOR ALL USING (true);
CREATE POLICY "Gestion items listas" ON public.lista_alumnos_items FOR ALL USING (true);
CREATE POLICY "Gestion clases" ON public.clases FOR ALL USING (true);
CREATE POLICY "Gestion inscripciones" ON public.inscripciones FOR ALL USING (true);
CREATE POLICY "Gestion sesiones" ON public.sesiones_clase FOR ALL USING (true);
CREATE POLICY "Gestion asistencias" ON public.asistencias FOR ALL USING (true);
CREATE POLICY "Gestion graduaciones" ON public.historial_graduaciones FOR ALL USING (true);
`;

    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCrearDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoDirector(true);
    setMensajeDirector(null);

    const res = await crearDirectorMaestroAction({
      nombre: directorNombre,
      email: directorEmail,
      telefono: directorTelefono,
    });

    setGuardandoDirector(false);
    if (res.success) {
      setMensajeDirector("¡Cuenta de Dirección configurada exitosamente!");
      checkStatus();
    } else {
      setMensajeDirector(res.error || "No se pudo crear la cuenta de Dirección");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Banner Principal */}
      <div className="p-4 sm:p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white border border-white shadow-md shrink-0">
            <Image
              src="/nievas-logo.jpg"
              alt="Logo Nievas"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Asistente de Conexión a Base de Datos
            </h1>
            <p className="text-xs text-blue-200 font-medium">
              Nievas Academia Deportiva • Configuración de Supabase & Cuenta Maestra de Dirección
            </p>
          </div>
        </div>

        <button
          onClick={checkStatus}
          disabled={loading}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all cursor-pointer"
          title="Refrescar estado"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Grid de Estado y Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Estado de Conexión Supabase */}
        <div className="p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-md space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-300" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  Base de Datos Supabase
                </h2>
              </div>

              {loading ? (
                <span className="text-[11px] font-bold text-blue-200">Verificando...</span>
              ) : status?.connected ? (
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Conectado
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Pendiente de Tablas
                </span>
              )}
            </div>

            <div className="p-3 bg-[#0A2E65] border border-[#2056A8] rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-blue-200">
                <span>Proyecto Supabase:</span>
                <span className="font-mono text-cyan-300 font-bold truncate max-w-[180px]">
                  ydophhbpkfurlspxczug
                </span>
              </div>
              <div className="flex justify-between text-blue-200">
                <span>Motor:</span>
                <span className="text-white font-bold">PostgreSQL 15</span>
              </div>
              <div className="flex justify-between text-blue-200">
                <span>Estado de Datos:</span>
                <span className="text-emerald-300 font-bold">100% Limpio (Sin datos ficticios)</span>
              </div>
            </div>

            <p className="text-xs text-blue-200 leading-relaxed">
              Si es la primera vez que inicializas Supabase, copia el script SQL y pégalo en el SQL Editor de tu panel de Supabase.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#1E57A8]">
            <button
              onClick={handleCopySql}
              className="w-full py-2.5 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4 text-[#0F3E86]" />
              <span>{copied ? "¡Script SQL Copiado al Portapapeles!" : "Copiar Script SQL Completo (schema.sql)"}</span>
            </button>

            <a
              href="https://supabase.com/dashboard/project/ydophhbpkfurlspxczug/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-cyan-300 font-bold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Abrir SQL Editor en Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Card 2: Cuenta Maestra de Dirección (Francisco Nievas) */}
        <div className="p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-md space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Cuenta Maestra de Dirección
            </h2>
          </div>

          <form onSubmit={handleCrearDirector} className="space-y-3 text-xs">
            {mensajeDirector && (
              <div className="p-2.5 bg-cyan-950/80 border border-cyan-500 text-cyan-200 rounded-xl font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>{mensajeDirector}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-blue-200">Nombre del Sensei Director</label>
              <input
                type="text"
                required
                value={directorNombre}
                onChange={(e) => setDirectorNombre(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white font-semibold focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-blue-200">Email Oficial de Dirección</label>
              <input
                type="email"
                required
                value={directorEmail}
                onChange={(e) => setDirectorEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white font-semibold focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-blue-200">Teléfono de Contacto</label>
              <input
                type="text"
                value={directorTelefono}
                onChange={(e) => setDirectorTelefono(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A2E65] border border-[#2056A8] rounded-xl text-white font-semibold focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>

            <button
              type="submit"
              disabled={guardandoDirector}
              className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>{guardandoDirector ? "Guardando..." : "Confirmar Cuenta de Dirección"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Botón para Ir Directo al Tatami */}
      <div className="p-5 bg-[#0F3E86] text-white border-2 border-[#1E57A8] rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-white">
            ¿Listo para iniciar la jornada en el Tatami?
          </h3>
          <p className="text-xs text-blue-200 font-medium">
            Comienza a crear tus clases y listas de alumnos en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors"
          >
            Ir a Dirección
          </Link>

          <Link
            href="/profesor/clases"
            className="px-5 py-2.5 bg-white hover:bg-blue-50 text-[#0F3E86] font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
          >
            <span>Entrar a Mis Clases</span>
            <ArrowRight className="w-4 h-4 text-[#0F3E86]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
