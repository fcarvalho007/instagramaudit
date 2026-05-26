/**
 * Toolbar do editor visual de templates de email.
 * Botões para formatação básica email-safe + popover de inserção de variáveis
 * e popover para inserir/editar link.
 */
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  Minus,
  RemoveFormatting,
  Undo2,
  Redo2,
  ChevronDown,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ToolbarProps {
  editor: Editor | null;
  variables: string[];
  onInsertVariable: (name: string) => void;
  disabled?: boolean;
}

export function EditorToolbar({
  editor,
  variables,
  onInsertVariable,
  disabled,
}: ToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) {
    return (
      <div className="h-10 rounded-t-md border border-b-0 bg-admin-surface-elevated/60" style={{ borderColor: "rgb(var(--admin-border-default))" }} />
    );
  }
  const ed = editor;

  const is = (name: string, attrs?: Record<string, unknown>) =>
    ed.isActive(name, attrs);

  function openLinkPopover() {
    const existing = ed.getAttributes("link").href as string | undefined;
    setLinkUrl(existing ?? "https://");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!linkUrl.trim()) {
      ed.chain().focus().unsetLink().run();
    } else {
      ed
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setLinkOpen(false);
  }

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 bg-white px-1.5 py-1.5"
      style={{ borderColor: "rgb(var(--admin-border-default))" }}
    >
      <Btn label="Negrito (Ctrl+B)" active={is("bold")} disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Itálico (Ctrl+I)" active={is("italic")} disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </Btn>
      <Sep />
      <Btn label="Título H2" active={is("heading", { level: 2 })} disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Título H3" active={is("heading", { level: 3 })} disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-3.5 w-3.5" />
      </Btn>
      <Sep />
      <Btn label="Lista" active={is("bulletList")} disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Lista numerada" active={is("orderedList")} disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </Btn>
      <Sep />
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Inserir / editar link"
            disabled={disabled}
            onClick={openLinkPopover}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded text-admin-text-secondary hover:bg-admin-surface-elevated",
              is("link") && "bg-admin-surface-elevated text-admin-text-primary",
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <p className="mb-2 text-eyebrow-sm text-admin-text-tertiary">URL</p>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") applyLink(); }}
            className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-[13px] text-admin-text-primary"
            style={{ borderColor: "rgb(var(--admin-border-default))" }}
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => { editor.chain().focus().unsetLink().run(); setLinkOpen(false); }}
              className="rounded-md border px-2 py-1 text-[11px] text-admin-text-secondary hover:bg-admin-surface-elevated"
              style={{ borderColor: "rgb(var(--admin-border-default))" }}
            >
              Remover
            </button>
            <button
              type="button"
              onClick={applyLink}
              className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ background: "rgb(var(--admin-button-dark))" }}
            >
              Aplicar
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <Btn label="Remover link" disabled={disabled || !is("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}>
        <Link2Off className="h-3.5 w-3.5" />
      </Btn>
      <Sep />
      <Btn label="Linha horizontal" disabled={disabled}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-3.5 w-3.5" />
      </Btn>
      <Btn label="Limpar formatação" disabled={disabled}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting className="h-3.5 w-3.5" />
      </Btn>
      <Sep />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || variables.length === 0}
            title="Inserir variável"
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium text-admin-text-primary hover:bg-admin-surface-elevated disabled:opacity-40"
          >
            <Code2 className="h-3.5 w-3.5" />
            Variável
            <ChevronDown className="h-3 w-3 text-admin-text-tertiary" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1.5">
          <p className="px-1.5 pb-1 pt-0.5 text-eyebrow-sm text-admin-text-tertiary">
            Inserir no cursor
          </p>
          <div className="flex flex-col">
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onInsertVariable(v)}
                className="flex items-center justify-between rounded px-2 py-1.5 text-left font-mono text-[11px] text-admin-text-primary hover:bg-admin-surface-elevated"
              >
                <span>{`{{${v}}}`}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <div className="ml-auto flex items-center gap-0.5">
        <Btn label="Anular" disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-3.5 w-3.5" />
        </Btn>
        <Btn label="Refazer" disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-3.5 w-3.5" />
        </Btn>
      </div>
    </div>
  );
}

function Btn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded text-admin-text-secondary transition-colors",
        "hover:bg-admin-surface-elevated hover:text-admin-text-primary",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-admin-surface-elevated text-admin-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <span
      aria-hidden
      className="mx-1 h-4 w-px"
      style={{ background: "rgb(var(--admin-border-default))" }}
    />
  );
}