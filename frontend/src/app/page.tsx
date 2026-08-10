"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "../lib/api";

type HealthResponse = {
  success: boolean;
  message: string;
};

export default function Home() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchHealth()
      .then((response: HealthResponse) => {
        if (!active) {
          return;
        }

        setData(response);
        setStatus("success");
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to reach backend",
        );
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-16 text-neutral-100">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
          Development Check
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Frontend connected to Express
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-300">
          This section only runs in development to confirm the Next.js app can
          reach the backend health endpoint.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
          {status === "loading" && <p>Loading backend response...</p>}
          {status === "error" && (
            <p className="text-red-300">Error: {error}</p>
          )}
          {status === "success" && data && (
            <pre className="whitespace-pre-wrap wrap-break-word text-emerald-200">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </section>
    </main>
  );
}
