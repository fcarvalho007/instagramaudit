/**
 * StubTab — placeholder "em desenvolvimento" para tabs que ainda não foram
 * implementadas neste prompt (Receita, Clientes, Relatórios, Perfis, Sistema).
 */

import { type ReactNode } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { ADMIN_BORDER } from "./admin-tokens";

interface StubTabProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function StubTab({ title, subtitle, children }: StubTabProps) {
  return (
    <>
      <AdminPageHeader
        title={title}
        subtitle={subtitle ?? "Esta secção está a ser desenhada."}
      />
      <div
        style={{
          border: ADMIN_BORDER,
          borderRadius: 12,
          padding: "48px 24px",
          backgroundColor: "rgb(var(--admin-neutral-50))",
          textAlign: "center",
          color: "rgb(var(--admin-neutral-600))",
        }}
      >
        <p className="admin-eyebrow" style={{ marginBottom: 12 }}>
          Em desenvolvimento
        </p>
        <p style={{ fontSize: 13, margin: 0 }}>
          Disponível brevemente.
        </p>
        {children ? <div style={{ marginTop: 24 }}>{children}</div> : null}
      </div>
    </>
  );
}