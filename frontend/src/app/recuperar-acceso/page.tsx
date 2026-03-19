"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SiteFooter } from "@/components/SiteFooter";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const message = await requestPasswordReset(email);
      setSuccessMessage(message);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar la recuperación de acceso.",
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
            <ShieldCheck className="h-3.5 w-3.5" /> Recuperación segura
          </div>
          <h1 className="enterprise-title mt-6">
            Restablece tu acceso desde tu correo.
          </h1>
          <p className="enterprise-copy mt-5 max-w-2xl text-sm">
            Ingresa el correo de tu cuenta. Si existe en el sistema, enviaremos un
            enlace de recuperación para que establezcas una nueva contraseña.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#55637a]">
                Correo de acceso
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="enterprise-input"
                placeholder="docente@colegio.edu.pe"
              />
            </div>

            <button type="submit" disabled={submitting} className="enterprise-button-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4" /> Enviar enlace</>}
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
          </form>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
