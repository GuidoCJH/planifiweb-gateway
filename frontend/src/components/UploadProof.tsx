"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { apiFetch, parseApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { goToApp } from "@/lib/subscription";

interface UploadProofProps {
  planCode: string;
  planName: string;
  amount: number;
  onClose: () => void;
  successRedirectTo?: string;
}

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

interface UploadProofResponse {
  message: string;
  payment_id: number;
  status: string;
  subscription_status: string;
  requires_manual_review: boolean;
  precheck: PaymentPrecheck;
}

export const UploadProof = ({
  planCode,
  planName,
  amount,
  onClose,
  successRedirectTo,
}: UploadProofProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successPayload, setSuccessPayload] = useState<UploadProofResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { refreshSession } = useAuth();

  const handleSuccessContinue = useCallback(() => {
    onClose();
    if (successRedirectTo && successPayload?.precheck.ai_verification_status === "likely_valid") {
      goToApp(successRedirectTo);
    }
  }, [onClose, successPayload, successRedirectTo]);

  useEffect(() => {
    if (!successPayload || !successRedirectTo) {
      return;
    }
    if (successPayload.precheck.ai_verification_status !== "likely_valid") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleSuccessContinue();
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [handleSuccessContinue, successPayload, successRedirectTo]);

  const handleUpload = async () => {
    if (!file) return;

    setErrorMessage(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("plan", planCode);
    formData.append("file", file);

    try {
      const response = await apiFetch("/api/payments/upload-proof", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = (await response.json()) as UploadProofResponse;
      setSuccessPayload(payload);
      await refreshSession();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al subir el comprobante. Intenta de nuevo.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (successPayload) {
    const precheck = successPayload.precheck;
    const statusCopy =
      precheck.ai_verification_status === "likely_valid"
        ? {
            title: "Comprobante legible",
            tone: "bg-[rgba(228,245,236,0.92)] text-[#1e6a53]",
            body: "La imagen parece consistente. Pasara a revisión administrativa final.",
          }
        : precheck.ai_verification_status === "unclear"
          ? {
              title: "Comprobante poco claro",
              tone: "bg-[rgba(239,230,214,0.92)] text-[#8a6840]",
              body: "La imagen no es totalmente concluyente. Puedes subir una versión más nítida o esperar revisión manual.",
            }
          : precheck.ai_verification_status === "likely_invalid"
            ? {
                title: "Posible inconsistencia detectada",
                tone: "bg-[rgba(252,236,236,0.94)] text-[#8d2f2f]",
                body: "El sistema detecto señales que requieren observación. Puedes volver a subir otro comprobante antes de esperar revisión.",
              }
            : {
                title: "Análisis no disponible",
                tone: "bg-[rgba(228,236,247,0.92)] text-[#35517b]",
                body: "La cuenta queda en revisión manual aunque el análisis instantáneo no estuvo disponible.",
              };

    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(228,245,236,0.92)]">
          <CheckCircle2 className="h-8 w-8 text-[#1e6a53]" />
        </div>
        <h3 className="text-2xl text-[#10203a]">Comprobante enviado</h3>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#5a6880]">
          Tu pago para {planName} ya quedo en revisión. La cuenta pasara a
          estado pendiente y el sistema mantendra el seguimiento desde tu panel.
        </p>
        <div className={`mx-auto mt-6 max-w-xl rounded-[1.5rem] px-5 py-4 text-left ${statusCopy.tone}`}>
          <div className="text-sm font-bold uppercase tracking-[0.16em]">{statusCopy.title}</div>
          <p className="mt-2 text-sm leading-7">{statusCopy.body}</p>
          <p className="mt-3 text-sm leading-7">{precheck.ai_summary}</p>
          {(precheck.ai_extracted_operation_code || precheck.ai_confidence) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/70 px-3 py-1 text-[#10203a]">
                Confianza {precheck.ai_confidence}%
              </span>
              {precheck.ai_extracted_operation_code && (
                <span className="rounded-full bg-white/70 px-3 py-1 text-[#10203a]">
                  Operación {precheck.ai_extracted_operation_code}
                </span>
              )}
              {precheck.ai_extracted_destination_name_masked && (
                <span className="rounded-full bg-white/70 px-3 py-1 text-[#10203a]">
                  Destino {precheck.ai_extracted_destination_name_masked}
                </span>
              )}
              {precheck.ai_extracted_phone_last3 && (
                <span className="rounded-full bg-white/70 px-3 py-1 text-[#10203a]">
                  Celular ***{precheck.ai_extracted_phone_last3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="mx-auto mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
          <button
            onClick={handleSuccessContinue}
            className="enterprise-button-primary w-full"
          >
            {successRedirectTo && precheck.ai_verification_status === "likely_valid"
              ? "Entrar a PLANIFIWEB"
              : "Volver al panel"}
          </button>
          {precheck.ai_verification_status !== "likely_valid" && (
            <button
              onClick={() => {
                setSuccessPayload(null);
                setFile(null);
                setErrorMessage(null);
              }}
              className="enterprise-button-secondary w-full"
            >
              Subir otro comprobante
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[1.25rem] border border-[rgba(185,144,90,0.22)] bg-[rgba(239,230,214,0.84)] px-4 py-3 text-sm leading-6 text-[#6b5330]">
        Plan: <strong>{planName}</strong> | Monto: <strong>S/{amount}</strong> |
        Método único: <strong className="ml-1">Yape</strong>
      </div>

      <div className="relative group">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className={`rounded-[1.4rem] border-2 border-dashed px-4 py-6 transition-all ${
            file
              ? "border-[rgba(30,106,83,0.28)] bg-[rgba(228,245,236,0.6)]"
              : "border-[rgba(16,32,58,0.14)] bg-[rgba(247,243,235,0.86)] group-hover:border-[rgba(16,32,58,0.24)]"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(16,32,58,0.06)]">
              {file ? (
                <CheckCircle2 className="h-6 w-6 text-[#1e6a53]" />
              ) : (
                <Upload className="h-6 w-6 text-[#627089]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#10203a]">
                {file ? file.name : "Haz clic para subir tu comprobante"}
              </p>
              <p className="mt-1 text-xs text-[#7d8aa0]">
                PNG, JPG o WEBP hasta 5MB
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="enterprise-button-primary mt-1 w-full"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Enviar comprobante y continuar"
        )}
      </button>
      {errorMessage && (
        <p className="rounded-[1.3rem] border border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] px-4 py-3 text-center text-sm text-[#8d2f2f]">
          {errorMessage}
        </p>
      )}
    </div>
  );
};


