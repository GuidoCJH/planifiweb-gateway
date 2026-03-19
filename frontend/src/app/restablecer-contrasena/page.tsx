"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SiteFooter } from "@/components/SiteFooter";

function ResetPasswordContent() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await resetPassword(token, newPassword, confirmPassword);
      router.push("/login?reset=success");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contraseña.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="enterprise-page text-[#10203a]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a6880] transition hover:text-[#10203a]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al login
        </Link>

        <section className="enterprise-card mt-8 px-8 py-8 lg:px-10 lg:py-10">
          <div className="enterprise-badge">
            <ShieldCheck className="h-3.5 w-3.5" /> Restablecer contraseña
          </div>
          <h1 className="enterprise-title mt-6">
            Define una nueva contraseña para tu cuenta.
          </h1>
          <p className="enterprise-copy mt-5 max-w-2xl text-sm">
            Usa una contraseña nueva y vuelve a iniciar sesión desde el panel principal.
          </p>

          {!token ? (
            <div className="mt-8 rounded-[1.2rem] border border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] px-4 py-3 text-sm text-[#8d2f2f]">
              El enlace de recuperación es inválido o incompleto.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4">
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

              <button type="submit" disabled={submitting} className="enterprise-button-primary">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><KeyRound className="h-4 w-4" /> Guardar nueva contraseña</>}
              </button>

              {errorMessage && (
                <div className="rounded-[1.2rem] border border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] px-4 py-3 text-sm text-[#8d2f2f]">
                  {errorMessage}
                </div>
              )}
            </form>
          )}
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="enterprise-page" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
