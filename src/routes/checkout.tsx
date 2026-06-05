import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { CheckoutShell } from "@/components/checkout/checkout-shell";

export const Route = createFileRoute("/checkout")({
  component: CheckoutLayout,
});

function CheckoutLayout() {
  const { pathname } = useLocation();
  const wide = pathname.startsWith("/checkout/report-full");
  return (
    <CheckoutShell wide={wide}>
      <Outlet />
    </CheckoutShell>
  );
}