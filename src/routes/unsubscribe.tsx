import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { unsubscribeWithToken, type UnsubscribeResult } from "@/lib/server/unsubscribe.functions";

const searchSchema = z.object({
  token: z.string().min(1).max(4096).optional(),
});

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search) => searchSchema.parse(search),
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Anular subscrição — AuditProfiles" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type ViewState =
  | { status: "loading" }
  | { status: "success"; alreadyOptedOut: boolean; maskedEmail: string | null }
  | { status: "invalid" };

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const { t } = useTranslation("unsubscribe");
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ status: "invalid" });
      return;
    }
    (async () => {
      try {
        const result: UnsubscribeResult = await unsubscribeWithToken({
          data: { token },
        });
        if (cancelled) return;
        if (result.ok) {
          setState({
            status: "success",
            alreadyOptedOut: result.alreadyOptedOut,
            maskedEmail: result.maskedEmail,
          });
        } else {
          setState({ status: "invalid" });
        }
      } catch {
        if (!cancelled) setState({ status: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-16">
      <article className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        {state.status === "loading" ? (
          <p className="text-sm text-content-secondary">…</p>
        ) : state.status === "success" && state.alreadyOptedOut ? (
          <Body
            heading={t("already.heading")}
            body={t("already.body")}
            maskedEmail={state.maskedEmail}
            t={t}
          />
        ) : state.status === "success" ? (
          <Body
            heading={t("success.heading")}
            body={t("success.body")}
            maskedEmail={state.maskedEmail}
            emailLabel={t("success.email_label")}
            t={t}
          />
        ) : (
          <Body
            heading={t("invalid.heading")}
            body={t("invalid.body")}
            maskedEmail={null}
            t={t}
          />
        )}
      </article>
    </main>
  );
}

function Body({
  heading,
  body,
  maskedEmail,
  emailLabel,
  t,
}: {
  heading: string;
  body: string;
  maskedEmail: string | null;
  emailLabel?: string;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl text-content-primary">{heading}</h1>
      <p className="text-[15px] leading-relaxed text-content-secondary">{body}</p>
      {maskedEmail ? (
        <p className="text-sm text-content-tertiary">
          {emailLabel ? <span className="block text-eyebrow-sm uppercase tracking-wider">{emailLabel}</span> : null}
          <span className="font-medium text-content-primary">{maskedEmail}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild>
          <Link to="/app/account">{t("cta.account")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">{t("cta.home")}</Link>
        </Button>
      </div>
    </div>
  );
}
