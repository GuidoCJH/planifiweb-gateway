"use client";

import { Send } from "lucide-react";

const TELEGRAM_SUPPORT_URL =
  "https://t.me/guidojh?text=Hola%20Guido,%20necesito%20soporte%20con%20PLANIFIWEB";

export const FloatingSupportButton = () => {
  return (
    <a
      href={TELEGRAM_SUPPORT_URL}
      target="_blank"
      rel="noreferrer"
      className="floating-support-button"
      aria-label="Contactar soporte por Telegram"
      title="Soporte por Telegram"
    >
      <Send className="h-5 w-5" />
      <span>Soporte</span>
    </a>
  );
};
