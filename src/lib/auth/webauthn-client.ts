"use client";

/**
 * Utilidades WebAuthn para autenticación biométrica (Huella / FaceID / Windows Hello)
 * en la tablet de sede y dispositivos autorizados de Nievas Academia Deportiva.
 */

// Helper: Convert ArrayBuffer to Base64URL string
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper: Convert Base64URL string to Uint8Array
export function base64UrlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifica si el dispositivo actual soporta biometría nativa del sistema (TouchID, FaceID, Huella Android, Windows Hello)
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
  } catch (err) {
    console.warn("Error al verificar disponibilidad biométrica:", err);
  }
  return false;
}

/**
 * Solicita al sistema operativo registrar la biometría (FaceID/Huella) del profesor en este dispositivo
 */
export async function registrarBiometriaDispositivo(params: {
  userId: string;
  userEmail: string;
  userName: string;
}): Promise<{
  success: boolean;
  credential?: {
    id: string;
    publicKey: string;
    deviceName?: string;
  };
  error?: string;
}> {
  if (!window.PublicKeyCredential) {
    return { success: false, error: "Este navegador no soporta autenticación biométrica." };
  }

  try {
    // Generar un challenge criptográfico aleatorio
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Identificador único de usuario como bytes
    const encoder = new TextEncoder();
    const userIdBytes = encoder.encode(params.userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Nievas Academia Deportiva",
        id: window.location.hostname,
      },
      user: {
        id: userIdBytes,
        name: params.userEmail,
        displayName: params.userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Sensor del propio dispositivo (tablet/móvil)
        userVerification: "preferred",
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "No se completó la verificación biométrica." };
    }

    const rawResponse = credential.response as AuthenticatorAttestationResponse;
    const credIdBase64 = bufferToBase64Url(credential.rawId);
    const pubKeyBase64 = rawResponse.getPublicKey
      ? bufferToBase64Url(rawResponse.getPublicKey() || new ArrayBuffer(0))
      : credIdBase64;

    const deviceName = `${navigator.platform || "Dispositivo"} (${new Date().toLocaleDateString("es-AR")})`;

    return {
      success: true,
      credential: {
        id: credIdBase64,
        publicKey: pubKeyBase64,
        deviceName,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error durante el registro biométrico.";
    if (msg.includes("abort") || msg.includes("cancel")) {
      return { success: false, error: "Registro biométrico cancelado por el usuario." };
    }
    return { success: false, error: msg };
  }
}

/**
 * Autentica al profesor en la tablet usando su huella / FaceID / biometría del sistema
 */
export async function autenticarConBiometria(params: {
  allowedCredentialIds?: string[];
}): Promise<{
  success: boolean;
  credentialId?: string;
  error?: string;
}> {
  if (!window.PublicKeyCredential) {
    return { success: false, error: "Biometría no soportada en este navegador." };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials: PublicKeyCredentialDescriptor[] = (params.allowedCredentialIds || []).map((id) => {
      const buf = base64UrlToBuffer(id);
      return {
        id: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
        type: "public-key" as const,
        transports: ["internal" as AuthenticatorTransport],
      };
    });

    const assertionOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: "preferred",
      timeout: 60000,
    };

    const assertion = (await navigator.credentials.get({
      publicKey: assertionOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: "No se completó la lectura biométrica." };
    }

    const credentialId = bufferToBase64Url(assertion.rawId);
    return {
      success: true,
      credentialId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error durante la lectura biométrica.";
    if (msg.includes("abort") || msg.includes("cancel") || msg.includes("NotAllowedError")) {
      return { success: false, error: "Lectura biométrica cancelada." };
    }
    return { success: false, error: msg };
  }
}
