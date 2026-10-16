import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole, Usuario } from "@/types";

export const SESSION_COOKIE_NAME = "nievas_session_user";
export const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24 * 7; // 7 días estándar
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 365; // 1 año para tatami táctil / dispositivo personal

export const DEMO_USERS: Record<UserRole, Usuario> = {
  ADMIN: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "francisco.nievas@nievasacademia.com",
    rol: "ADMIN",
    nombre_completo: "Francisco Nievas",
    telefono: "+54 9 11 5555-0101",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  PROFESOR: {
    id: "22222222-2222-2222-2222-222222222222",
    email: "sensei.benitez@nievasacademia.com",
    rol: "PROFESOR",
    nombre_completo: "Sensei Lucas Benítez",
    telefono: "+54 9 11 5555-0202",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
  },
};

/**
 * Obtener el usuario autenticado desde la cookie segura
 */
export async function getCurrentUser(): Promise<Usuario | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    try {
      const parsed = JSON.parse(sessionCookie.value) as Usuario;
      if (parsed.id && parsed.rol && parsed.email) {
        return parsed;
      }
    } catch {
      // Cookie corrupta
    }
  }

  return null;
}

/**
 * Requiere que el usuario esté autenticado. Si no, redirige inmediatamente a /login.
 */
export async function requireAuth(): Promise<Usuario> {
  const user = await getCurrentUser();
  if (!user || !user.activo) {
    redirect("/login");
  }
  return user;
}

/**
 * Requiere que el usuario tenga uno de los roles autorizados.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<Usuario> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.rol)) {
    if (user.rol === "PROFESOR") {
      redirect("/profesor/clases");
    } else {
      redirect("/admin/dashboard");
    }
  }
  return user;
}

/**
 * Requiere rol de Dirección / Admin (Francisco Nievas)
 */
export async function requireAdmin(): Promise<Usuario> {
  return requireRole(["ADMIN"]);
}

/**
 * Requiere rol de Profesor o Admin para gestión de tatami
 */
export async function requireProfesor(): Promise<Usuario> {
  return requireRole(["PROFESOR", "ADMIN"]);
}

/**
 * Guardar sesión en cookie segura
 */
export async function setSessionUserCookie(
  user: Usuario,
  maxAge: number = SESSION_MAX_AGE_DEFAULT
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/**
 * Limpiar la sesión al cerrar sesión
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
