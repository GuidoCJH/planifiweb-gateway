import { APP_PUBLIC_URL } from "@/lib/discovery";

export type SubscriptionPlan = {
  code: string;
  name: string;
  badge?: string;
  price: number;
  dailyLimit: number;
  description: string;
  features: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    code: "planifiweb_start",
    name: "Start",
    price: 9,
    dailyLimit: 20,
    description:
      "Entrada económica para docentes que quieren ordenar su flujo curricular y empezar rápido.",
    features: [
      "20 generaciones IA por día",
      "Acceso al entorno curricular completo al activar",
      "Pago único por Yape con revisión administrativa",
    ],
  },
  {
    code: "planifiweb_pro",
    name: "Pro",
    badge: "Más elegido",
    price: 19,
    dailyLimit: 60,
    description:
      "Plan recomendado para trabajo continuo en diagnóstico, anual, unidad, sesión y evaluación.",
    features: [
      "60 generaciones IA por día",
      "Exportación a Word/PDF habilitada",
      "Flujo completo para producción curricular semanal",
    ],
  },
  {
    code: "planifiweb_institucional",
    name: "Institucional",
    price: 39,
    dailyLimit: 200,
    description:
      "Capacidad alta para uso intensivo y equipos con volumen de planificación elevado.",
    features: [
      "200 generaciones IA por día",
      "Máxima capacidad operativa diaria",
      "Ideal para coordinación y carga institucional",
    ],
  },
];

export const MAIN_PLAN = SUBSCRIPTION_PLANS[1];
export const APP_ENTRY_PATH = "/dashboard";
export const APP_ENTRY_URL = `${APP_PUBLIC_URL}${APP_ENTRY_PATH}`;

export function getSubscriptionPlan(planCode?: string | null): SubscriptionPlan {
  const normalizedCode = (planCode || "").trim().toLowerCase();
  return SUBSCRIPTION_PLANS.find((plan) => plan.code === normalizedCode) ?? MAIN_PLAN;
}

export function goToApp(path: string = APP_ENTRY_URL): void {
  if (typeof window === "undefined") {
    return;
  }

  if (/^https?:\/\//i.test(path)) {
    window.location.assign(path);
    return;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  window.location.assign(`${APP_PUBLIC_URL}${normalizedPath}`);
}

export function requiresCheckout(status: string): boolean {
  return ["awaiting_payment", "rejected", "expired", "suspended"].includes(status);
}

export function isPendingReview(status: string): boolean {
  return status === "pending_review";
}

export function isActiveSubscription(status: string): boolean {
  return status === "active";
}
