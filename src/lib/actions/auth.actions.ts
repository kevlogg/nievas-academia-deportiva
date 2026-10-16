"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  DEMO_USERS,
  getCurrentUser,
  requireAdmin,
  SESSION_MAX_AGE_DEFAULT,
  SESSION_MAX_AGE_REMEMBER,
  setSessionUserCookie,
} from "@/lib/auth/session";
import { UserRole, Usuario } from "@/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Iniciar sesión con email y contraseña contra Supabase Auth
 */
export async function loginAction(formData: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  const email = formData.email.trim().toLowerCase();
  const password = formData.password;

  if (!email || !password) {
    return { success: false, error: "Por favor ingresa tu email y contraseña." };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // 1. Validar credenciales con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: "Credenciales incorrectas. Verifica tu correo y contraseña.",
      };
    }

    // 2. Obtener el perfil del usuario desde public.usuarios
    let { data: usuario, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (!usuario) {
      // Búsqueda por email en caso de que coincida por correo
      const { data: userByEmail } = await supabase
        .from("usuarios")
        .select("*")
        .eq("email", email)
        .single();
      usuario = userByEmail;
    }

    if (!usuario || !usuario.activo) {
      return {
        success: false,
        error: "Esta cuenta se encuentra inactiva. Comunícate con Dirección.",
      };
    }

    // 3. Guardar sesión en cookie segura
    const maxAge = formData.rememberMe
      ? SESSION_MAX_AGE_REMEMBER
      : SESSION_MAX_AGE_DEFAULT;

    await setSessionUserCookie(usuario as Usuario, maxAge);

    const redirectUrl = usuario.rol === "ADMIN" ? "/admin/dashboard" : "/profesor/clases";
    return { success: true, redirectUrl };
  } catch (err: unknown) {
    console.error("Error en loginAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al conectar con el servidor de autenticación.",
    };
  }
}

/**
 * Cerrar sesión y redirigir al login
 */
export async function logoutAction() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Error en signOut de Supabase:", err);
  }

  await clearSessionCookie();
  redirect("/login");
}

/**
 * Atajo para cambiar de usuario durante pruebas o tatami
 */
export async function switchDemoRoleAction(role: UserRole) {
  const user = DEMO_USERS[role];
  if (user) {
    await setSessionUserCookie(user);
  }

  revalidatePath("/", "layout");
  return { success: true, role, user };
}

/**
 * Registrar un nuevo profesor (Solo Dirección / Admin)
 */
export async function crearProfesorAction(input: {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    // 1. Crear en auth.users con confirmación automática
    const { data: authUser, error: authErr } = await adminSupabase.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: input.nombre.trim(),
        rol: "PROFESOR",
      },
    });

    if (authErr) {
      return { success: false, error: authErr.message };
    }

    // 2. Insertar en public.usuarios
    const { error: dbErr } = await adminSupabase.from("usuarios").upsert({
      id: authUser.user.id,
      email: input.email.trim().toLowerCase(),
      nombre_completo: input.nombre.trim(),
      rol: "PROFESOR",
      telefono: input.telefono?.trim() || null,
      activo: true,
    }, { onConflict: "email" });

    if (dbErr) {
      return { success: false, error: dbErr.message };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/profesor/clases");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al registrar profesor",
    };
  }
}

/**
 * Registrar un nuevo usuario (Sensei Profesor o Dirección / Admin)
 * y autenticarlo inmediatamente con sesión activa
 */
export async function registerAction(input: {
  nombreCompleto: string;
  email: string;
  password: string;
  rol: UserRole;
  rememberMe?: boolean;
}): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  const nombreCompleto = input.nombreCompleto.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const rol = input.rol || "PROFESOR";

  if (!nombreCompleto || nombreCompleto.length < 3) {
    return { success: false, error: "Por favor ingresa tu nombre completo (mínimo 3 caracteres)." };
  }
  if (!email || !email.includes("@")) {
    return { success: false, error: "Por favor ingresa un correo electrónico válido." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    // 1. Crear en auth.users con confirmación automática
    const { data: authUser, error: authErr } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: nombreCompleto,
        rol,
      },
    });

    if (authErr) {
      if (
        authErr.message.toLowerCase().includes("already registered") ||
        authErr.message.toLowerCase().includes("duplicate") ||
        authErr.message.toLowerCase().includes("exists")
      ) {
        return {
          success: false,
          error: "Ya existe una cuenta con este correo electrónico. Por favor inicia sesión.",
        };
      }
      return { success: false, error: authErr.message };
    }

    if (!authUser.user) {
      return { success: false, error: "No se pudo crear el usuario en el sistema de autenticación." };
    }

    // 2. Insertar en public.usuarios
    const { error: dbErr } = await adminSupabase.from("usuarios").upsert(
      {
        id: authUser.user.id,
        email,
        nombre_completo: nombreCompleto,
        rol,
        activo: true,
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    if (dbErr) {
      console.error("Error al guardar en tabla usuarios:", dbErr);
    }

    // 3. Crear el objeto de usuario y guardarlo en la cookie de sesión
    const usuario: Usuario = {
      id: authUser.user.id,
      email,
      nombre_completo: nombreCompleto,
      rol,
      activo: true,
      created_at: new Date().toISOString(),
    };

    const maxAge = input.rememberMe ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT;
    await setSessionUserCookie(usuario, maxAge);

    revalidatePath("/admin/dashboard");
    revalidatePath("/profesor/clases");

    const redirectUrl = rol === "ADMIN" ? "/admin/dashboard" : "/profesor/clases";
    return { success: true, redirectUrl };
  } catch (err: unknown) {
    console.error("Error en registerAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al registrar la cuenta",
    };
  }
}

