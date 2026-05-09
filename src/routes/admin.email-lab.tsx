import { createFileRoute } from "@tanstack/react-router";
import { EmailLabPage } from "@/components/admin/v2/email-lab/email-lab-page";

export const Route = createFileRoute("/admin/email-lab")({
  component: EmailLabPage,
});
