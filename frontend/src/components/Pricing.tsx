"use client";

import { useMemo, useState } from "react";
import { Check, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LegalLinks } from "@/components/LegalLinks";
import {
  APP_ENTRY_PATH,
  getSubscriptionPlan,
  goToApp,
  isActiveSubscription,
  isPendingReview,
  MAIN_PLAN,
  requiresCheckout,
  SUBSCRIPTION_PLANS,
} from "@/lib/subscription";
import { SubscriptionModal } from "./SubscriptionModal";

export const Pricing = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState(MAIN_PLAN.code);
  const { user, session } = useAuth();
  const router = useRouter();

  const selectedPlan = useMemo(
    () => getSubscriptionPlan(selectedPlanCode),
    [selectedPlanCode],
  );

  const handlePaymentClick = () => {
    if (!user || !session) {
      router.push("/dashboard?checkout=1");
      return;
    }

    if (session.legal.acceptance_required) {
      router.push("/dashboard?legal=1");
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

    setShowCheckout(true);
  };

  const mainButtonLabel = !user
    ? "Ir a cuenta y suscribirme"
    : session?.legal.acceptance_required
      ? "Aceptar documentos y continuar"
      : session && requiresCheckout(session.subscription_status)
        ? "Completar suscripción"
        : session && isPendingReview(session.subscription_status)
          ? "Entrar con acceso moderado"
          : session && isActiveSubscription(session.subscription_status)
            ? "Entrar a la app"
            : "Suscribirme ahora";

  const secondaryHref = !user || !session ? "/dashboard?mode=login" : "/dashboard";
  const secondaryLabel = !user || !session ? "Ya tengo cuenta" : "Ir a mi panel";

  return (
    <section id="pricing" className="bg-[#10203a] px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2e4d79] bg-[#142541] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#d2b27c]">
            <GraduationCap className="h-4 w-4" /> Suscripción oficial PLANIFIWEB
          </div>
          <h2 className="mt-6 text-4xl leading-tight text-[#f5efe5] md:text-5xl">
            Elige el plan mensual que mejor se ajusta a tu ritmo.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#b7c5d8]">
            Todos los planes se activan por Yape y pasan por revisión administrativa. La cuenta
            entra con el límite diario según el plan aprobado.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const selected = plan.code === selectedPlan.code;
              return (
                <motion.div
                  key={plan.code}
                  whileHover={{ y: -3 }}
                  className={`rounded-[2rem] border p-6 transition ${
                    selected
                      ? "border-[#d2b27c] bg-[#f8f3ea] text-[#10203a] shadow-[0_22px_54px_rgba(7,13,25,0.26)]"
                      : "border-white/10 bg-[#142541] text-[#dbe3f1]"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-3xl font-bold">{plan.name}</h3>
                        {plan.badge && (
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                              selected
                                ? "bg-[#10203a] text-[#f7f2e8]"
                                : "bg-[rgba(210,178,124,0.18)] text-[#d2b27c]"
                            }`}
                          >
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-2 text-sm leading-7 ${
                          selected ? "text-[#55637a]" : "text-[#afc0d8]"
                        }`}
                      >
                        {plan.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-sans text-5xl font-black tracking-tighter">
                        S/{plan.price}
                      </div>
                      <div
                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                          selected ? "text-[#6a778d]" : "text-[#8ca0bd]"
                        }`}
                      >
                        {plan.dailyLimit} IA/día
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 grid gap-3 md:grid-cols-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={`flex items-start gap-2 rounded-xl border px-3 py-3 text-sm ${
                          selected
                            ? "border-[rgba(16,32,58,0.1)] bg-white/75 text-[#10203a]"
                            : "border-white/8 bg-white/[0.03] text-[#d7e1ef]"
                        }`}
                      >
                        <Check className={`mt-0.5 h-4 w-4 ${selected ? "text-[#1f6e5d]" : "text-[#d2b27c]"}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    <button
                      onClick={() => setSelectedPlanCode(plan.code)}
                      className={
                        selected
                          ? "enterprise-button-primary bg-[#10203a] text-[#f7f2e8]"
                          : "enterprise-button-secondary bg-transparent text-[#f2e8d7] hover:bg-white/10"
                      }
                    >
                      {selected ? "Plan seleccionado" : "Seleccionar plan"}
                    </button>
                  </div>
                </motion.div>
              );
            })}

            <div className="rounded-[1.75rem] border border-[rgba(210,178,124,0.22)] bg-[rgba(239,230,214,0.9)] px-5 py-5 text-sm text-[#5f4b2d]">
              Plan elegido: <strong>{selectedPlan.name}</strong> (S/{selectedPlan.price}/mes,{" "}
              {selectedPlan.dailyLimit} IA/día)
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePaymentClick}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#10203a] px-6 text-sm font-bold text-[#f7f2e8] shadow-[0_16px_30px_rgba(16,32,58,0.18)] transition hover:bg-[#162947]"
              >
                {mainButtonLabel}
              </button>
              <a
                href={secondaryHref}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.16)] px-6 text-sm font-semibold text-[#f5efe5] transition hover:bg-white/10"
              >
                {secondaryLabel}
              </a>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[2rem] border border-white/10 bg-[#142541] p-8">
              <h3 className="text-3xl text-[#f4ede3]">Cómo avanza tu cuenta</h3>
              <div className="mt-6 space-y-4 text-sm text-[#b7c5d8]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
                  <div className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-[#d2b27c]">
                    1. Selección de plan
                  </div>
                  <p className="mt-2 leading-7">Eliges Start, Pro o Institucional según tu carga real.</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
                  <div className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-[#d2b27c]">
                    2. Pago por Yape
                  </div>
                  <p className="mt-2 leading-7">
                    Escaneas el QR, subes el comprobante y el sistema realiza prechequeo inmediato.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
                  <div className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-[#d2b27c]">
                    3. Activación final
                  </div>
                  <p className="mt-2 leading-7">
                    El admin confirma y la cuenta entra con el cupo correspondiente al plan elegido.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#1a2e51_0%,#142541_100%)] p-8">
              <div className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#d2b27c]">
                Política comercial
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[#d7e1ef]">
                <li>Pago manual exclusivo por Yape.</li>
                <li>Prevalidación IA para acelerar revisión y detectar inconsistencias.</li>
                <li>Activación final solo por aprobación administrativa.</li>
                <li>Sin reembolsos por activaciones digitales ya ejecutadas.</li>
              </ul>
              <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-xs leading-6 text-[#cfd9e6]">
                Las propuestas generadas por IA son apoyo pedagógico y requieren revisión final del
                docente antes de su aplicación en aula.
              </div>
              <LegalLinks
                className="mt-4 flex flex-wrap gap-4 text-xs text-[#cfd9e6]"
                linkClassName="font-semibold text-[#f5efe5] hover:text-[#d2b27c]"
              />
            </div>
          </div>
        </div>
      </div>

      <SubscriptionModal
        key={selectedPlan.code}
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        selectedPlan={selectedPlan}
      />
    </section>
  );
};
