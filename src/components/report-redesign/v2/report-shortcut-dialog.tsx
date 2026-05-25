import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded-md border border-border-default bg-surface-muted text-[11px] font-semibold text-content-primary tabular-nums">
      {children}
    </kbd>
  );
}

export function ReportShortcutDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("report");

  const rows: Array<{ keys: React.ReactNode; label: string }> = [
    {
      keys: (
        <>
          <Kbd>g</Kbd>
          <span className="text-content-tertiary text-xs">+</span>
          <Kbd>1</Kbd>–<Kbd>6</Kbd>
        </>
      ),
      label: t("shortcuts.go_block", { defaultValue: "Saltar para o bloco N" }),
    },
    {
      keys: <Kbd>t</Kbd>,
      label: t("shortcuts.top", { defaultValue: "Voltar ao topo" }),
    },
    {
      keys: <Kbd>?</Kbd>,
      label: t("shortcuts.help", { defaultValue: "Mostrar atalhos" }),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("shortcuts.title", { defaultValue: "Atalhos de teclado" })}
          </DialogTitle>
          <DialogDescription>
            {t("shortcuts.subtitle", {
              defaultValue: "Navega pelo relatório sem sair do teclado.",
            })}
          </DialogDescription>
        </DialogHeader>
        <ul className="mt-2 divide-y divide-border-default">
          {rows.map((row, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <span className="text-sm text-content-secondary">{row.label}</span>
              <span className="flex items-center gap-1">{row.keys}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}