"use client";

import { Check, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { LegalLinks } from "@/components/LegalLinks";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";

interface PricingProps {
  selectedPlanCode: string;
  onSelectPlan: (planCode: string) => void;
  onContinueWithPlan: (planCode: string) => void;
}

export const Pricing = ({
  selectedPlanCode,
  onSelectPlan,
  onContinueWithPlan,
}: PricingProps) => {
  const { user, session } = useAuth();

  const flowLabel = !user || !session
    ? "Elegir plan y continuar con mi cuenta"
    : session.can_access_app
      ? "Entrar a la app"
      : "Elegir plan y pagar por Yape";

  return (
    <section id="pricing" className="bg-[#10203a] px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2e4d79] bg-[#142541] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#d2b27c]">
            <GraduationCap className="h-4 w-4" /> Suscripción oficial PLANIFIWEB
          </div>
          <h2 className="mt-6 text-4xl leading-tight text-[#f5efe5] md:text-5xl">
            Elige el plan que mejor encaja con tu ritmo de trabajo y continúa desde aquí mismo.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#b7c5d8]">
            Los tres planes usan Yape como único medio de pago. Primero eliges plan, luego accedes
            o confirmas tu cuenta, subes el comprobante y continúas a la app sin volver al panel de
            cuenta como paso obligatorio.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const selected = plan.code === selectedPlanCode;
            return (
              <motion.article
                key={plan.code}
                whileHover={{ y: -3 }}
                className={`rounded-[2rem] border p-6 transition ${
                  selected
                    ? "border-[#d2b27c] bg-[#f8f3ea] text-[#10203a] shadow-[0_22px_54px_rgba(7,13,25,0.26)]"
                    : "border-white/10 bg-[#142541] text-[#dbe3f1]"
                }`}
              >
                <div className="flex min-h-[10rem] flex-col gap-4 lg:justify-between">
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

                  <div className="text-left">
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

                <ul className="mt-5 grid gap-3">
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

                <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm leading-7">
                  <div className={`font-semibold ${selected ? "text-[#10203a]" : "text-[#f5efe5]"}`}>
                    {plan.code === "planifiweb_start"
                      ? "Ideal para empezar con orden sin una inversión alta."
                      : plan.code === "planifiweb_pro"
                        ? "Pensado para el docente que trabaja de forma continua durante la semana."
                        : "Diseñado para carga alta o uso intensivo con necesidades más amplias."}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      onSelectPlan(plan.code);
                      onContinueWithPlan(plan.code);
                    }}
                    className={
                      selected
                        ? "enterprise-button-primary bg-[#10203a] text-[#f7f2e8]"
                        : "enterprise-button-secondary bg-transparent text-[#f2e8d7] hover:bg-white/10"
                    }
                  >
                    {selected ? flowLabel : `Elegir ${plan.name}`}
                  </button>
                  {!selected && (
                    <button
                      onClick={() => onSelectPlan(plan.code)}
                      className="text-sm font-semibold text-[#d2b27c] transition hover:text-white"
                    >
                      Solo seleccionar para comparar
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.8rem] border border-[rgba(210,178,124,0.22)] bg-[rgba(239,230,214,0.92)] px-6 py-5 text-sm leading-7 text-[#6b5330]">
            Plan elegido: <strong>{SUBSCRIPTION_PLANS.find((plan) => plan.code === selectedPlanCode)?.name}</strong>. Al continuar, si aún no accediste, la landing te lleva al bloque de cuenta; cuando termines, se abre el pago del plan elegido sin enviarte primero al dashboard.
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-6 py-5 text-sm leading-7 text-[#d7e1ef]">
            Pago único visible por <strong>Yape</strong>, prechequeo del comprobante y activación final por revisión administrativa.
          </div>
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,#1a2e51_0%,#142541_100%)] px-6 py-5">
          <div className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#d2b27c]">
            Condiciones del servicio
          </div>
          <div className="mt-4 grid gap-4 text-sm leading-7 text-[#d7e1ef] md:grid-cols-2">
            <div>
              La cuenta entra con el cupo diario del plan aprobado. Las propuestas generadas por IA
              siguen requiriendo revisión profesional del docente antes de su uso en aula.
            </div>
            <div>
              No hay reembolsos por activaciones digitales ya procesadas. El flujo de pago sigue
              dentro de esta misma página para reducir pasos innecesarios.
            </div>
          </div>
          <LegalLinks
            className="mt-5 flex flex-wrap gap-4 text-xs text-[#cfd9e6]"
            linkClassName="font-semibold text-[#f5efe5] hover:text-[#d2b27c]"
          />
        </div>
      </div>
    </section>
  );
};
