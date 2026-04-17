import { Badge } from "@/components/ui/badge";
import { formatFollowers, type AnalysisProfile } from "@/lib/mock-analysis";

interface AnalysisHeaderProps {
  profile: AnalysisProfile;
}

export function AnalysisHeader({ profile }: AnalysisHeaderProps) {
  const gradient = `linear-gradient(135deg, hsl(${profile.avatarHue}, 70%, 55%), hsl(${(profile.avatarHue + 60) % 360}, 75%, 45%))`;

  return (
    <header className="flex flex-col gap-6 border-b border-border-subtle pb-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 md:gap-5">
        <div
          className="size-16 md:size-20 shrink-0 rounded-full ring-1 ring-border-default"
          style={{ background: gradient }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
            Análise pública
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight truncate">
            @{profile.handle}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-sm text-content-secondary">
            <span>{profile.category}</span>
            <span aria-hidden="true" className="text-content-tertiary">
              ·
            </span>
            <span>
              <span className="font-mono text-content-primary">
                {formatFollowers(profile.followers)}
              </span>{" "}
              seguidores
            </span>
          </div>
        </div>
      </div>

      <div className="md:shrink-0">
        <Badge variant="default" size="md" dot pulse>
          Dados de exemplo
        </Badge>
      </div>
    </header>
  );
}
