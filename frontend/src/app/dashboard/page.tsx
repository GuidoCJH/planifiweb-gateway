"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  FileClock,
  LogOut,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiFetch, parseApiError } from "@/lib/api";
import { AccountAccessPanel } from "@/components/AccountAccessPanel";
import { LegalAcceptanceCard } from "@/components/LegalAcceptanceCard";
import { PasswordSecurityCard } from "@/components/PasswordSecurityCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { APP_ENTRY_URL, requiresCheckout } from "@/lib/subscription";
import { formatDisplayName } from "@/lib/utils";

const STATUS_COPY: Record<string, { title: string; tone: string; message: string }> = {
  awaiting_payment: {
    title: "Cuenta lista para activar",
    tone: "border-[rgba(185,144,90,0.24)] bg-[rgba(239,230,214,0.9)] text-[#6b5330]",
    message: "Aún falta completar la activación. Cuando subas el comprobante podrás continuar a la app.",
  },
  pending_review: {
    title: "Activación en revisión",
    tone: "border-[rgba(52,81,123,0.24)] bg-[rgba(228,236,247,0.92)] text-[#29486d]",
    message: "Tu comprobante ya fue enviado. Mientras se valida, tu cuenta mantiene acceso inicial.",
  },
  active: {
    title: "Suscripción activa",
    tone: "border-[rgba(43,122,91,0.22)] bg-[rgba(228,245,236,0.92)] text-[#1e6a53]",
    message: "Tu acceso está activo y PLANIFIWEB ya se encuentra disponible con exportación habilitada.",
  },
  rejected: {
    title: "Comprobante observado",
    tone: "border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] text-[#8d2f2f]",
    message: "Debes volver a cargar un comprobante válido para reactivar tu proceso.",
  },
  expired: {
    title: "Suscripción vencida",
    tone: "border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] text-[#8d2f2f]",
    message: "Tu acceso ya no se encuentra vigente. Renueva la suscripción para continuar.",
  },
  suspended: {
    title: "Cuenta suspendida",
    tone: "border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] text-[#8d2f2f]",
    message: "El acceso se encuentra suspendido temporalmente.",
  },
};

interface PaymentPrecheck {
  ai_verification_status: "processing" | "likely_valid" | "unclear" | "likely_invalid" | "unavailable";
  ai_confidence: number;
  ai_summary: string;
  ai_extracted_amount?: number | null;
  ai_extracted_method?: string | null;
  ai_extracted_operation_code?: string | null;
  ai_extracted_paid_at?: string | null;
  ai_extracted_destination?: string | null;
  ai_duplicate_hash_match: boolean;
  ai_duplicate_operation_match: boolean;
}

interface PaymentHistoryItem {
  id: number;
  status: string;
  plan: string;
  amount: number;
  currency: string;
  payment_method: string;
  created_at: string;
  precheck: PaymentPrecheck;
}

