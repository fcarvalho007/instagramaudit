/**
 * Conversion UX 10B — fonte única de apresentação para PROFILE_RELATIONSHIPS.
 *
 * Um só componente serve o loading (`/analyze/$username`) e o ConversionSheet:
 * mesmas opções, labels, ícones, radio semantics, teclado e focus-visible.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Briefcase, Handshake, Search, Swords, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { GridSelectField, type GridSelectOption } from "@/components/onboarding/grid-select-field";
import {
  PROFILE_RELATIONSHIPS,
  PROFILE_RELATIONSHIP_LABELS_EN,
  PROFILE_RELATIONSHIP_LABELS_PT,
  isProfileRelationship,
  type ProfileRelationship,
} from "@/lib/leads/profile-relationship";

const ICONS: Record<ProfileRelationship, LucideIcon> = {
  owner: User,
  manages: Briefcase,
  client: Handshake,
  competitor: Swords,
  research: Search,
};

export function useProfileRelationshipOptions(): GridSelectOption[] {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const labels = i18n.language?.startsWith("en")
      ? PROFILE_RELATIONSHIP_LABELS_EN
      : PROFILE_RELATIONSHIP_LABELS_PT;
    return PROFILE_RELATIONSHIPS.map((value) => ({
      value,
      label: labels[value],
      Icon: ICONS[value],
    }));
  }, [i18n.language]);
}

export function ProfileRelationshipField({
  legend,
  name = "profile_relationship",
  value,
  onChange,
  compact = false,
  describedBy,
}: {
  legend: string;
  name?: string;
  value?: ProfileRelationship;
  onChange: (value: ProfileRelationship) => void;
  compact?: boolean;
  describedBy?: string;
}) {
  const options = useProfileRelationshipOptions();

  return (
    <GridSelectField
      legend={legend}
      name={name}
      options={options}
      value={value}
      onChange={(v) => {
        if (isProfileRelationship(v)) onChange(v);
      }}
      compact={compact}
      describedBy={describedBy}
      gridClassName={
        compact
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-3"
      }
    />
  );
}
