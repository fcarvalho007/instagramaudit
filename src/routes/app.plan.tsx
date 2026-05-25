import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/plan")({
  beforeLoad: () => {
    throw redirect({ to: "/precos" });
  },
});
