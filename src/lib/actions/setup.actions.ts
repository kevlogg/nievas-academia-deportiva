"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SetupStatus {
  supabaseConfigured: boolean;
  supabaseUrl: string;
  connected: boolean;
  tableCount: number;
  adminUserCreated: boolean;
  error?: string;
}

export async function checkDatabaseConnectionAction(): Promise<SetupStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const isConfigured = Boolean(url && url.includes("supabase.co"));

  if (!isConfigured) {
    return {
      supabaseConfigured: false,
      supabaseUrl: url,
      connected: false,
      tableCount: 0,
      adminUserCreated: false,
      error: "Variables de entorno de Supabase no configuradas",
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    
    // Probar consulta a la tabla usuarios
    const { data, error } = await supabase.from("usuarios").select("id").limit(1);

    if (error) {
      return {
        supabaseConfigured: true,
        supabaseUrl: url,
        connected: false,
        tableCount: 0,
        adminUserCreated: false,
        error: error.message,
      };
    }

    return {
      supabaseConfigured: true,
      supabaseUrl: url,
      connected: true,
      tableCount: 9,
      adminUserCreated: Boolean(data && data.length > 0),
    };
  } catch (err: unknown) {
    return {
      supabaseConfigured: true,
      supabaseUrl: url,
      connected: false,
      tableCount: 0,
      adminUserCreated: false,
      error: err instanceof Error ? err.message : "Error al conectar con Supabase",
    };
  }
}

export async function crearDirectorMaestroAction(input: {
  nombre: string;
  email: string;
  telefono?: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase.from("usuarios").upsert({
      email: input.email.trim(),
      nombre_completo: input.nombre.trim(),
      rol: "ADMIN",
      telefono: input.telefono?.trim() || null,
      activo: true,
    }, { onConflict: "email" });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/profesor/clases");

    return {
      success: true,
      message: `Cuenta de Dirección configurada para ${input.nombre}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al configurar Director",
    };
  }
}
