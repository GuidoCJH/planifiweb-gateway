const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "8ecf566c05434da9a552759d5c827b91";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://planifiweb-gateway.vercel.app";

const defaultPaths = [
  "/",
  "/planificacion-curricular-cneb",
  "/sesion-de-aprendizaje",
  "/unidad-de-aprendizaje",
  "/evaluacion-por-competencias",
  "/terminos",
  "/privacidad",
];

async function main() {
  const site = new URL(SITE_URL);
  const providedUrls = process.argv
    .slice(2)
    .map((value) => value.trim())
    .filter(Boolean);

  const urlList =
    providedUrls.length > 0
      ? providedUrls.map((value) => new URL(value, site).toString())
      : defaultPaths.map((path) => new URL(path, site).toString());

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      host: site.host,
      key: INDEXNOW_KEY,
      keyLocation: `${site.origin}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error("IndexNow failed:", response.status, body);
    process.exitCode = 1;
    return;
  }

  console.log("IndexNow submitted successfully.");
  console.log(body || "(empty response body)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
