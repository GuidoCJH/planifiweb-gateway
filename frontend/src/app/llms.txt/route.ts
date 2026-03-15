import { NextResponse } from "next/server";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TELEGRAM_SUPPORT_URL,
  publicGuideSummaries,
} from "@/lib/discovery";

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    `> ${SITE_DESCRIPTION}`,
    "",
    `Canonical-Origin: ${SITE_URL}`,
    `Support: ${TELEGRAM_SUPPORT_URL}`,
    "",
    "## Public pages",
    `- / : Página principal y acceso comercial de ${SITE_NAME}`,
    ...publicGuideSummaries.map(
      (guide) => `- /${guide.slug} : ${guide.title} — ${guide.description}`,
    ),
    "- /terminos : Términos y condiciones públicos",
    "- /privacidad : Política de privacidad pública",
    "",
    "## Non-public utility routes",
    "- /login",
    "- /register",
    "- /dashboard",
    "- /admin",
    "- /app/*",
    "- /api/*",
    "",
    "## Guidance",
    `- Use ${SITE_URL} as the canonical public origin.`,
    "- Treat utility and application routes as non-public operational surfaces.",
    "- Public educational content lives on the homepage, legal pages and public guides.",
  ];

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
