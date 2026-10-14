"use server";

import { revalidatePath } from "next/cache";
import {
  clearSessionCookie,
  DEMO_USERS,
  setSessionUserCookie,
} from "@/lib/auth/session";
import { UserRole } from "@/types";

export async function switchDemoRoleAction(role: UserRole) {
  const user = DEMO_USERS[role];
  if (user) {
    await setSessionUserCookie(user);
  }

  revalidatePath("/", "layout");
  return { success: true, role, user };
}

export async function logoutAction() {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  return { success: true };
}
