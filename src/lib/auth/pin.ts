import crypto from "crypto";

const PIN_SALT = process.env.PIN_SECRET_SALT || "nievas_tatami_kiosk_secret_salt_2026";
export const EMERGENCY_ADMIN_PIN = "0000";

/**
 * Función criptográfica segura para generar hash del PIN numérico
 */
export function hashPin(pin: string, userId: string): string {
  return crypto
    .createHmac("sha256", PIN_SALT)
    .update(`${userId}:${pin.trim()}`)
    .digest("hex");
}
