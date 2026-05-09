/**
 * AutomationEdge — conector vertical entre dois nós do fluxo.
 */

export function AutomationEdge() {
  return (
    <div
      aria-hidden="true"
      className="flex justify-center"
      style={{ paddingLeft: 24, paddingRight: 24 }}
    >
      <div className="flex flex-col items-center" style={{ height: 28 }}>
        <div
          style={{
            width: 2,
            flex: 1,
            background:
              "linear-gradient(to bottom, rgb(var(--admin-border-rgb) / 0.5), rgb(var(--admin-leads-500) / 0.55))",
          }}
        />
        <div
          style={{
            marginTop: -2,
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "6px solid rgb(var(--admin-leads-500) / 0.7)",
          }}
        />
      </div>
    </div>
  );
}