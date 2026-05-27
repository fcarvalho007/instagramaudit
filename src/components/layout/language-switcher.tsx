import * as React from "react";
import { ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "compact" | "full";
  className?: string;
}

const FLAGS: Record<SupportedLanguage, string> = {
  pt: "🇵🇹",
  en: "🇬🇧",
};

export function LanguageSwitcher({
  variant = "compact",
  className,
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation("header");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === "compact" ? "sm" : "md"}
          aria-label={t("aria.language")}
          className={cn(
            "gap-1.5 text-content-secondary hover:text-content-primary",
            className,
          )}
        >
          {variant === "full" ? (
            <Languages className="h-4 w-4" />
          ) : (
            <span aria-hidden="true" className="text-base leading-none">
              {FLAGS[language]}
            </span>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider tabular-nums">
            {language}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => (
          <DropdownMenuItem
            key={lang}
            onSelect={() => setLanguage(lang)}
            className={cn(
              "flex items-center justify-between gap-3 cursor-pointer",
              language === lang && "font-semibold text-content-primary",
            )}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{FLAGS[lang]}</span>
              <span>{t(`language.${lang}`)}</span>
            </span>
            <span className="text-xs uppercase tracking-wider text-content-tertiary tabular-nums">
              {lang}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}