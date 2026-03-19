"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearCsrfToken, parseApiError, primeCsrfToken } from "@/lib/api";
import {
  formatDisplayName,
  getAllowedEmailDomainsLabel,
  isAllowedRegistrationEmail,
} from "@/lib/utils";

interface User {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
  subscription_status: string;
  subscription_scope: string;
  active_plan?: string | null;
  subscription_expires_at?: string | null;
  created_at: string;
}

interface LegalStatus {
  terms_versión: string;
  privacy_versión: string;
  acceptance_required: boolean;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
}

interface SessionState {
  user: User;
  subscription_status: string;
  subscription_scope: string;
  active_plan?: string | null;
  daily_limit: number;
  daily_used: number;
  exports_enabled: boolean;
  can_access_app: boolean;
  legal: LegalStatus;
}

interface AuthContextType {
  user: User | null;
  session: SessionState | null;
  loading: boolean;
  bootstrapError: string | null;
  login: (email: string, password: string, redirectTo?: string | null) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    acceptTerms: boolean,
    acceptPrivacy: boolean,
    redirectTo?: string | null,
  ) => Promise<void>;
  acceptLegal: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<string>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<string>;
  refreshSession: () => Promise<SessionState | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BACKEND_UNREACHABLE_MESSAGE =
  "No se pudo conectar con la API de autenticación. Verifica NEXT_PUBLIC_API_URL o el proxy /api del despliegue. En local, confirma que el backend esté activo en http://127.0.0.1:8000.";

function mapAuthError(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const normalized = error.message.toLowerCase();
  if (normalized.includes("status 404")) {
    return BACKEND_UNREACHABLE_MESSAGE;
  }

  return error.message || fallbackMessage;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSession = useCallback(async (): Promise<SessionState | null> => {
    const response = await apiFetch("/api/auth/me", {
      cache: "no-store",
    });

    if (response.status === 401) {
      setSession(null);
      setBootstrapError(null);
      return null;
    }
    if (response.status === 404) {
      throw new Error(BACKEND_UNREACHABLE_MESSAGE);
    }

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = (await response.json()) as SessionState;
    data.user.name = formatDisplayName(data.user.name);
    setSession(data);
    setBootstrapError(null);
    return data;
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      return await fetchSession();
    } catch (error) {
      const message = mapAuthError(
        error,
        "No se pudo verificar la sesión actual.",
      );
      setBootstrapError(message);
      setSession(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    void primeCsrfToken().catch(() => {
      // Se reintentara de forma perezosa en la siguiente operacion state-changing.
    });
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    redirectTo: string | null = "/dashboard",
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", normalizedEmail);
      formData.append("password", password);

      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      await fetchSession();
      if (redirectTo) {
        router.push(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
      }
    } catch (error: unknown) {
      throw new Error(mapAuthError(error, "No se pudo iniciar sesión."));
    } finally {
      setLoading(false);
    }
  }, [fetchSession, router]);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    acceptTerms: boolean,
    acceptPrivacy: boolean,
    redirectTo: string | null = "/dashboard",
  ) => {
    const normalizedName = name.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      throw new Error("Ingresa tu nombre completo para continuar.");
    }
    if (!isAllowedRegistrationEmail(normalizedEmail)) {
      const allowedDomainsLabel = getAllowedEmailDomainsLabel();
      throw new Error(
        allowedDomainsLabel
          ? `Solo se permiten correos de estos dominios: ${allowedDomainsLabel}.`
          : "Ingresa un correo válido para el registro.",
      );
    }
    if (!acceptTerms || !acceptPrivacy) {
      throw new Error(
        "Debes aceptar Términos y Condiciones y la Política de Privacidad para crear la cuenta.",
      );
    }

    setLoading(true);
    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password,
          accept_terms: acceptTerms,
          accept_privacy: acceptPrivacy,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      await fetchSession();
      if (redirectTo) {
        router.push(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
      }
    } catch (error: unknown) {
      throw new Error(
        mapAuthError(error, "No se pudo completar el registro."),
      );
    } finally {
      setLoading(false);
    }
  }, [fetchSession, router]);

  const acceptLegal = useCallback(async () => {
    const response = await apiFetch("/api/auth/legal-acceptance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accept_terms: true,
        accept_privacy: true,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = (await response.json()) as SessionState;
    setSession(data);
  }, []);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    const response = await apiFetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = (await response.json()) as { message: string };
    return data.message;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = (await response.json()) as { message: string };
    return data.message;
  }, []);

  const resetPassword = useCallback(async (
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    const response = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = (await response.json()) as { message: string };
    return data.message;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout request failed", error);
    } finally {
      clearCsrfToken();
      setSession(null);
      router.push("/");
    }
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      bootstrapError,
      login,
      register,
      acceptLegal,
      changePassword,
      requestPasswordReset,
      resetPassword,
      refreshSession,
      logout,
    }),
    [
      acceptLegal,
      bootstrapError,
      changePassword,
      loading,
      login,
      logout,
      refreshSession,
      register,
      requestPasswordReset,
      resetPassword,
      session,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};



