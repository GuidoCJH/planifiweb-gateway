"use client";

import { useState } from "react";
import { Loader2, Scale, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LegalConsentFields } from "@/components/LegalConsentFields";

export const LegalAcceptanceCard = () => {
  const { acceptLegal, refreshSession } = useAuth();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!acceptTerms || !acceptPrivacy) {
      setErrorMessage("Debes aceptar ambos documentos legales para continuar.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await acceptLegal();
      await refreshSession();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la aceptación legal.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="enterprise-card mt-8 px-6 py-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="enterprise-badge">
            <Scale className="h-3.5 w-3.5" /> Actualización legal obligatoria
          </div>
          <h2 className="mt-5 text-3xl text-[#10203a]">
            Antes de entrar a la app, debes aceptar el marco legal vigente.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#5a6880]">
            El acceso productivo de PLANIFIWEB requiere dejar constancia expresa
            de aceptación de los Términos y de la Política de Privacidad.
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-[rgba(185,144,90,0.18)] bg-[rgba(239,230,214,0.78)] px-4 py-4 text-sm leading-7 text-[#6b5330] lg:max-w-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-1 h-4 w-4" />
            <span>
              Mientras esta aceptación no quede registrada, la entrada a
              PLANIFIWEB y al uso de IA quedará bloqueada.
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <LegalConsentFields
          acceptTerms={acceptTerms}
          acceptPrivacy={acceptPrivacy}
          onAcceptTermsChange={setAcceptTerms}
          onAcceptPrivacyChange={setAcceptPrivacy}
        />
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-[1.2rem] border border-[rgba(179,53,53,0.22)] bg-[rgba(252,236,236,0.94)] px-4 py-3 text-sm text-[#8d2f2f]">
          {errorMessage}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="enterprise-button-primary"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Aceptar documentos y continuar"
          )}
        </button>
      </div>
    </section>
  );
};
