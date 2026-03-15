"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LegalConsentFields } from "@/components/LegalConsentFields";
import { LegalLinks } from "@/components/LegalLinks";
import { getAllowedEmailDomainsLabel } from "@/lib/utils";

type AuthMode = "register" | "login";

interface AccountAccessPanelProps {
  checkoutRequested: boolean;
  initialMode?: AuthMode;
  inline?: boolean;
  redirectTo?: string | null;
  onAuthSuccess?: () => void | Promise<void>;
}

export const AccountAccessPanel = ({
  checkoutRequested,
  initialMode = "register",
  inline = false,
  redirectTo,
  onAuthSuccess,
}: AccountAccessPanelProps) => {
  const allowedEmailDomainsLabel = getAllowedEmailDomainsLabel();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const redirectTarget = useMemo(() => {
    if (redirectTo !== undefined) {
      return redirectTo;
    }
    return checkoutRequested ? "/dashboard?checkout=1" : "/dashboard";
  }, [checkoutRequested, redirectTo]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register(
          name,
          email,
          password,
          acceptTerms,
          acceptPrivacy,
          redirectTarget,
        );
      } else {
        await login(email, password, redirectTarget);
      }

      await onAuthSuccess?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : mode === "register"
          ? "No se pudo crear la cuenta"
          : "No se pudo iniciar sesión";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="enterprise-card px-8 py-8 lg:px-10 lg:py-10">
          <div className="enterprise-badge">
            <ShieldCheck className="h-3.5 w-3.5" /> Centro de acceso
          </div>
          <h1 className="enterprise-title mt-6 max-w-xl">
            Cuenta docente, suscripción y entrada a PLANIFIWEB.
          </h1>
          <p className="enterprise-copy mt-5 max-w-2xl text-sm">
            Este panel concentra el acceso principal del producto. Aquí creas tu
            cuenta, retomas tu sesión, activas tu suscripción y continúas sin
            cambiar de entorno.
          </p>

          <div className="mt-8 space-y-4">
            {[
              {
                step: "01",
                title: "Accede con una sola cuenta",
                description:
                  "Usa el mismo acceso para revisar estado, activar la suscripción y volver a entrar cuando lo necesites.",
              },
              {
                step: "02",
                title: "Completa el proceso de activación",
                description:
                  "El pago y el comprobante forman parte del mismo flujo para evitar idas y vueltas innecesarias.",
              },
              {
                step: "03",
                title: "Entra a trabajar con continuidad",
                description:
                  "Cuando tu cuenta queda lista, continúas a PLANIFIWEB sin perder contexto ni avance.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="enterprise-soft-panel flex items-start gap-4 px-5 py-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#10203a] text-sm font-black tracking-[0.14em] text-[#f5efe4]">
                  {item.step}
                </div>
                <div>
                  <div className="font-sans text-base font-bold text-[#10203a]">
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#5a6880]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-[rgba(16,32,58,0.08)] bg-[#10203a] px-6 py-6 text-[#edf3fa]">
            <div className="enterprise-badge-dark">
              <Sparkles className="h-3.5 w-3.5" /> Resultado esperado
            </div>
            <p className="mt-4 text-sm leading-7 text-[#d8e1ee]">
              {checkoutRequested
                ? "Al completar el acceso, el sistema te devuelve al paso de activación para continuar con el pago sin bucles."
                : "Al completar el acceso, verás tu estado de cuenta y podrás activar tu suscripción o entrar a la app desde el mismo panel."}
            </p>
          </div>

          {checkoutRequested && (
            <div className="mt-6 rounded-[1.5rem] border border-[rgba(185,144,90,0.26)] bg-[rgba(239,230,214,0.84)] px-5 py-5 text-sm leading-7 text-[#6b5330]">
              Flujo de activación abierto. Apenas termines el acceso, esta misma
              página continuará con el pago y la subida del comprobante.
            </div>
          )}

          <div className="mt-8 text-sm text-[#5a6880]">
            Si solo necesitas revisar tu estado o retomar luego, tu cuenta
            quedará disponible con el mismo acceso.
          </div>
        </section>

        <section className="enterprise-card-dark px-8 py-8 lg:px-10 lg:py-10">
          <div className="enterprise-tab-shell">
            <button
              onClick={() => setMode("register")}
              className={`enterprise-tab ${mode === "register" ? "enterprise-tab-active" : ""}`}
            >
              Crear cuenta
            </button>
            <button
              onClick={() => setMode("login")}
              className={`enterprise-tab ${mode === "login" ? "enterprise-tab-active" : ""}`}
            >
              Iniciar sesión
            </button>
          </div>

          <div className="mt-8">
            <div className="enterprise-kicker text-[#d2b27c]">
              {mode === "register" ? "Alta de cuenta" : "Acceso seguro"}
            </div>
            <h2 className="mt-4 text-4xl text-[#f5efe5]">
              {mode === "register" ? "Abre tu espacio docente" : "Retoma tu cuenta"}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#b8c6da]">
              {mode === "register"
                ? "Crea tu cuenta y el sistema te dejará listo para continuar con la activación sin salir del flujo."
                : "Inicia sesión y volverás a este mismo panel para completar la suscripción o entrar a la app."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-2 block px-1 text-sm font-semibold text-[#dce5f2]">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="enterprise-input bg-[rgba(255,255,255,0.92)]"
                  placeholder="Docente responsable"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block px-1 text-sm font-semibold text-[#dce5f2]">
                Correo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="enterprise-input bg-[rgba(255,255,255,0.92)]"
                placeholder={mode === "register" ? "docente@colegio.edu.pe" : "tu-correo@dominio.com"}
                title={
                  mode === "register" && allowedEmailDomainsLabel
                    ? `Solo se permiten correos de estos dominios: ${allowedEmailDomainsLabel}`
                    : undefined
                }
              />
              {mode === "register" && allowedEmailDomainsLabel && (
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
                onChange={(event) => setPassword(event.target.value)}
                className="enterprise-input bg-[rgba(255,255,255,0.92)]"
                  placeholder={mode === "register" ? "Mínimo 8 caracteres" : "********"}
              />
            </div>

            {mode === "register" && (
              <LegalConsentFields
                acceptTerms={acceptTerms}
                acceptPrivacy={acceptPrivacy}
                onAcceptTermsChange={setAcceptTerms}
                onAcceptPrivacyChange={setAcceptPrivacy}
                dark
              />
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="enterprise-button-primary mt-2 w-full"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "register" ? (
                <>
                  Crear cuenta y continuar <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Entrar a mi cuenta <ArrowRight className="h-4 w-4" />
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
            {checkoutRequested
              ? "Después del acceso abriremos el paso de pago para que completes la suscripción con continuidad."
              : "Después del acceso podrás revisar tu estado, suscribirte y entrar a PLANIFIWEB desde este mismo panel."}
          </div>

          <LegalLinks
            className="mt-6 flex flex-wrap gap-4 text-xs text-[#a7b6ca]"
            linkClassName="font-semibold text-[#f5efe5] hover:text-[#d2b27c]"
          />

          <div className="mt-6 text-center text-xs text-[#8ea0ba]">
            {inline ? (
              <span>El acceso queda dentro del mismo flujo comercial de la landing.</span>
            ) : (
              <Link href="/" className="font-semibold hover:text-white">
                Volver al inicio
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};




