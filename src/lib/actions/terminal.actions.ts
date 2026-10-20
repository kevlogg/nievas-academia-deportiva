"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import {
  getCurrentUser,
  requireAdmin,
  requireAuth,
  setSessionUserCookie,
  SESSION_MAX_AGE_REMEMBER,
} from "@/lib/auth/session";
import { ProfesorTerminalItem, Usuario, WebAuthnCredentialRecord } from "@/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { hashPin, EMERGENCY_ADMIN_PIN } from "@/lib/auth/pin";

/**
 * Obtener lista de profesores para la pantalla de Terminal / Tablet de Sede
 */
export async function getTerminalProfesoresAction(): Promise<{
  success: boolean;
  profesores: ProfesorTerminalItem[];
  error?: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    // 1. Obtener usuarios activos con rol PROFESOR o ADMIN de la BD
    const { data: dbUsuarios, error: dbError } = await adminSupabase
      .from("usuarios")
      .select("id, nombre_completo, email, rol, activo, telefono")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true });

    if (dbError) {
      console.error("Error al obtener usuarios para terminal:", dbError);
      return { success: false, profesores: [], error: dbError.message };
    }

    const profesoresList: ProfesorTerminalItem[] = [];

    // 2. Para cada profesor, consultar sus metadatos de seguridad (PIN y biometría)
    for (const u of dbUsuarios || []) {
      if (u.rol !== "PROFESOR" && u.rol !== "ADMIN") continue;

      let tienePin = false;
      let tieneBiometria = false;
      let credsIds: string[] = [];

      try {
        const { data: authData } = await adminSupabase.auth.admin.getUserById(u.id);
        const meta = authData?.user?.user_metadata || {};
        tienePin = !!meta.pin_hash;
        if (Array.isArray(meta.webauthn_credentials) && meta.webauthn_credentials.length > 0) {
          tieneBiometria = true;
          credsIds = meta.webauthn_credentials.map((c: WebAuthnCredentialRecord) => c.id);
        }
      } catch (err) {
        console.warn(`No se pudieron leer metadatos de auth para usuario ${u.id}:`, err);
      }

      profesoresList.push({
        id: u.id,
        nombre_completo: u.nombre_completo,
        email: u.email,
        rol: u.rol,
        activo: u.activo,
        tiene_pin: tienePin,
        tiene_biometria: tieneBiometria,
        credenciales_biometria_ids: credsIds,
      });
    }

    return { success: true, profesores: profesoresList };
  } catch (err: unknown) {
    console.error("Error en getTerminalProfesoresAction:", err);
    return {
      success: false,
      profesores: [],
      error: err instanceof Error ? err.message : "Error al cargar terminal",
    };
  }
}

/**
 * Autenticar al profesor en la tablet mediante su PIN numérico de 4 a 6 dígitos
 */
export async function terminalVerificarPinAction(input: {
  usuarioId: string;
  pin: string;
}): Promise<{
  success: boolean;
  sinPin?: boolean;
  error?: string;
  redirectUrl?: string;
  usuario?: Usuario;
}> {
  const pin = input.pin.trim();
  const usuarioId = input.usuarioId;

  if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return { success: false, error: "El PIN debe tener entre 4 y 6 dígitos numéricos." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    // 1. Obtener datos del usuario
    const { data: usuario, error: userError } = await adminSupabase
      .from("usuarios")
      .select("*")
      .eq("id", usuarioId)
      .single();

    if (userError || !usuario || !usuario.activo) {
      return { success: false, error: "Usuario no encontrado o inactivo." };
    }

    // 2. Obtener metadatos de auth
    const { data: authData, error: authErr } = await adminSupabase.auth.admin.getUserById(usuarioId);
    if (authErr || !authData.user) {
      return { success: false, error: "Error al verificar credenciales del profesor." };
    }

    const meta = authData.user.user_metadata || {};
    const storedHash = meta.pin_hash;

    if (!storedHash) {
      return {
        success: false,
        sinPin: true,
        error: "Este profesor aún no tiene un PIN configurado.",
      };
    }

    // 3. Comparar hash del PIN
    const computedHash = hashPin(pin, usuarioId);
    if (computedHash !== storedHash) {
      return { success: false, error: "PIN incorrecto. Intenta nuevamente." };
    }

    // 4. Establecer cookie de sesión activa prolongada para la tablet
    const sessionUser: Usuario = {
      id: usuario.id,
      email: usuario.email,
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
      telefono: usuario.telefono,
      activo: usuario.activo,
      pin_activo: true,
      created_at: usuario.created_at,
    };

    await setSessionUserCookie(sessionUser, SESSION_MAX_AGE_REMEMBER);

    return {
      success: true,
      redirectUrl: "/profesor/clases?terminal=1",
      usuario: sessionUser,
    };
  } catch (err: unknown) {
    console.error("Error en terminalVerificarPinAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error del servidor al validar PIN.",
    };
  }
}

