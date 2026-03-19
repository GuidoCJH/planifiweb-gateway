"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const PasswordSecurityCard = () => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const message = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword,
      );
      setSuccessMessage(message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la contraseña.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="seguridad" className="enterprise-card mt-8 px-8 py-8 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="enterprise-badge">
            <ShieldCheck className="h-3.5 w-3.5" /> Seguridad
          </div>
          <h2 className="mt-5 text-3xl text-[#10203a]">
            Cambia tu contraseña sin salir del panel principal.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#5a6880]">
            Usa tu contraseña actual para confirmar el cambio. Si no recuerdas tu acceso,
            puedes iniciar una recuperación por correo.
          </p>
        </div>

        <Link href="/recuperar-acceso" className="enterprise-button-secondary">
          <KeyRound className="h-4 w-4" /> Recuperar acceso por correo
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 lg:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#55637a]">
            Contraseña actual
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="enterprise-input"
            placeholder="********"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#55637a]">
            Nueva contraseña
          </label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="enterprise-input"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#55637a]">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="enterprise-input"
            placeholder="Repite la nueva contraseña"
          />
        </div>

        <div className="lg:col-span-3 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={submitting} className="enterprise-button-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar contraseña"}
          </button>
          {successMessage && (
            <div className="rounded-[1.2rem] border border-[rgba(43,122,91,0.22)] bg-[rgba(228,245,236,0.92)] px-4 py-3 text-sm text-[#1e6a53]">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-[1.2rem] border border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] px-4 py-3 text-sm text-[#8d2f2f]">
              {errorMessage}
            </div>
          )}
        </div>
      </form>
    </section>
  );
};
