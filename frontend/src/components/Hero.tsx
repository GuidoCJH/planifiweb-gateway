"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  PenSquare,
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
            Ordena tu planificación curricular y deja de perder tiempo rehaciendo sesiones, unidades y evaluaciones.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg leading-8 text-[#5a6880] md:text-xl"
          >
            PLANIFIWEB reúne planificación, sesiones, unidades, fichas y evaluación por competencias en una ruta más seria, más clara y más utilizable para docentes del Perú que trabajan con CNEB.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row"
          >
            <a
              href="#acceso"
              className="inline-flex h-14 items-center gap-2 rounded-full bg-[#10203a] px-8 text-base font-semibold text-[#f8f3ea] shadow-[0_18px_34px_rgba(16,32,58,0.22)] transition hover:bg-[#162947]"
            >
              Crear cuenta y continuar <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#pricing"
              className="inline-flex h-14 items-center gap-2 rounded-full border border-[rgba(16,32,58,0.15)] bg-[rgba(252,250,245,0.92)] px-8 text-base font-semibold text-[#10203a] transition hover:bg-white"
            >
              Ver planes y precios
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            {[
              { value: "Menos retrabajo", label: "al pasar de la idea al documento pedagógico" },
              { value: "Más continuidad", label: "entre anual, unidad, sesión y evaluación" },
              { value: "Un solo flujo", label: "para conocer el servicio, pagar y entrar a la app" },
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
                      Lo que entra en juego
                    </p>
                    <h3 className="mt-2 text-3xl text-[#f6efe3]">
                      Un entorno de trabajo para sostener planificación, sesiones y evaluación
                    </h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8e0ee]">
                    Trabajo docente
                  </div>
                </div>
              </div>

              <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                <div className="border-b border-white/10 px-8 py-8 md:border-b-0 md:border-r">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#34517b] bg-[#162947] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6c5da]">
                    <BookOpen className="h-3.5 w-3.5" /> Qué puedes construir
                  </div>
                  <div className="space-y-4">
                  {[
                    "Planificación anual y trabajo curricular con mayor continuidad.",
                    "Unidades, sesiones, fichas y evaluaciones dentro del mismo entorno.",
                    "Una experiencia más clara desde el acceso hasta la entrada a la app.",
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
                <div className="grid gap-4">
                  {[
                    {
                      title: "Diagnóstico y planificación",
                      description: "Ordena el punto de partida y proyecta el trabajo anual con una base más consistente.",
                      icon: FileSpreadsheet,
                    },
                    {
                      title: "Unidad y sesión",
                      description: "Desarrolla experiencias con más relación entre propósito, evidencias y secuencia.",
                      icon: PenSquare,
                    },
                    {
                      title: "Evaluación y salida",
                      description: "Mantén criterios, instrumentos y exportación dentro del mismo sistema.",
                      icon: Blocks,
                    },
                  ].map((step) => {
                    const Icon = step.icon;
                    return (
                    <div
                      key={step.title}
                      className="rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1b3157] text-[#d2b27c]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans text-base font-semibold text-[#f5efe5]">
                            {step.title}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#b8c6da]">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-[#35517a] bg-[#142541] px-5 py-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#d2b27c]" />
                    <div>
                      <div className="font-sans text-sm font-semibold uppercase tracking-[0.18em] text-[#d2b27c]">
                        Resultado esperado
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#d7e1ef]">
                        Un flujo comercial más simple: primero entiendes el servicio, luego abres tu cuenta, eliges plan, pagas y entras a trabajar.
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
