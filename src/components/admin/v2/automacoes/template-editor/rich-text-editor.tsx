/**
 * Wrapper Tiptap para o corpo HTML dos templates de email.
 * Produz HTML email-safe: <p>, <h2>, <h3>, <ul>, <ol>, <a>, <strong>, <em>, <hr>.
 * Sincronizado externamente: `value` (string HTML) é a fonte de verdade.
 */
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onReady?: (editor: Editor) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onReady,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: {
          rel: "noopener noreferrer",
          style: "color:#3772E5;text-decoration:underline;",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Escreve aqui…",
      }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "tiptap-email prose-email min-h-[360px] outline-none px-4 py-3 text-[14px] leading-[1.65] text-admin-text-primary",
      },
    },
  });

  // Notifica quando editor está pronto (para a toolbar)
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  // Sincroniza `value` externo quando muda de fora (ex.: switch de tab HTML→Visual)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  return <EditorContent editor={editor} />;
}