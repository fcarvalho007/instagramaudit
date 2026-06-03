import { createFileRoute, Outlet } from "@tanstack/react-router";

import { CheckoutShell } from "@/components/checkout/checkout-shell";

export const Route = createFileRoute("/checkout")({
  component: CheckoutLayout,
});

function CheckoutLayout() {
  return (
    <CheckoutShell>
      <Outlet />
    </CheckoutShell>
  );
}