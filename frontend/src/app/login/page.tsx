"use client";

import { Suspense, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { LegalLinks } from "@/components/LegalLinks";
import { SiteFooter } from "@/components/SiteFooter";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login, bootstrapError } = useAuth();
  const searchParams = useSearchParams();
  const isSubscribeIntent = searchParams.get("intent") === "subscribe";
  const redirectTarget = isSubscribeIntent ? "/dashboard?checkout=1" : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(email, password, redirectTarget);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="enterprise-card px-8 py-8 lg:px-10 lg:py-10"
          >
            <div className="enterprise-badge">
              <ShieldCheck className="h-3.5 w-3.5" /> Acceso institucional
            </div>
            <h1 className="enterprise-title mt-6 max-w-xl">
              Inicia sesión y retoma tu cuenta sin salir del flujo principal.
            </h1>
            <p className="enterprise-copy mt-5 max-w-2xl text-sm">
              Desde aquí revisas tu estado, continúas con la activación de la
              suscripción y entras a PLANIFIWEB con una interfaz coherente y
              profesional.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                "Tu cuenta conserva el estado de suscripción y acceso.",
                "No necesitas cambiar de sistema para continuar el proceso.",
                "Una vez dentro, sigues directo a tu panel o al paso de activación.",
              ].map((item) => (
                <div key={item} className="enterprise-soft-panel px-5 py-5 text-sm leading-7 text-[#5a6880]">
                  {item}
                </div>
              ))}
            </div>

            {isSubscribeIntent && (
              <div className="mt-8 rounded-[1.6rem] border border-[rgba(185,144,90,0.26)] bg-[rgba(239,230,214,0.84)] px-5 py-5 text-sm leading-7 text-[#6b5330]">
                Flujo de suscripción activo. Después del acceso volverás al paso
                de activación para completar el pago y subir tu comprobante.
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="enterprise-card-dark px-8 py-8 lg:px-10 lg:py-10"
          >
            <div className="enterprise-kicker text-[#d2b27c]">Ingreso seguro</div>
            <h2 className="mt-4 text-4xl text-[#f5efe5]">Entrar a PLANIFIWEB</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#b8c6da]">
              {isSubscribeIntent
                ? "Accede con tu cuenta y el sistema te devolverá al panel para completar la activación."
                : "Accede con tu cuenta para revisar licencia, estado y entrada a la app."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {bootstrapError && (
                <p className="rounded-2xl border border-[rgba(239,68,68,0.32)] bg-[rgba(127,29,29,0.28)] px-4 py-3 text-center text-sm text-[#ffd7d7]">
                  {bootstrapError}
                </p>
              )}
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
                  placeholder="docente@colegio.edu.pe"
                />
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
                  placeholder="********"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="enterprise-button-primary mt-2 w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Iniciar sesión <ArrowRight className="h-4 w-4" />
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
              Usa el mismo acceso para continuar tu proceso sin regresar al
              inicio ni repetir información.
            </div>

            <LegalLinks
              className="mt-6 flex flex-wrap gap-4 text-xs text-[#a7b6ca]"
              linkClassName="font-semibold text-[#f5efe5] hover:text-[#d2b27c]"
            />

            <p className="mt-6 text-sm text-[#9aa9bd]">
              ¿Aún no tienes cuenta?{" "}
              <Link
                href={isSubscribeIntent ? "/register?intent=subscribe" : "/register"}
                className="font-semibold text-white hover:text-[#d2b27c]"
              >
                Registrarse
              </Link>
            </p>
          </motion.section>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="enterprise-page" />}>
      <LoginPageContent />
    </Suspense>
  );
}
