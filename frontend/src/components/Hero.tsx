"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-36">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,_rgba(185,144,90,0.16),_transparent_34%),linear-gradient(180deg,_#f6f2e9_0%,_#f2ede2_52%,_#f5f0e7_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(16,32,58,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,32,58,0.05)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />

      <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-3xl text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(16,32,58,0.12)] bg-[rgba(252,250,245,0.9)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6840]"
          >
            <Sparkles className="h-3 w-3 text-[#b9905a]" />
            <span>Planificación curricular peruana con estándar profesional</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-5xl text-5xl leading-[0.95] text-[#10203a] md:text-7xl"
          >
            Diseña sesiones, unidades y evaluaciones con una plataforma que se
            siente seria desde el primer paso.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg leading-8 text-[#5a6880] md:text-xl"
          >
            PLANIFIWEB organiza tu acceso, acelera tu producción curricular y
            te lleva directo a herramientas pensadas para docentes que trabajan
            con criterio, tiempos ajustados y exigencia real de aula.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row"
          >
            <Link
              href="/dashboard?checkout=1"
              className="inline-flex h-14 items-center gap-2 rounded-full bg-[#10203a] px-8 text-base font-semibold text-[#f8f3ea] shadow-[0_18px_34px_rgba(16,32,58,0.22)] transition hover:bg-[#162947]"
            >
              Activar mi acceso <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center gap-2 rounded-full border border-[rgba(16,32,58,0.15)] bg-[rgba(252,250,245,0.92)] px-8 text-base font-semibold text-[#10203a] transition hover:bg-white"
            >
              Ir a mi cuenta
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            {[
              { value: "Un solo acceso", label: "para entrar, activar y continuar" },
              { value: "Menos retrabajo", label: "en sesiones, fichas y evaluaciones" },
              { value: "Más claridad", label: "en tu flujo de cuenta y suscripción" },
            ].map((item) => (
              <div
                key={item.value}
                className="rounded-[1.6rem] border border-[rgba(16,32,58,0.10)] bg-[rgba(252,250,245,0.88)] px-5 py-5 shadow-[0_10px_25px_rgba(16,32,58,0.06)]"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6840]">
                  {item.value}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5a6880]">{item.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -right-6 top-10 -z-10 h-56 w-56 rounded-full bg-[#cbb38b]/20 blur-3xl" />
          <div className="overflow-hidden rounded-[2.25rem] border border-[rgba(16,32,58,0.10)] bg-[#10203a] text-white shadow-[0_36px_90px_rgba(15,27,48,0.28)]">
            <div className="border-b border-white/10 px-8 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.26em] text-[#cbb38b]">
                    Ruta de activación
                  </p>
                  <h3 className="mt-2 text-3xl text-[#f6efe3]">
                    Una entrada clara hasta tu espacio de trabajo
                  </h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8e0ee]">
                  Acceso guiado
                </div>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-white/10 px-8 py-8 md:border-b-0 md:border-r">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#34517b] bg-[#162947] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6c5da]">
                  <BookOpen className="h-3.5 w-3.5" /> Desde la cuenta a la app
                </div>
                <div className="space-y-4">
                  {[
                    "Crea tu cuenta y activa tu suscripción desde un mismo panel.",
                    "Sigue el estado de tu acceso sin perderte entre pantallas.",
                    "Continúa directo a PLANIFIWEB cuando tu cuenta esté lista.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm leading-6 text-[#dce6f7]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-8 py-8">
                <div className="space-y-4">
                  {[
                    {
                      title: "1. Activa tu cuenta",
                      description: "Registro simple, panel claro y acceso listo para continuar.",
                    },
                    {
                      title: "2. Completa tu suscripción",
                      description: "Pago y comprobante dentro del mismo flujo, sin pasos innecesarios.",
                    },
                    {
                      title: "3. Entra a crear",
                      description: "Sesiones, unidades, exámenes y rúbricas en un solo entorno.",
                    },
                  ].map((step) => (
                    <div
                      key={step.title}
                      className="rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-5"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#d2b27c]" />
                        <div>
                          <div className="font-sans text-base font-semibold text-[#f5efe5]">
                            {step.title}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#b8c6da]">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-[#35517a] bg-[#142541] px-5 py-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-[#d2b27c]" />
                    <div>
                      <div className="font-sans text-sm font-semibold uppercase tracking-[0.18em] text-[#d2b27c]">
                        Trabajo con criterio
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#d7e1ef]">
                        Pensado para que el docente sienta orden, confianza y
                        continuidad antes de entrar a producir su material.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