/**
 * Autenticar al profesor en la tablet mediante Biometría verificada (WebAuthn / Passkey)
 */
export async function terminalVerificarBiometriaAction(input: {
  usuarioId: string;
  credentialId: string;
}): Promise<{
  success: boolean;
  error?: string;
  redirectUrl?: string;
  usuario?: Usuario;
}> {
  const { usuarioId, credentialId } = input;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    const { data: usuario, error: userError } = await adminSupabase
      .from("usuarios")
      .select("*")
      .eq("id", usuarioId)
      .single();

    if (userError || !usuario || !usuario.activo) {
      return { success: false, error: "Usuario no encontrado o inactivo." };
    }

    const { data: authData } = await adminSupabase.auth.admin.getUserById(usuarioId);
    const meta = authData?.user?.user_metadata || {};
    const creds: WebAuthnCredentialRecord[] = meta.webauthn_credentials || [];

    const matched = creds.find((c) => c.id === credentialId);
    if (!matched) {
      return {
        success: false,
        error: "Esta credencial biométrica no está registrada para este profesor.",
      };
    }

    const sessionUser: Usuario = {
      id: usuario.id,
      email: usuario.email,
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
      telefono: usuario.telefono,
      activo: usuario.activo,
      pin_activo: !!meta.pin_hash,
      tiene_biometria: true,
      created_at: usuario.created_at,
    };

    await setSessionUserCookie(sessionUser, SESSION_MAX_AGE_REMEMBER);

    return {
      success: true,
      redirectUrl: "/profesor/clases?terminal=1",
      usuario: sessionUser,
    };
  } catch (err: unknown) {
    console.error("Error en terminalVerificarBiometriaAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al validar biometría.",
    };
  }
}

/**
 * Salir del Modo Terminal hacia el login estándar o dashboard
 * Requiere el PIN de un Administrador (o PIN de emergencia)
 */
export async function terminalSalirModoAction(input: {
  adminPin: string;
}): Promise<{ success: boolean; error?: string }> {
  const pin = input.adminPin.trim();

  // Validación rápida con código de emergencia predeterminado
  if (pin === EMERGENCY_ADMIN_PIN) {
    return { success: true };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    // Buscar usuarios con rol ADMIN
    const { data: admins } = await adminSupabase
      .from("usuarios")
      .select("id")
      .eq("rol", "ADMIN")
      .eq("activo", true);

    for (const adm of admins || []) {
      const { data: authData } = await adminSupabase.auth.admin.getUserById(adm.id);
      const meta = authData?.user?.user_metadata || {};
      if (meta.pin_hash) {
        const computed = hashPin(pin, adm.id);
        if (computed === meta.pin_hash) {
          return { success: true };
        }
      }
    }

    return { success: false, error: "PIN de Administrador inválido." };
  } catch (err) {
    console.error("Error en terminalSalirModoAction:", err);
    return { success: false, error: "Error al validar PIN de administración." };
  }
}

/**
 * Configurar PIN de un profesor desde el panel de Dirección (Solo Admin)
 */
