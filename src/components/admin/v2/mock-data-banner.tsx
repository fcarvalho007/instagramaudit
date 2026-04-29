/**
 * Banner amarelo "Dados de exemplo" — sinaliza secções/tabs que ainda
 * mostram mocks, distinguindo-as visualmente das secções já ligadas a
 * dados reais. Aplicar abaixo de `<AdminSectionHeader>` ou de
 * `<AdminPageHeader>`, antes do conteúdo da secção.
 */

interface MockDataBannerProps {
  reason?: string;
}

export function MockDataBanner({
  reason = "Esta secção mostra dados de exemplo. Será ligada a dados reais quando o checkout/EuPago/Stripe estiver integrado.",
}: MockDataBannerProps) {
  return (
    <div
      role="note"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        background: "#FAEEDA",
        border: "1px solid #EF9F27",
        borderRadius: 10,
        marginBottom: 16,
        fontSize: 12,
        lineHeight: 1.5,
        color: "#854F0B",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#EF9F27",
          color: "#412402",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "JetBrains Mono, monospace",
          marginTop: 1,
        }}
      >
        !
      </span>
      <div>
        <strong style={{ fontWeight: 500 }}>Dados de exemplo</strong>
        <span> — {reason}</span>
      </div>
    </div>
  );
}
