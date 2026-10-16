import { cookies } from "next/headers";
import { UserRole, Usuario } from "@/types";

export const SESSION_COOKIE_NAME = "nievas_session_user";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días para tatami táctil

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

export async function getCurrentUser(): Promise<Usuario> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    try {
      const parsed = JSON.parse(sessionCookie.value) as Usuario;
      if (parsed.id && parsed.rol) {
        return parsed;
      }
    } catch {
      // Si la cookie está corrupta, fallback a default
    }
  }

  // Por defecto iniciamos con Francisco Nievas (Dirección / Headmaster)
  return DEMO_USERS.ADMIN;
}

export async function requireAuth(): Promise<Usuario> {
  const user = await getCurrentUser();
  if (!user || !user.activo) {
    throw new Error("No autenticado o usuario inactivo en Nievas Academia Deportiva");
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<Usuario> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.rol)) {
    throw new Error(
      `Acceso no autorizado. Se requiere rol [${allowedRoles.join(", ")}], pero tienes [${user.rol}]`
    );
  }
  return user;
}

export async function requireAdmin(): Promise<Usuario> {
  return requireRole(["ADMIN"]);
}

export async function requireProfesor(): Promise<Usuario> {
  return requireRole(["PROFESOR", "ADMIN"]);
}

export async function setSessionUserCookie(user: Usuario): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
