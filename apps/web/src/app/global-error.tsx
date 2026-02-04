"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    const payload = {
      message: error?.message ?? "Unknown error",
      stack: error?.stack ?? null,
      href: typeof window !== "undefined" ? window.location.href : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };
    fetch("/api/log-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    // also log to console for local dev
    // eslint-disable-next-line no-console
    console.error("GlobalError captured", payload);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen bg-[#05050b] text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-xl font-semibold">Ups, algo falló al cargar.</h2>
          <p className="text-white/70">Refresca la página o vuelve a intentarlo en unos segundos.</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:border-white/40 hover:bg-white/15"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
