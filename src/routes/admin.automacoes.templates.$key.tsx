import { createFileRoute } from "@tanstack/react-router";
import { TemplateEditor } from "@/components/admin/v2/automacoes/template-editor";

export const Route = createFileRoute("/admin/automacoes/templates/$key")({
  component: TemplateEditorRoute,
});

function TemplateEditorRoute() {
  const { key } = Route.useParams();
  return <TemplateEditor templateKey={key} />;
}