function DashboardPageContent() {
  const { user, session, logout, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manualCheckoutOpen, setManualCheckoutOpen] = useState(false);
  const [latestPayment, setLatestPayment] = useState<PaymentHistoryItem | null>(null);
  const checkoutRequested = searchParams.get("checkout") === "1";
  const requestedMode =
    searchParams.get("mode") === "login" ? "login" : "register";

  useEffect(() => {
    if (!loading && session && checkoutRequested) {
      if (requiresCheckout(session.subscription_status)) return;
      router.replace("/dashboard");
    }
  }, [checkoutRequested, loading, router, session]);

  useEffect(() => {
    if (!user || !session || session.subscription_status !== "pending_review") {
      setLatestPayment(null);
      return;
    }

    let cancelled = false;
    const fetchLatestPayment = async () => {
      try {
        const response = await apiFetch("/api/payments/history", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }
        const history = (await response.json()) as PaymentHistoryItem[];
        if (!cancelled) {
          setLatestPayment(history[0] ?? null);
        }
      } catch (error) {
        console.error("Failed to load payment history", error);
        if (!cancelled) {
          setLatestPayment(null);
        }
      }
    };

    void fetchLatestPayment();
    return () => {
      cancelled = true;
    };
  }, [session, user]);

  if (loading) {
    return (
      <div className="enterprise-page flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#b9905a] border-t-transparent" />
      </div>
    );
  }

  if (!user || !session) {
    return (
      <div className="enterprise-page px-6 py-10">
        <AccountAccessPanel
          checkoutRequested={checkoutRequested}
          initialMode={requestedMode}
        />
      </div>
    );
  }

  const statusCard =
    STATUS_COPY[session.subscription_status] ?? STATUS_COPY.awaiting_payment;
  const firstName = formatDisplayName(user.name).split(" ")[0] || "Docente";
  const remaining = Math.max(session.daily_limit - session.daily_used, 0);
  const needsCheckout = requiresCheckout(session.subscription_status);
  const showCheckout = manualCheckoutOpen || (checkoutRequested && needsCheckout);
  const legalBlocked = session.legal.acceptance_required;

  const openCheckout = () => {
    setManualCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setManualCheckoutOpen(false);
    if (checkoutRequested) {
      router.replace("/dashboard");
    }
  };

  return (
    <div className="enterprise-page px-6 py-10 text-[#10203a]">
      <div className="mx-auto max-w-7xl">
        <header className="enterprise-card px-8 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="enterprise-badge">
                <ShieldCheck className="h-3.5 w-3.5" /> Centro de acceso
              </div>
              <h1 className="enterprise-title mt-6">
                {firstName}, tu panel principal de PLANIFIWEB
              </h1>
              <p className="enterprise-copy mt-5 max-w-2xl text-sm">
                Desde aquí controlas estado, cupo, activación y entrada al
                espacio de trabajo con una vista más clara y más institucional.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {needsCheckout && (
                <button
                  onClick={openCheckout}
                  className="enterprise-button-primary bg-[#b9905a] text-[#10203a] shadow-[0_16px_34px_rgba(185,144,90,0.22)] hover:bg-[#c89f68]"
                >
                  <CreditCard className="h-4 w-4" /> Activar suscripción
                </button>
              )}
              {user.is_admin && (
                <Link href="/admin" className="enterprise-button-secondary">
                  <Shield className="h-4 w-4" /> Panel admin
                </Link>
              )}
              <a
                href={APP_ENTRY_URL}
                className={`enterprise-button-primary ${session.can_access_app && !legalBlocked ? "" : "pointer-events-none opacity-50"}`}
              >
                Entrar a la app <ArrowRight className="h-4 w-4" />
              </a>
              <button onClick={logout} className="enterprise-button-secondary">
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <div className={`mt-8 rounded-[1.8rem] border px-6 py-5 ${statusCard.tone}`}>
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 h-5 w-5" />
            <div>
              <div className="font-sans text-base font-bold">{statusCard.title}</div>
              <p className="mt-1 text-sm leading-7">{statusCard.message}</p>
            </div>
          </div>
        </div>

        {session.subscription_status === "pending_review" && latestPayment && (
          <div
            className={`mt-6 rounded-[1.8rem] border px-6 py-5 ${
              latestPayment.precheck.ai_verification_status === "likely_valid"
                ? "border-[rgba(43,122,91,0.22)] bg-[rgba(228,245,236,0.92)] text-[#1e6a53]"
                : latestPayment.precheck.ai_verification_status === "likely_invalid"
                  ? "border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] text-[#8d2f2f]"
                  : latestPayment.precheck.ai_verification_status === "unclear"
                    ? "border-[rgba(185,144,90,0.24)] bg-[rgba(239,230,214,0.92)] text-[#6b5330]"
                    : "border-[rgba(52,81,123,0.24)] bg-[rgba(228,236,247,0.92)] text-[#29486d]"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-bold uppercase tracking-[0.18em]">
                  Prechequeo instantáneo del comprobante
                </div>
                <p className="mt-2 text-sm leading-7">{latestPayment.precheck.ai_summary}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-white/70 px-3 py-1 text-[#10203a]">
                  Confianza {latestPayment.precheck.ai_confidence}%
                </span>
                {latestPayment.precheck.ai_extracted_operation_code && (
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[#10203a]">
                    Operación {latestPayment.precheck.ai_extracted_operation_code}
                  </span>
                )}
                {latestPayment.precheck.ai_duplicate_hash_match && (
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[#8d2f2f]">
                    Archivo duplicado
                  </span>
                )}
                {latestPayment.precheck.ai_duplicate_operation_match && (
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[#8d2f2f]">
                    Código repetido
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {legalBlocked && <LegalAcceptanceCard />}

        <PasswordSecurityCard />

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Estado actual",
              value: session.subscription_status.replace("_", " "),
              capitalize: true,
            },
            {
              label: "Cupo diario",
              value: `${session.daily_used}/${session.daily_limit}`,
            },
            {
              label: "Restante hoy",
              value: `${remaining}`,
            },
            {
              label: "Exportación",
              value: session.exports_enabled ? "Activa" : "Bloqueada",
            },
          ].map((item) => (
            <div key={item.label} className="enterprise-card px-6 py-6">
              <div className="text-sm font-medium text-[#627089]">{item.label}</div>
              <div
                className={`mt-3 font-sans text-4xl font-black text-[#10203a] ${item.capitalize ? "capitalize" : ""}`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="enterprise-card px-8 py-8">
            <div className="enterprise-kicker">Ruta operativa</div>
            <h2 className="mt-4 text-3xl text-[#10203a]">
              Cómo avanza tu cuenta dentro del sistema
            </h2>
            <div className="mt-8 space-y-5">
              {[
                {
                  icon: CreditCard,
                  color: "text-[#b9905a]",
                  title: "1. Activación inicial",
                  description:
                    "Aquí se registra la cuenta, se elige el plan y se carga el comprobante desde el mismo flujo.",
                },
                {
                  icon: FileClock,
                  color: "text-[#35517b]",
                  title: "2. Revisión administrativa",
                  description:
                    "El sistema deja trazabilidad clara para que la aprobación o rechazo no dependa de pasos manuales sueltos.",
                },
                {
                  icon: ShieldCheck,
                  color: "text-[#1e6a53]",
                  title: "3. Continuidad hacia la app",
                  description:
                    "Cuando la cuenta queda lista, PLANIFIWEB utiliza el mismo acceso para entrar y seguir trabajando.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="enterprise-soft-panel flex items-start gap-4 px-5 py-5"
                  >
                    <div className="mt-0.5 rounded-2xl bg-white px-3 py-3 shadow-[0_10px_24px_rgba(16,32,58,0.06)]">
                      <Icon className={`h-4 w-4 ${item.color}`} />
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
                );
              })}
            </div>
          </section>

          <section className="enterprise-card-dark px-8 py-8">
            <div className="enterprise-badge-dark">
              <Sparkles className="h-4 w-4" /> Estado operativo
            </div>
            <div className="mt-6 space-y-4 text-sm text-[#d5deeb]">
              {[
                { label: "Puede entrar a la app", value: session.can_access_app ? "Sí" : "No" },
                { label: "Plan activo", value: session.active_plan ?? "Sin activar" },
                { label: "Scope", value: session.subscription_scope },
                { label: "Uso hoy", value: `${session.daily_used}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[1.4rem] border border-white/8 bg-white/[0.04] px-5 py-4"
                >
                  <span>{item.label}</span>
                  <strong className="font-sans text-[#f4ede3]">{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-[#35517a] bg-[#142541] px-5 py-5 text-sm leading-7 text-[#d7e1ef]">
              {needsCheckout ? (
                <div className="space-y-4">
                  <div>
                    Tu siguiente paso es elegir un plan, pagar por Yape y subir el comprobante para habilitar la continuidad completa.
                  </div>
                  <button
                    onClick={openCheckout}
                    className="enterprise-button-primary bg-[#d2b27c] text-[#10203a] hover:bg-[#dec08d]"
                  >
                    Pagar y subir comprobante
                  </button>
                </div>
              ) : session.can_access_app ? (
                <span>
                  Tu cuenta ya puede continuar a <code>{APP_ENTRY_URL}</code>.
                </span>
              ) : session.subscription_status === "pending_review" ? (
                <span>
                  El comprobante ya fue enviado. Solo espera la confirmación
                  administrativa o vuelve a subir uno nuevo si se te solicita.
                </span>
              ) : (
                <span>
                  Si aún no activaste tu cuenta, completa la suscripción para
                  avanzar.
                </span>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-[#92a3bb]">
              <Clock3 className="h-4 w-4" />
              El conteo diario se reinicia cada día calendario del servidor.
            </div>
          </section>
        </div>
      </div>
      <SiteFooter />
      <SubscriptionModal
        open={showCheckout}
        onClose={closeCheckout}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="enterprise-page flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#b9905a] border-t-transparent" />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}




