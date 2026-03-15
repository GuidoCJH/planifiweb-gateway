"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AccountAccessPanel } from "@/components/AccountAccessPanel";
import { Hero } from "@/components/Hero";
import { LegalAcceptanceCard } from "@/components/LegalAcceptanceCard";
import { Pricing } from "@/components/Pricing";
import {
  APP_ENTRY_PATH,
  getSubscriptionPlan,
  goToApp,
  isActiveSubscription,
  isPendingReview,
  MAIN_PLAN,
  requiresCheckout,
} from "@/lib/subscription";
import { formatDisplayName } from "@/lib/utils";
import { SubscriptionModal } from "@/components/SubscriptionModal";

const STORAGE_PLAN_KEY = "landing:selected-plan";
const STORAGE_CHECKOUT_KEY = "landing:checkout-requested";
type AccessMode = "register" | "login";

export const LandingExperience = () => {
  const { user, session, loading } = useAuth();
  const accessSectionRef = useRef<HTMLElement | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState(() => {
    if (typeof window === "undefined") {
      return MAIN_PLAN.code;
    }
    return window.sessionStorage.getItem(STORAGE_PLAN_KEY) || MAIN_PLAN.code;
  });
  const [accessMode, setAccessMode] = useState<AccessMode>("register");
  const [checkoutRequested, setCheckoutRequested] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.sessionStorage.getItem(STORAGE_CHECKOUT_KEY) === "1";
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(STORAGE_PLAN_KEY, selectedPlanCode);
  }, [selectedPlanCode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (checkoutRequested) {
      window.sessionStorage.setItem(STORAGE_CHECKOUT_KEY, "1");
    } else {
      window.sessionStorage.removeItem(STORAGE_CHECKOUT_KEY);
    }
  }, [checkoutRequested]);

  const selectedPlan = useMemo(
    () => getSubscriptionPlan(selectedPlanCode),
    [selectedPlanCode],
  );

  const autoCheckoutOpen =
    !loading &&
    checkoutRequested &&
    !!session &&
    !session.legal.acceptance_required &&
    requiresCheckout(session.subscription_status);

  const scrollToAccess = () => {
    accessSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handlePlanSelection = (planCode: string) => {
    setSelectedPlanCode(planCode);
  };

  const handlePlanContinue = (planCode: string) => {
    setSelectedPlanCode(planCode);

    if (!user || !session) {
      setCheckoutRequested(true);
      setAccessMode("register");
      setCheckoutOpen(false);
      scrollToAccess();
      return;
    }

    if (isActiveSubscription(session.subscription_status)) {
      goToApp(APP_ENTRY_PATH);
      return;
    }

    if (isPendingReview(session.subscription_status)) {
      goToApp(APP_ENTRY_PATH);
      return;
    }

    setCheckoutRequested(true);

    if (session.legal.acceptance_required) {
      scrollToAccess();
      return;
    }

    setCheckoutOpen(true);
  };

  const handleCheckoutClose = () => {
    setCheckoutOpen(false);
    setCheckoutRequested(false);
  };

  const userFirstName =
    user?.name ? formatDisplayName(user.name).split(" ")[0] || "Docente" : "Docente";

  return (
    <>
      <Hero />

      <section
        id="solucion"
        className="border-y border-[rgba(16,32,58,0.08)] bg-[rgba(252,250,245,0.78)] px-6 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="enterprise-badge">Lo que resuelve PLANIFIWEB</div>
              <h2 className="mt-6 text-4xl leading-tight text-[#10203a] md:text-5xl">
                Menos tiempo improvisando formatos. Más control sobre lo que realmente debes entregar.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#5a6880]">
                PLANIFIWEB concentra en un solo entorno el trabajo que suele dispersarse entre
                archivos, borradores, formatos repetidos y documentos sin continuidad. La meta no
                es solo generar texto: es ayudarte a sostener una ruta curricular más clara para el
                trabajo real del docente peruano.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  "Planificación curricular y anual con una estructura más ordenada.",
                  "Sesiones, unidades, fichas y evaluaciones dentro del mismo flujo.",
                  "Criterios, evidencias y competencias con continuidad de trabajo.",
                  "Acceso, pago y entrada a la app sin volver a empezar en otra pantalla.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.4rem] border border-[rgba(16,32,58,0.10)] bg-white/80 px-5 py-5 text-sm leading-7 text-[#55637a]"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-4 w-4 text-[#1e6a53]" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: LayoutTemplate,
                  title: "Planificación con estructura",
                  description:
                    "Diagnóstico, anual, unidad y sesión dentro de una misma lógica de trabajo, sin rehacer el proceso desde cero.",
                },
                {
                  icon: BookOpenCheck,
                  title: "Producción más consistente",
                  description:
                    "La plataforma ayuda a mantener relación entre competencias, criterios, evidencias y productos.",
                },
                {
                  icon: FileText,
                  title: "Entrega más utilizable",
                  description:
                    "El objetivo es que el material resultante quede más cerca de un documento revisable y usable por el docente.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-[2rem] border border-[rgba(16,32,58,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(246,241,232,0.96)_100%)] px-6 py-7 shadow-[0_20px_45px_rgba(15,27,48,0.08)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10203a] text-[#f5efe4]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-2xl leading-tight text-[#10203a]">{item.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#5a6880]">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="acceso" ref={accessSectionRef} className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="enterprise-badge">Acceso directo</div>
            <h2 className="mt-6 text-4xl leading-tight text-[#10203a] md:text-5xl">
              Primero entiendes el servicio. Luego abres tu cuenta y continúas sin salir de esta página.
            </h2>
            <p className="mt-6 text-base leading-8 text-[#5a6880]">
              La cuenta docente sigue usando el mismo formulario actual, pero ahora el proceso de
              suscripción arranca desde la landing. El plan que elijas se conserva para que no
              pierdas el hilo antes del pago.
            </p>
          </div>

          <div className="mt-12">
            {!user || !session ? (
              <AccountAccessPanel
                checkoutRequested={checkoutRequested}
                initialMode={accessMode}
                inline
                redirectTo={null}
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="enterprise-card px-8 py-8 lg:px-10 lg:py-10">
                  <div className="enterprise-badge">
                    <ShieldCheck className="h-3.5 w-3.5" /> Cuenta reconocida
                  </div>
                  <h2 className="enterprise-title mt-6">
                    {userFirstName}, tu cuenta ya está lista para continuar.
                  </h2>
                  <p className="enterprise-copy mt-5 max-w-2xl text-sm">
                    Ya no necesitas salir a otra ruta para completar el flujo. Desde aquí puedes
                    terminar aceptación legal, elegir plan o entrar a la app si tu acceso ya está
                    activo.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      {
                        label: "Estado",
                        value: session.subscription_status.replaceAll("_", " "),
                      },
                      {
                        label: "Plan elegido",
                        value: selectedPlan.name,
                      },
                      {
                        label: "Cupo diario",
                        value: `${session.daily_used}/${session.daily_limit}`,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[1.4rem] border border-[rgba(16,32,58,0.10)] bg-white/80 px-5 py-5"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6840]">
                          {item.label}
                        </div>
                        <div className="mt-3 text-lg font-bold capitalize text-[#10203a]">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {session.can_access_app ? (
                      <a href={APP_ENTRY_PATH} className="enterprise-button-primary">
                        Entrar a la app <ArrowRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handlePlanContinue(selectedPlan.code)}
                        className="enterprise-button-primary"
                      >
                        Continuar con {selectedPlan.name} <CreditCard className="h-4 w-4" />
                      </button>
                    )}
                    <Link href="/dashboard" className="enterprise-button-secondary">
                      Ir a mi panel
                    </Link>
                  </div>
                </section>

                <section className="enterprise-card-dark px-8 py-8 lg:px-10 lg:py-10">
                  <div className="enterprise-badge-dark">
                    <Sparkles className="h-4 w-4" /> Siguiente paso
                  </div>
                  <div className="mt-6 space-y-4 text-sm leading-7 text-[#d5deeb]">
                    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-5 py-5">
                      Seleccionaste <strong>{selectedPlan.name}</strong>. El sistema conservará ese
                      plan para abrir el pago sin hacerte volver al panel de cuenta.
                    </div>
                    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-5 py-5">
                      El pago sigue siendo por <strong>Yape</strong> y la activación final sigue
                      pasando por revisión administrativa.
                    </div>
                    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-5 py-5">
                      Si ya tienes acceso activo, puedes entrar a PLANIFIWEB sin repetir este flujo.
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          {user && session?.legal.acceptance_required && <LegalAcceptanceCard />}
        </div>
      </section>

      <Pricing
        selectedPlanCode={selectedPlan.code}
        onSelectPlan={handlePlanSelection}
        onContinueWithPlan={handlePlanContinue}
      />

      <SubscriptionModal
        open={checkoutOpen || autoCheckoutOpen}
        onClose={handleCheckoutClose}
        selectedPlan={selectedPlan}
      />
    </>
  );
};
