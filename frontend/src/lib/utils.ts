import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDisplayName(name: string | null | undefined): string {
  const cleaned = (name ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

export function getAllowedEmailDomains(): string[] {
  const rawValue = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? "";
  return rawValue
    .replace(/\r/g, "\n")
    .replace(/,/g, "\n")
    .split("\n")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedRegistrationEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length === 0) return true;
  const domain = normalized.split("@").pop() ?? "";
  return allowedDomains.includes(domain);
}

export function getAllowedEmailDomainsLabel(): string | null {
  const allowedDomains = getAllowedEmailDomains();
  if (allowedDomains.length === 0) {
    return null;
  }
  return allowedDomains.map((domain) => `@${domain}`).join(", ");
}
