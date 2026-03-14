"use client";

import { Suspense, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { LegalConsentFields } from "@/components/LegalConsentFields";
import { SiteFooter } from "@/components/SiteFooter";
import { getAllowedEmailDomainsLabel } from "@/lib/utils";

function RegisterPageContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { register, bootstrapError } = useAuth();
  const allowedEmailDomainsLabel = getAllowedEmailDomainsLabel();
  const searchParams = useSearchParams();
  const isSubscribeIntent = searchParams.get("intent") === "subscribe";
  const redirectTarget = isSubscribeIntent ? "/dashboard?checkout=1" : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await register(
        name,
        email,
        password,
        acceptTerms,
        acceptPrivacy,
        redirectTarget,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la cuenta";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="enterprise-page relative overflow-hidden text-[#10203a]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,32,58,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,32,58,0.05)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5a6880] transition hover:text-[#10203a]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="enterprise-card px-8 py-8 lg:px-10 lg:py-10"
          >
            <div className="enterprise-badge">
              <ShieldCheck className="h-3.5 w-3.5" /> Apertura de cuenta
            </div>
            <h1 className="enterprise-title mt-6 max-w-xl">
              Crea tu cuenta con una experiencia más seria y más clara.
            </h1>
            <p className="enterprise-copy mt-5 max-w-2xl text-sm">
              El registro queda integrado al flujo principal para que el docente
              no tenga que improvisar pasos ni regresar al inicio para seguir.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Tu acceso queda listo para revisar estado, licencia y continuidad.",
                "El siguiente paso puede ser activar la suscripción sin cambiar de panel.",
                "Toda la experiencia mantiene la misma identidad visual y operativa.",
              ].map((item) => (
                <div key={item} className="enterprise-soft-panel px-5 py-5 text-sm leading-7 text-[#5a6880]">
                  {item}
                </div>
              ))}
            </div>

            {isSubscribeIntent && (
              <div className="mt-8 rounded-[1.6rem] border border-[rgba(185,144,90,0.26)] bg-[rgba(239,230,214,0.84)] px-5 py-5 text-sm leading-7 text-[#6b5330]">
                Flujo de suscripción activo. Cuando termines el registro, el
                sistema abrirá el paso de activación de tu cuenta.
              </div>
            )}

            <div className="mt-8 text-sm leading-7 text-[#5a6880]">
              Este acceso queda preparado para usarlo siempre que necesites
              revisar tu panel o retomar tu proceso.
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="enterprise-card-dark px-8 py-8 lg:px-10 lg:py-10"
          >
            <div className="enterprise-kicker text-[#d2b27c]">Registro docente</div>
            <h2 className="mt-4 text-4xl text-[#f5efe5]">Crear cuenta PLANIFIWEB</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#b8c6da]">
              {isSubscribeIntent
                ? "Registra tu cuenta y continuarás directo al paso de activación."
                : "Crea tu acceso y luego administra suscripción, estado y entrada a la app desde un mismo panel."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {bootstrapError && (
                <p className="rounded-2xl border border-[rgba(239,68,68,0.32)] bg-[rgba(127,29,29,0.28)] px-4 py-3 text-center text-sm text-[#ffd7d7]">
                  {bootstrapError}
                </p>
              )}
              <div>
                <label className="mb-2 block px-1 text-sm font-semibold text-[#dce5f2]">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="enterprise-input bg-[rgba(255,255,255,0.92)]"
                  placeholder="Docente responsable"
                />
              </div>
              <div>
                <label className="mb-2 block px-1 text-sm font-semibold text-[#dce5f2]">
                  Correo
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="enterprise-input bg-[rgba(255,255,255,0.92)]"
                  placeholder={allowedEmailDomainsLabel ? "docente@colegio.edu.pe" : "tu-correo@dominio.com"}
                  title={
                    allowedEmailDomainsLabel
                      ? `Solo se permiten correos de estos dominios: ${allowedEmailDomainsLabel}`
                      : undefined
                  }
                />
                {allowedEmailDomainsLabel && (
                  <p className="mt-2 px-1 text-xs text-[#9aa9bd]">
                    Solo se permiten correos de estos dominios:{" "}
                    <strong>{allowedEmailDomainsLabel}</strong>.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-2 block px-1 text-sm font-semibold text-[#dce5f2]">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="enterprise-input bg-[rgba(255,255,255,0.92)]"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <LegalConsentFields
                acceptTerms={acceptTerms}
                acceptPrivacy={acceptPrivacy}
                onAcceptTermsChange={setAcceptTerms}
                onAcceptPrivacyChange={setAcceptPrivacy}
                dark
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="enterprise-button-primary mt-2 w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Crear cuenta <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {errorMessage && (
                <p className="rounded-2xl border border-[rgba(239,68,68,0.32)] bg-[rgba(127,29,29,0.28)] px-4 py-3 text-center text-sm text-[#ffd7d7]">
                  {errorMessage}
                </p>
              )}
            </form>

            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/[0.05] px-5 py-5 text-sm leading-7 text-[#c7d3e4]">
              Al registrarte, tu cuenta queda lista para revisar estado y
              continuar con la activación desde el mismo flujo.
            </div>

            <p className="mt-6 text-sm text-[#9aa9bd]">
              ¿Ya tienes cuenta?{" "}
              <Link
                href={isSubscribeIntent ? "/login?intent=subscribe" : "/login"}
                className="font-semibold text-white hover:text-[#d2b27c]"
              >
                Iniciar sesión
              </Link>
            </p>
          </motion.section>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="enterprise-page" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
