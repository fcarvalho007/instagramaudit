import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, X, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { BrandMark } from "@/components/layout/brand-mark";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useAuthSession } from "@/hooks/use-auth-session";

function useScrollPast(threshold: number) {
  const [past, setPast] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setPast(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return past;
}

function Header() {
  const scrolled = useScrollPast(40);
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation("header");
  const { session, loading } = useAuthSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Nav items. "Preços" omitido até existir página dedicada.
  const navItems: { labelKey: string; href: string; match: (p: string) => boolean }[] = [
    { labelKey: "nav.analyze", href: "/", match: (p) => p === "/" },
    { labelKey: "nav.how_it_works", href: "/#como-funciona", match: () => false },
    { labelKey: "nav.examples", href: "/#exemplos", match: () => false },
    { labelKey: "nav.pricing", href: "/precos", match: (p) => p.startsWith("/precos") },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 w-full bg-surface-base/80",
        "transition-[backdrop-filter,border-color] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "border-b",
        scrolled
          ? "backdrop-blur-lg border-border-subtle"
          : "backdrop-blur-md border-transparent",
      )}
      style={{ zIndex: "var(--z-sticky)" } as React.CSSProperties}
    >
      <Container size="xl">
        <div className="flex h-16 md:h-20 items-center justify-between gap-6">
          {/* Left: Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <span className="inline-flex shadow-[0_6px_18px_-6px_rgba(99,102,241,0.45)] rounded-[10px] transition-transform duration-200 group-hover:-translate-y-px">
              <BrandMark size={32} />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-content-primary">
              AuditProfiles
            </span>
          </Link>

          {/* Center: Pill nav (desktop) */}
          <nav className="hidden lg:block" aria-label={t("aria.primary_nav")}>
            <ul className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface-muted/60 p-1.5">
              {navItems.map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center rounded-full px-4 py-1.5 text-sm transition-colors duration-[150ms]",
                        active
                          ? "bg-surface-base text-content-primary font-medium shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                          : "text-content-secondary hover:text-content-primary",
                      )}
                    >
                      {t(item.labelKey)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" aria-label={t("aria.theme")}>
              <Moon />
            </Button>

            {/* Auth link */}
            {loading ? (
              <span
                aria-hidden="true"
                className="hidden sm:inline-block h-9 w-[72px] rounded-md bg-surface-muted/60 animate-pulse"
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                asChild
              >
                <Link to={session ? "/app" : "/login"}>
                  {session ? t("cta.account") : t("cta.login")}
                </Link>
              </Button>
            )}

            <span data-header-cta="">
              <Button
                variant="primary"
                rightIcon={<ArrowRight />}
                className="hidden sm:inline-flex"
                asChild
              >
                <Link to="/">{t("cta.new_report")}</Link>
              </Button>
            </span>

            {/* Mobile drawer trigger */}
            <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
              <DialogPrimitive.Trigger asChild>
                <Button
                  size="icon"
                  aria-label={t("aria.open_menu")}
                  className="lg:hidden"
                >
                  <Menu />
                </Button>
              </DialogPrimitive.Trigger>

              <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                  className="fixed inset-0 bg-surface-base/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                  style={
                    { zIndex: "var(--z-overlay)" } as React.CSSProperties
                  }
                />
                <DialogPrimitive.Content
                  className="fixed right-0 top-0 h-full w-[calc(100vw-60px)] sm:w-80 bg-surface-secondary border-l border-border-default flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-[250ms]"
                  style={
                    { zIndex: "var(--z-modal)" } as React.CSSProperties
                  }
                >
                  <DialogPrimitive.Title className="sr-only">
                    {t("mobile.title_sr")}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    {t("mobile.description_sr")}
                  </DialogPrimitive.Description>

                  <div className="flex items-center justify-between px-6 h-16 border-b border-border-subtle">
                    <span className="font-display text-lg font-semibold tracking-tight text-content-primary">
                      {t("mobile.menu_title")}
                    </span>
                    <DialogPrimitive.Close asChild>
                      <Button size="icon" aria-label={t("aria.close_menu")}>
                        <X />
                      </Button>
                    </DialogPrimitive.Close>
                  </div>

                  <nav
                    className="flex-1 overflow-y-auto px-6"
                    aria-label={t("aria.mobile_nav")}
                  >
                    <ul>
                      {navItems.map((item) => (
                        <li
                          key={item.href}
                          className="border-b border-border-subtle"
                        >
                          <a
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="block py-4 text-lg text-content-primary hover:text-accent-luminous transition-colors duration-[150ms]"
                          >
                            {t(item.labelKey)}
                          </a>
                        </li>
                      ))}
                      <li className="border-b border-border-subtle">
                        <Link
                          to={session ? "/app" : "/login"}
                          onClick={() => setOpen(false)}
                          className="block py-4 text-lg text-content-primary hover:text-accent-luminous transition-colors duration-[150ms]"
                        >
                          {session ? t("cta.account") : t("cta.login")}
                        </Link>
                      </li>
                    </ul>

                    <div className="mt-6 flex items-center justify-between gap-3">
                      <span className="text-eyebrow-sm text-content-tertiary">
                        {t("language.label")}
                      </span>
                      <LanguageSwitcher variant="full" />
                    </div>
                  </nav>

                  <div className="p-6 border-t border-border-subtle">
                    <span data-header-cta="">
                      <Button
                        variant="primary"
                        rightIcon={<ArrowRight />}
                        className="w-full"
                        onClick={() => setOpen(false)}
                        asChild
                      >
                        <Link to="/">{t("cta.new_report")}</Link>
                      </Button>
                    </span>
                  </div>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
          </div>
        </div>
      </Container>
    </header>
  );
}

export { Header };