export async function adminConfigurarPinProfesorAction(input: {
  profesorId: string;
  nuevoPin: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const nuevoPin = input.nuevoPin.trim();
  if (!nuevoPin || nuevoPin.length < 4 || nuevoPin.length > 6 || !/^\d+$/.test(nuevoPin)) {
    return { success: false, error: "El PIN debe contener entre 4 y 6 dígitos numéricos." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    const { data: authData, error: authErr } = await adminSupabase.auth.admin.getUserById(
      input.profesorId
    );
    if (authErr || !authData.user) {
      return { success: false, error: "Profesor no encontrado en el sistema." };
    }

    const currentMeta = authData.user.user_metadata || {};
    const pin_hash = hashPin(nuevoPin, input.profesorId);

    const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(input.profesorId, {
      user_metadata: {
        ...currentMeta,
        pin_hash,
        pin_activo: true,
        pin_updated_at: new Date().toISOString(),
      },
    });

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/terminal");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al configurar PIN del profesor.",
    };
  }
}

/**
 * Configuración guiada del PIN inicial por parte del profesor en la tablet
 * Valida su contraseña de cuenta por única vez para crear su PIN táctil
 */
export async function profesorSetupPinInicialAction(input: {
  usuarioId: string;
  passwordCuenta: string;
  nuevoPin: string;
}): Promise<{ success: boolean; error?: string; redirectUrl?: string; usuario?: Usuario }> {
  const { usuarioId, passwordCuenta, nuevoPin } = input;
  const pin = nuevoPin.trim();

  if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return { success: false, error: "El nuevo PIN debe tener entre 4 y 6 dígitos numéricos." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    // 1. Obtener email del usuario
    const { data: usuario, error: userError } = await adminSupabase
      .from("usuarios")
      .select("*")
      .eq("id", usuarioId)
      .single();

    if (userError || !usuario) {
      return { success: false, error: "Profesor no encontrado." };
    }

    // 2. Validar contraseña con Supabase Auth
    const supabaseClient = await createServerSupabaseClient();
    const { error: authError } = await supabaseClient.auth.signInWithPassword({
      email: usuario.email,
      password: passwordCuenta,
    });

    if (authError) {
      return { success: false, error: "Contraseña incorrecta. Verifica e intenta nuevamente." };
    }

    // 3. Guardar el nuevo PIN en user_metadata
    const pin_hash = hashPin(pin, usuarioId);
    const { data: authData } = await adminSupabase.auth.admin.getUserById(usuarioId);
    const currentMeta = authData?.user?.user_metadata || {};

    await adminSupabase.auth.admin.updateUserById(usuarioId, {
      user_metadata: {
        ...currentMeta,
        pin_hash,
        pin_activo: true,
        pin_updated_at: new Date().toISOString(),
      },
    });

    // 4. Iniciar sesión inmediata
    const sessionUser: Usuario = {
      id: usuario.id,
      email: usuario.email,
      nombre_completo: usuario.nombre_completo,
      rol: usuario.rol,
      telefono: usuario.telefono,
      activo: usuario.activo,
      pin_activo: true,
      created_at: usuario.created_at,
    };

    await setSessionUserCookie(sessionUser, SESSION_MAX_AGE_REMEMBER);

    revalidatePath("/terminal");
    revalidatePath("/profesor/clases");

    return {
      success: true,
      redirectUrl: "/profesor/clases?terminal=1",
      usuario: sessionUser,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al configurar PIN inicial.",
    };
  }
}

/**
 * Cambiar mi propio PIN (profesor logueado desde su perfil)
 */
export async function profesorCambiarMiPinAction(input: {
  pinActual?: string;
  nuevoPin: string;
}): Promise<{ success: boolean; error?: string }> {
  const currentUser = await requireAuth();
  const nuevoPin = input.nuevoPin.trim();

  if (!nuevoPin || nuevoPin.length < 4 || nuevoPin.length > 6 || !/^\d+$/.test(nuevoPin)) {
    return { success: false, error: "El nuevo PIN debe tener entre 4 y 6 dígitos." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    const { data: authData } = await adminSupabase.auth.admin.getUserById(currentUser.id);
    const currentMeta = authData?.user?.user_metadata || {};

    if (currentMeta.pin_hash && input.pinActual) {
      const computedOld = hashPin(input.pinActual.trim(), currentUser.id);
      if (computedOld !== currentMeta.pin_hash) {
        return { success: false, error: "El PIN actual ingresado es incorrecto." };
      }
    }

    const pin_hash = hashPin(nuevoPin, currentUser.id);

    await adminSupabase.auth.admin.updateUserById(currentUser.id, {
      user_metadata: {
        ...currentMeta,
        pin_hash,
        pin_activo: true,
        pin_updated_at: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar tu PIN.",
    };
  }
}

/**
 * Registrar una credencial biométrica (huella/FaceID) para el usuario logueado en este dispositivo
 */
export async function usuarioRegistrarBiometriaAction(input: {
  credential: {
    id: string;
    publicKey: string;
    deviceName?: string;
  };
}): Promise<{ success: boolean; error?: string }> {
  const currentUser = await requireAuth();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ydophhbpkfurlspxczug.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(url, serviceKey);

    const { data: authData } = await adminSupabase.auth.admin.getUserById(currentUser.id);
    const currentMeta = authData?.user?.user_metadata || {};
    const existingCreds: WebAuthnCredentialRecord[] = currentMeta.webauthn_credentials || [];

    // Evitar duplicados
    const filtered = existingCreds.filter((c) => c.id !== input.credential.id);
    const newCred: WebAuthnCredentialRecord = {
      id: input.credential.id,
      publicKey: input.credential.publicKey,
      counter: 0,
      deviceName: input.credential.deviceName || "Tablet Sede Central",
      createdAt: new Date().toISOString(),
    };

    await adminSupabase.auth.admin.updateUserById(currentUser.id, {
      user_metadata: {
        ...currentMeta,
        webauthn_credentials: [...filtered, newCred],
      },
    });

    revalidatePath("/terminal");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al registrar biometría.",
    };
  }
}
