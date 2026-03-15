export const FALLBACK_SITE_URL = "https://planifiweb-gateway.vercel.app";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL;
export const SITE_NAME = "PLANIFIWEB";
export const SITE_DESCRIPTION =
  "PLANIFIWEB ayuda a docentes del Perú a organizar planificación curricular CNEB, sesiones de aprendizaje, unidades y evaluación por competencias desde una misma plataforma.";
export const TELEGRAM_SUPPORT_URL = "https://t.me/guidojh";
export const INDEXNOW_KEY = "8ecf566c05434da9a552759d5c827b91";

export type PublicGuideSummary = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  searchIntent: string;
};

export const publicGuideSummaries: PublicGuideSummary[] = [
  {
    slug: "planificacion-curricular-cneb",
    title: "Planificación curricular CNEB para docentes del Perú",
    description:
      "Guía pública para organizar el plan anual, las unidades y la continuidad pedagógica con criterios claros y alineados al Currículo Nacional.",
    eyebrow: "Planificación curricular",
    searchIntent: "planificación curricular cneb",
  },
  {
    slug: "sesion-de-aprendizaje",
    title: "Cómo estructurar una sesión de aprendizaje con más coherencia",
    description:
      "Explicación práctica de propósito, situación significativa, secuencia didáctica, evidencias y cierre para docentes que trabajan con el CNEB.",
    eyebrow: "Sesión de aprendizaje",
    searchIntent: "sesión de aprendizaje",
  },
  {
    slug: "unidad-de-aprendizaje",
    title: "Unidad de aprendizaje: cómo articular competencias, producto y secuencia",
    description:
      "Guía para diseñar unidades de aprendizaje con reto, producto final, criterios y experiencias alineadas a la progresión del área.",
    eyebrow: "Unidad de aprendizaje",
    searchIntent: "unidad de aprendizaje",
  },
  {
    slug: "evaluacion-por-competencias",
    title: "Evaluación por competencias: criterios, evidencias e instrumentos",
    description:
      "Resumen operativo para definir criterios, evidencias, instrumentos y retroalimentación sin perder la lógica pedagógica del CNEB.",
    eyebrow: "Evaluación por competencias",
    searchIntent: "evaluación por competencias",
  },
];

export const publicIndexableRoutes = [
  "/",
  "/terminos",
  "/privacidad",
  ...publicGuideSummaries.map((guide) => `/${guide.slug}`),
];
