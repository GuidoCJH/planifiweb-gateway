"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Download, Expand, Smartphone } from "lucide-react";
import { UploadProof } from "./UploadProof";
import { LegalLinks } from "./LegalLinks";
import {
  APP_ENTRY_URL,
  getSubscriptionPlan,
  MAIN_PLAN,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/lib/subscription";

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  selectedPlan?: SubscriptionPlan;
  title?: string;
  description?: string;
}

export const SubscriptionModal = ({
  open,
  onClose,
  selectedPlan = MAIN_PLAN,
  title,
  description,
}: SubscriptionModalProps) => {
  const [selectedPlanCode, setSelectedPlanCode] = useState(selectedPlan.code);
  const activePlan = getSubscriptionPlan(selectedPlanCode);
  const modalTitle = title ?? `Pago manual de ${activePlan.name} (S/${activePlan.price})`;
  const modalDescription =
    description ??
    "Escanea el QR de Yape y luego sube tu comprobante. El monto se valida según el plan seleccionado.";

  const activeMethod = {
    id: "yape",
    label: "Yape",
    accent: "text-[#00ba51]",
    helper:
      "Pago oficial por Yape. Si tu banco permite escanear códigos Yape, también puedes pagarlo desde ahí.",
    image: "/payments/yape-qr.jpg",
    icon: Smartphone,
  } as const;
  const ActiveMethodIcon = activeMethod.icon;
  const qrDownloadName = `planifiweb-${activeMethod.id}-qr.jpg`;

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#08111f]/78 backdrop-blur-sm"
          />

          <div className="relative z-10 flex min-h-full items-center justify-center py-2 sm:py-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="enterprise-card relative w-full max-w-[980px] overflow-hidden"
            >
              <div className="sticky top-0 z-20 flex justify-end border-b border-[rgba(16,32,58,0.08)] bg-[rgba(252,250,245,0.96)] px-4 py-3 backdrop-blur sm:px-5">
                <button
                  onClick={onClose}
                  className="enterprise-button-secondary h-10 px-4 text-sm"
                >
                  Cerrar
                </button>
              </div>

              <div className="max-h-[calc(92dvh-4.5rem)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                <div className="max-w-3xl">
                  <div className="enterprise-badge">Activación guiada</div>
                  <h3 className="mt-4 text-[1.7rem] text-[#10203a] sm:text-[2rem]">{modalTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5a6880]">{modalDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const selected = plan.code === activePlan.code;
                      return (
                        <button
                          key={plan.code}
                          onClick={() => setSelectedPlanCode(plan.code)}
                          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${
                            selected
                              ? "bg-[#10203a] text-[#f5efe5]"
                              : "border border-[rgba(16,32,58,0.14)] bg-white/80 text-[#5a6880] hover:bg-white"
                          }`}
                        >
                          {plan.name} · S/{plan.price}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="order-2 space-y-5 lg:order-1">
                    <section className="rounded-[1.6rem] border border-[rgba(16,32,58,0.08)] bg-[rgba(255,255,255,0.72)] p-4">
                      <div className="enterprise-kicker">1. Método habilitado</div>
                      <div className="mt-3 rounded-[1.25rem] border border-[rgba(16,32,58,0.18)] bg-[#10203a] p-3 text-white shadow-[0_18px_34px_rgba(16,32,58,0.12)]">
                        <div className="flex items-start gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.12)] bg-white">
                            <Image
                              src={activeMethod.image}
                              alt={`${activeMethod.label} preview`}
                              fill
                              sizes="48px"
                              className="object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className={`flex items-center gap-2 text-sm font-bold ${activeMethod.accent}`}>
                              <ActiveMethodIcon className="h-4 w-4" />
                              <span>{activeMethod.label}</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[#cfd9e8]">
                              {activeMethod.helper}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[1.6rem] border border-[rgba(16,32,58,0.08)] bg-[rgba(255,255,255,0.72)] p-4">
                      <div className="mb-3">
                        <div className="enterprise-kicker">3. Sube tu comprobante</div>
                        <p className="mt-2 text-sm leading-6 text-[#5a6880]">
                          El comprobante quedará asociado al pago por Yape que registres aquí.
                        </p>
                      </div>
                      <UploadProof
                        planCode={activePlan.code}
                        planName={activePlan.name}
                        amount={activePlan.price}
                        onClose={onClose}
                        successRedirectTo={APP_ENTRY_URL}
                      />
                      <div className="mt-3 rounded-[1.2rem] border border-[rgba(16,32,58,0.08)] bg-[#f5efe4] px-3 py-3 text-[11px] leading-5 text-[#5f4b2d]">
                        La activación digital no contempla reembolsos por uso parcial ni por expectativa subjetiva sobre el estilo de salida. Las propuestas generadas por IA requieren revisión pedagógica final.
                      </div>
                      <LegalLinks
                        className="mt-3 flex flex-wrap gap-3 text-[11px]"
                        linkClassName="font-semibold text-[#10203a] hover:text-[#8a6840]"
                      />
                    </section>
                  </div>

                  <motion.section
                    key={activeMethod.id}
                    initial={{ opacity: 0.7, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="order-1 enterprise-card-dark self-start px-4 py-4 sm:px-5 sm:py-5 lg:order-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="enterprise-kicker text-[#d2b27c]">
                          2. Escanea el código
                        </div>
                        <div className={`mt-2 flex items-center gap-2 text-sm font-bold ${activeMethod.accent}`}>
                          <ActiveMethodIcon className="h-4 w-4" />
                          <span>{activeMethod.label}</span>
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-[#dce5f2]">
                        <span className="inline-flex items-center gap-2">
                          <Expand className="h-3.5 w-3.5" /> QR ampliado
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.5rem] border border-white/8 bg-white/[0.05] px-3 py-4">
                      <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-[1.25rem] border border-white/8 bg-white sm:max-w-[250px] lg:max-w-[280px]">
                        <Image
                          src={activeMethod.image}
                          alt={`${activeMethod.label} QR grande`}
                          fill
                          sizes="(max-width: 640px) 62vw, (max-width: 1024px) 260px, 280px"
                          className="object-contain p-2"
                          priority
                        />
                      </div>
                      <div className="mt-4 lg:hidden">
                        <a
                          href={activeMethod.image}
                          download={qrDownloadName}
                          className="enterprise-button-secondary flex w-full items-center justify-center gap-2 border-white/12 bg-white/[0.08] text-[#f5efe5] hover:bg-white/[0.14]"
                        >
                          <Download className="h-4 w-4" />
                          Descargar QR
                        </a>
                        <p className="mt-2 text-center text-[11px] leading-5 text-[#cdd8e6]">
                          Si estás pagando desde el mismo celular, descarga el QR para abrirlo desde tu galería o compartirlo a otro dispositivo.
                        </p>
                      </div>
                      <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-6 text-[#cdd8e6]">
                        {activeMethod.helper} Luego sube abajo la captura o foto del comprobante para cerrar el proceso.
                      </p>
                    </div>
                  </motion.section>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
