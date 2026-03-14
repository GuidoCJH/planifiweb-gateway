"use client";

import { LegalLinks } from "@/components/LegalLinks";

interface LegalConsentFieldsProps {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  onAcceptTermsChange: (checked: boolean) => void;
  onAcceptPrivacyChange: (checked: boolean) => void;
  dark?: boolean;
}

export const LegalConsentFields = ({
  acceptTerms,
  acceptPrivacy,
  onAcceptTermsChange,
  onAcceptPrivacyChange,
  dark = false,
}: LegalConsentFieldsProps) => {
  const labelClassName = dark ? "text-[#dce5f2]" : "text-[#10203a]";
  const noteClassName = dark ? "text-[#a7b6ca]" : "text-[#627089]";
  const linkClassName = dark
    ? "font-semibold text-[#f5efe5] hover:text-[#d2b27c]"
    : "font-semibold text-[#10203a] hover:text-[#8a6840]";

  return (
    <div className="space-y-3 rounded-[1.35rem] border border-[rgba(16,32,58,0.12)] bg-[rgba(255,255,255,0.06)] px-4 py-4">
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          required
          checked={acceptTerms}
          onChange={(event) => onAcceptTermsChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[rgba(16,32,58,0.18)]"
        />
        <span className={labelClassName}>
          He leído y acepto los{" "}
          <a href="/terminos" target="_blank" rel="noreferrer" className={linkClassName}>
            Términos y Condiciones
          </a>
          .
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          required
          checked={acceptPrivacy}
          onChange={(event) => onAcceptPrivacyChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[rgba(16,32,58,0.18)]"
        />
        <span className={labelClassName}>
          He leído y acepto la{" "}
          <a href="/privacidad" target="_blank" rel="noreferrer" className={linkClassName}>
            Política de Privacidad
          </a>
          .
        </span>
      </label>

      <p className={`text-xs leading-6 ${noteClassName}`}>
        Este servicio usa solo cookies esenciales de sesión y seguridad. No se
        utilizan cookies publicitarias ni analíticas.
      </p>
      <LegalLinks className="flex flex-wrap gap-4 text-xs" linkClassName={linkClassName} />
    </div>
  );
};


