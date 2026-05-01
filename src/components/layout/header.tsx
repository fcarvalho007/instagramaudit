import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, X, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { BrandMark } from "@/components/layout/brand-mark";

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

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Analisar", href: "/" },
  { label: "Como funciona", href: "/como-funciona" },
  { label: "Preços", href: "/precos" },
  { label: "Recursos", href: "/recursos" },
];

function Header() {
  const scrolled = useScrollPast(40);
  const [open, setOpen] = React.useState(false);

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
            <BrandMark size={32} />
            <span className="font-display text-lg font-semibold tracking-tight text-content-primary">
              InstaBench
            </span>
            <span
              className="hidden lg:flex items-center gap-3 text-content-tertiary"
              aria-hidden="true"
            >
              <span className="h-5 w-px bg-border-default" />
              <span className="text-eyebrow">
                Instagram Benchmark
              </span>
            </span>
          </Link>

          {/* Center: Nav (desktop) */}
          <nav className="hidden lg:block" aria-label="Navegação principal">
            <ul className="flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm font-medium text-content-secondary hover:text-content-primary transition-colors duration-[150ms]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button size="icon" aria-label="Mudar tema">
              <Moon />
            </Button>

            <Button
              variant="primary"
              rightIcon={<ArrowRight />}
              className="hidden sm:inline-flex"
            >
              Analisar agora
            </Button>

            {/* Mobile drawer trigger */}
            <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
              <DialogPrimitive.Trigger asChild>
                <Button
                  size="icon"
                  aria-label="Abrir menu"
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
                    Menu de navegação
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    Navegação principal e ações da aplicação
                  </DialogPrimitive.Description>

                  <div className="flex items-center justify-between px-6 h-16 border-b border-border-subtle">
                    <span className="font-display text-lg font-semibold tracking-tight text-content-primary">
                      Menu
                    </span>
                    <DialogPrimitive.Close asChild>
                      <Button size="icon" aria-label="Fechar menu">
                        <X />
                      </Button>
                    </DialogPrimitive.Close>
                  </div>

                  <nav
                    className="flex-1 overflow-y-auto px-6"
                    aria-label="Navegação móvel"
                  >
                    <ul>
                      {NAV_ITEMS.map((item) => (
                        <li
                          key={item.href}
                          className="border-b border-border-subtle"
                        >
                          <a
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="block py-4 text-lg text-content-primary hover:text-accent-luminous transition-colors duration-[150ms]"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>

                  <div className="p-6 border-t border-border-subtle">
                    <Button
                      variant="primary"
                      rightIcon={<ArrowRight />}
                      className="w-full"
                      onClick={() => setOpen(false)}
                    >
                      Analisar agora
                    </Button>
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
