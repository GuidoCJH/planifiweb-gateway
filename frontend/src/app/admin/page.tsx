"use client";
/* eslint-disable @next/next/no-img-element */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch, buildApiUrl, parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { APP_ENTRY_URL } from "@/lib/subscription";
import { formatDisplayName } from "@/lib/utils";
import { SiteFooter } from "@/components/SiteFooter";

type PaymentStatusFilter = "all" | "pending" | "approved" | "rejected" | "fraudulent";
type PaymentStatus = "pending" | "approved" | "rejected" | "fraudulent";
type PrecheckFilter = "all" | "likely_valid" | "unclear" | "likely_invalid" | "unavailable";

interface PaymentPrecheck {
  ai_verification_status: "processing" | "likely_valid" | "unclear" | "likely_invalid" | "unavailable";
  ai_confidence: number;
  ai_summary: string;
  ai_extracted_amount?: number | null;
  ai_extracted_method?: string | null;
  ai_extracted_operation_code?: string | null;
  ai_extracted_paid_at?: string | null;
  ai_extracted_destination?: string | null;
  ai_extracted_destination_name_masked?: string | null;
  ai_extracted_phone_last3?: string | null;
  ai_extracted_security_code?: string | null;
  ai_duplicate_hash_match: boolean;
  ai_duplicate_operation_match: boolean;
}

interface AdminPayment {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  user_subscription_status: string;
  product_code: string;
  plan: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  has_receipt: boolean;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: number | null;
  fraud_flagged_at?: string | null;
  fraud_flagged_by?: number | null;
  fraud_reason?: string | null;
  precheck: PaymentPrecheck;
}

interface AdminSummary {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  fraudulent: number;
}

interface AdminPaymentsResponse {
  items: AdminPayment[];
  total: number;
  limit: number;
  offset: number;
  summary: AdminSummary;
}

const EMPTY_SUMMARY: AdminSummary = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  fraudulent: 0,
};

function resolveReceiptUrl(paymentId: number): string {
  return buildApiUrl(`/api/payments/${paymentId}/receipt`);
}

function AdminPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [summary, setSummary] = useState<AdminSummary>(EMPTY_SUMMARY);
  const [filter, setFilter] = useState<PaymentStatusFilter>("pending");
  const [precheckFilter, setPrecheckFilter] = useState<PrecheckFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(12);
  const [offset, setOffset] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/dashboard?mode=login");
      return;
    }

    if (!loading && user && !user.is_admin) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOffset(0);
      setSearchQuery(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!user?.is_admin) {
      if (!loading) {
        setPageLoading(false);
      }
      return;
    }

    let cancelled = false;

    const fetchPayments = async () => {
      setPageLoading(true);
      setPageError(null);
      try {
        const params = new URLSearchParams();
        if (filter !== "all") {
          params.set("status", filter);
        }
        if (precheckFilter !== "all") {
          params.set("precheck_status", precheckFilter);
        }
        if (searchQuery) {
          params.set("query", searchQuery);
        }
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const response = await apiFetch(`/api/admin/payments?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const data = (await response.json()) as AdminPaymentsResponse;
        if (!cancelled) {
          setPayments(data.items);
          setSummary(data.summary);
          setTotal(data.total);
          setLimit(data.limit);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setPageError(
            error instanceof Error ? error.message : "No se pudo cargar el panel admin.",
          );
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    void fetchPayments();

    return () => {
      cancelled = true;
    };
  }, [filter, limit, loading, offset, precheckFilter, refreshTick, searchQuery, user]);

  const reviewPayment = async (
    paymentId: number,
    status: PaymentStatus,
    reason?: string,
  ) => {
    setActionId(paymentId);
    setPageError(null);

    try {
      const response = await apiFetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, reason }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const updated = (await response.json()) as AdminPayment;
      setPayments((current) =>
        current.map((payment) => (payment.id === updated.id ? updated : payment)),
      );
      setRefreshTick((current) => current + 1);
    } catch (error: unknown) {
      setPageError(
        error instanceof Error ? error.message : "No se pudo actualizar el pago.",
      );
    } finally {
      setActionId(null);
    }
  };

  const páginationLabel = useMemo(() => {
    if (total === 0) {
      return "Sin resultados";
    }
    const start = offset + 1;
    const end = Math.min(offset + payments.length, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [offset, payments.length, total]);

  if (loading || (pageLoading && !user)) {
    return (
      <div className="enterprise-page flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#b9905a] border-t-transparent" />
      </div>
    );
  }

  if (!user?.is_admin) {
    return null;
  }

  return (
    <div className="enterprise-page px-6 py-10 text-[#10203a]">
      <div className="mx-auto max-w-7xl">
        <header className="enterprise-card px-8 py-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="enterprise-badge">
                <Shield className="h-3.5 w-3.5" /> Panel admin
              </div>
              <h1 className="enterprise-title mt-6">
                Revisión de pagos, usuarios y continuidad de acceso
              </h1>
              <p className="enterprise-copy mt-5 max-w-2xl text-sm">
                Este panel concentra la revisión operativa del sistema para que
                puedas aprobar, observar y seguir cada comprobante sin salir del
                entorno principal.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="enterprise-button-secondary">
                Volver a mi cuenta
              </Link>
              <a href={APP_ENTRY_URL} className="enterprise-button-primary">
                Entrar a la app
              </a>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            { label: "Total", value: summary.all, tone: "text-[#10203a]" },
            { label: "Pendientes", value: summary.pending, tone: "text-[#8a6840]" },
            { label: "Aprobados", value: summary.approved, tone: "text-[#1e6a53]" },
            { label: "Rechazados", value: summary.rejected, tone: "text-[#8d2f2f]" },
            { label: "Fraude", value: summary.fraudulent, tone: "text-[#7a1f49]" },
          ].map((item) => (
            <div key={item.label} className="enterprise-card px-5 py-5">
              <div className="text-sm font-medium text-[#627089]">{item.label}</div>
              <div className={`mt-3 font-sans text-4xl font-black ${item.tone}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div className="enterprise-card mt-6 px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a889d]" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por correo, nombre o código de operación"
                className="enterprise-input pl-11"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              {(["pending", "approved", "rejected", "fraudulent", "all"] as PaymentStatusFilter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setOffset(0);
                    setFilter(item);
                  }}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    filter === item
                      ? "bg-[#10203a] text-[#f7f2e8] shadow-[0_14px_30px_rgba(16,32,58,0.14)]"
                      : "border border-[rgba(16,32,58,0.12)] bg-[rgba(255,255,255,0.8)] text-[#5e6d84] hover:bg-white"
                  }`}
                >
                  {item === "all"
                    ? "Todos"
                    : item === "pending"
                      ? "Pendientes"
                      : item === "approved"
                        ? "Aprobados"
                        : item === "fraudulent"
                          ? "Fraude"
                          : "Rechazados"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {([
                "all",
                "likely_valid",
                "unclear",
                "likely_invalid",
                "unavailable",
              ] as PrecheckFilter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setOffset(0);
                    setPrecheckFilter(item);
                  }}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    precheckFilter === item
                      ? "bg-[#35517b] text-white shadow-[0_14px_30px_rgba(53,81,123,0.18)]"
                      : "border border-[rgba(16,32,58,0.12)] bg-[rgba(255,255,255,0.8)] text-[#5e6d84] hover:bg-white"
                  }`}
                >
                  {item === "all"
                    ? "Todos los dictamenes"
                    : item === "likely_valid"
                      ? "Alta confianza"
                      : item === "likely_invalid"
                        ? "Posible fraude"
                        : item === "unclear"
                          ? "Dudosos"
                          : "Sin análisis"}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end text-sm font-medium text-[#627089]">
              {páginationLabel}
            </div>
          </div>
        </div>

        {pageError && (
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] px-5 py-4 text-sm text-[#8d2f2f]">
            {pageError}
          </div>
        )}

        <section className="enterprise-card mt-6 px-6 py-6">
          {pageLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#b9905a]" />
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-[#627089]">
              No hay pagos en este estado o con esta búsqueda.
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => {
                const receiptUrl = resolveReceiptUrl(payment.id);
                const isBusy = actionId === payment.id;
                const isPending = payment.status === "pending";
                const canFlagFraud = payment.status !== "fraudulent";

                return (
                  <article
                    key={payment.id}
                    className="enterprise-soft-panel overflow-hidden px-5 py-5"
                  >
                    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr_0.7fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#546278]">
                            Pago #{payment.id}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                              payment.status === "approved"
                                ? "bg-[rgba(228,245,236,0.92)] text-[#1e6a53]"
                                : payment.status === "rejected"
                                  ? "bg-[rgba(252,236,236,0.94)] text-[#8d2f2f]"
                                  : payment.status === "fraudulent"
                                    ? "bg-[rgba(249,231,242,0.94)] text-[#7a1f49]"
                                    : "bg-[rgba(239,230,214,0.92)] text-[#8a6840]"
                            }`}
                          >
                            {payment.status}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                              payment.precheck.ai_verification_status === "likely_valid"
                                ? "bg-[rgba(228,245,236,0.92)] text-[#1e6a53]"
                                : payment.precheck.ai_verification_status === "likely_invalid"
                                  ? "bg-[rgba(252,236,236,0.94)] text-[#8d2f2f]"
                                  : payment.precheck.ai_verification_status === "unclear"
                                    ? "bg-[rgba(239,230,214,0.92)] text-[#8a6840]"
                                    : "bg-[rgba(228,236,247,0.92)] text-[#35517b]"
                            }`}
                          >
                            {payment.precheck.ai_verification_status === "likely_valid"
                              ? "Alta confianza"
                              : payment.precheck.ai_verification_status === "likely_invalid"
                                ? "Posible fraude"
                                : payment.precheck.ai_verification_status === "unclear"
                                  ? "Dudoso"
                                  : "Sin análisis"}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#627089]">
                            {payment.payment_method}
                          </span>
                        </div>

                        <div className="mt-5">
                          <div className="font-sans text-2xl font-bold text-[#10203a]">
                            {formatDisplayName(payment.user_name)}
                          </div>
                          <div className="mt-2 text-sm text-[#627089]">
                            {payment.user_email}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {[
                            { label: "Plan", value: payment.plan },
                            { label: "Monto", value: `${payment.currency} ${payment.amount}` },
                            {
                              label: "Estado del usuario",
                              value: payment.user_subscription_status,
                            },
                            {
                              label: "Creado",
                              value: new Date(payment.created_at).toLocaleString("es-PE"),
                            },
                            {
                              label: "Operación extraida",
                              value: payment.precheck.ai_extracted_operation_code ?? "No detectada",
                            },
                            {
                              label: "Monto extraido",
                              value:
                                payment.precheck.ai_extracted_amount != null
                                  ? `${payment.currency} ${payment.precheck.ai_extracted_amount}`
                                  : "No detectado",
                            },
                            {
                              label: "Destino Yape (nombre)",
                              value: payment.precheck.ai_extracted_destination_name_masked ?? "No detectado",
                            },
                            {
                              label: "Celular destino (últ.3)",
                              value: payment.precheck.ai_extracted_phone_last3
                                ? `***${payment.precheck.ai_extracted_phone_last3}`
                                : "No detectado",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-[1.3rem] border border-[rgba(16,32,58,0.08)] bg-white px-4 py-4 text-sm"
                            >
                              <div className="text-[#627089]">{item.label}</div>
                              <div className="mt-1 font-semibold text-[#10203a]">
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-[rgba(16,32,58,0.08)] bg-white p-4">
                        <div className="rounded-[1.3rem] border border-[rgba(16,32,58,0.08)] bg-[#f7f4ed] px-4 py-4 text-sm leading-7 text-[#5a6880]">
                          <div className="font-sans text-base font-bold text-[#10203a]">
                            Dictamen IA
                          </div>
                          <p className="mt-2">{payment.precheck.ai_summary}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-white px-3 py-1 text-[#10203a]">
                              Confianza {payment.precheck.ai_confidence}%
                            </span>
                            {payment.precheck.ai_duplicate_hash_match && (
                              <span className="rounded-full bg-white px-3 py-1 text-[#8d2f2f]">
                                Hash duplicado
                              </span>
                            )}
                            {payment.precheck.ai_duplicate_operation_match && (
                              <span className="rounded-full bg-white px-3 py-1 text-[#8d2f2f]">
                                Operación repetida
                              </span>
                            )}
                          </div>
                          {(payment.precheck.ai_extracted_method ||
                            payment.precheck.ai_extracted_destination ||
                            payment.precheck.ai_extracted_destination_name_masked ||
                            payment.precheck.ai_extracted_phone_last3 ||
                            payment.precheck.ai_extracted_paid_at) && (
                            <div className="mt-4 grid gap-2 md:grid-cols-3">
                              <div className="rounded-[1rem] bg-white px-3 py-3">
                                <div className="text-[#627089]">Método detectado</div>
                                <div className="mt-1 font-semibold text-[#10203a]">
                                  {payment.precheck.ai_extracted_method ?? "No detectado"}
                                </div>
                              </div>
                              <div className="rounded-[1rem] bg-white px-3 py-3">
                                <div className="text-[#627089]">Destino</div>
                                <div className="mt-1 font-semibold text-[#10203a]">
                                  {payment.precheck.ai_extracted_destination ?? "No detectado"}
                                </div>
                              </div>
                              <div className="rounded-[1rem] bg-white px-3 py-3">
                                <div className="text-[#627089]">Fecha detectada</div>
                                <div className="mt-1 font-semibold text-[#10203a]">
                                  {payment.precheck.ai_extracted_paid_at
                                    ? new Date(payment.precheck.ai_extracted_paid_at).toLocaleString("es-PE")
                                    : "No detectada"}
                                </div>
                              </div>
                              <div className="rounded-[1rem] bg-white px-3 py-3">
                                <div className="text-[#627089]">Nombre destino</div>
                                <div className="mt-1 font-semibold text-[#10203a]">
                                  {payment.precheck.ai_extracted_destination_name_masked ?? "No detectado"}
                                </div>
                              </div>
                              <div className="rounded-[1rem] bg-white px-3 py-3">
                                <div className="text-[#627089]">Celular destino</div>
                                <div className="mt-1 font-semibold text-[#10203a]">
                                  {payment.precheck.ai_extracted_phone_last3
                                    ? `***${payment.precheck.ai_extracted_phone_last3}`
                                    : "No detectado"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 font-sans text-base font-bold text-[#10203a]">
                          Comprobante
                        </div>
                        <div className="mb-3 mt-3 flex items-center justify-between gap-3">
                          <button
                            onClick={() => setPreviewUrl(receiptUrl)}
                            className="text-sm font-semibold text-[#8a6840] transition hover:text-[#6d5232]"
                          >
                            Ver grande
                          </button>
                        </div>

                        {!payment.has_receipt ? (
                          <div className="rounded-[1.3rem] bg-[#f6f1e8] px-4 py-6 text-sm text-[#627089]">
                            No hay comprobante asociado a este pago.
                          </div>
                        ) : (
                          <button
                            onClick={() => setPreviewUrl(receiptUrl)}
                            className="block w-full overflow-hidden rounded-[1.3rem] border border-[rgba(16,32,58,0.08)] bg-[#f7f4ed]"
                          >
                            <img
                              src={receiptUrl}
                              alt={`Comprobante ${payment.id}`}
                              className="h-56 w-full object-contain"
                            />
                          </button>
                        )}

                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${
                            payment.has_receipt
                              ? "text-[#546278] hover:text-[#10203a]"
                              : "pointer-events-none text-[#a8b3c3]"
                          }`}
                        >
                          <ExternalLink className="h-4 w-4" /> Abrir archivo
                        </a>
                      </div>

                      <div className="rounded-[1.6rem] border border-[rgba(16,32,58,0.08)] bg-white p-4">
                        <div className="font-sans text-base font-bold text-[#10203a]">
                          Acciones
                        </div>
                        <div className="mt-4 space-y-3">
                          <button
                            onClick={() => reviewPayment(payment.id, "approved")}
                            disabled={!isPending || isBusy}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1e6a53] px-4 text-sm font-bold text-white transition hover:bg-[#215f4f] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => reviewPayment(payment.id, "rejected")}
                            disabled={!isPending || isBusy}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#8d2f2f] px-4 text-sm font-bold text-white transition hover:bg-[#7a2929] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Rechazar
                          </button>
                          <button
                            onClick={() =>
                              reviewPayment(
                                payment.id,
                                "fraudulent",
                                payment.precheck.ai_summary || "Marcado como fraudulento desde panel admin.",
                              )
                            }
                            disabled={!canFlagFraud || isBusy}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#7a1f49] px-4 text-sm font-bold text-white transition hover:bg-[#661a3e] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            Fraude / suspender
                          </button>
                        </div>

                        <div className="mt-4 rounded-[1.3rem] bg-[#f6f1e8] px-4 py-4 text-sm leading-7 text-[#5a6880]">
                          {payment.status === "approved" ? (
                            <div className="flex items-start gap-2">
                              <BadgeCheck className="mt-0.5 h-4 w-4 text-[#1e6a53]" />
                              <span>Pago aprobado. El usuario ya deberia contar con acceso activo.</span>
                            </div>
                          ) : payment.status === "rejected" ? (
                            <div className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-4 w-4 text-[#8d2f2f]" />
                              <span>Pago rechazado. El usuario debera cargar un comprobante válido.</span>
                            </div>
                          ) : payment.status === "fraudulent" ? (
                            <div className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-4 w-4 text-[#7a1f49]" />
                              <span>
                                Pago marcado como fraudulento. La cuenta queda suspendida.
                                {payment.fraud_reason ? ` Motivo: ${payment.fraud_reason}` : ""}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <Clock3 className="mt-0.5 h-4 w-4 text-[#8a6840]" />
                              <span>Pendiente de revisión manual.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[rgba(16,32,58,0.08)] pt-5">
            <div className="text-sm text-[#627089]">{páginationLabel}</div>
            <div className="flex gap-3">
              <button
                onClick={() => setOffset((current) => Math.max(current - limit, 0))}
                disabled={offset === 0 || pageLoading}
                className="enterprise-button-secondary h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                onClick={() => setOffset((current) => current + limit)}
                disabled={offset + payments.length >= total || pageLoading}
                className="enterprise-button-secondary h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {previewUrl && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute inset-0 bg-[#08111f]/78 backdrop-blur-sm"
            />
            <div className="enterprise-card relative z-10 w-full max-w-5xl px-6 py-6">
              <button
                onClick={() => setPreviewUrl(null)}
                className="enterprise-button-secondary absolute right-4 top-4 h-10 px-4 text-sm"
              >
                Cerrar
              </button>
              <div className="font-sans text-2xl font-bold text-[#10203a]">
                Vista del comprobante
              </div>
              <div className="mt-5 rounded-[1.5rem] border border-[rgba(16,32,58,0.08)] bg-[#f7f4ed] p-4">
                <img
                  src={previewUrl}
                  alt="Comprobante ampliado"
                  className="max-h-[75vh] w-full object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="enterprise-page flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#b9905a] border-t-transparent" />
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}



