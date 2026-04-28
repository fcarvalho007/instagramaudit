/**
 * PDF stylesheet — print-friendly inverse of the dark-first product theme.
 *
 * Light background + navy text + cyan accent reads well on paper. Uses the
 * built-in Helvetica family (PDF standard 14) so no font embedding / fontkit
 * runtime is required in the Worker — keeps the bundle lean and avoids
 * `fs.readFileSync`-style failures.
 */

import { StyleSheet } from "@react-pdf/renderer";

export const PDF_COLORS = {
  ink: "#0A0E1A",
  inkSoft: "#3A4258",
  inkMuted: "#6B7280",
  divider: "#E5E7EB",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  accent: "#06B6D4",
  accentSoft: "#CFFAFE",
  positive: "#0F766E",
  negative: "#B91C1C",
  warning: "#B45309",
} as const;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    backgroundColor: PDF_COLORS.surface,
    color: PDF_COLORS.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
  },

  // Top brand strip
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.divider,
  },
  brandMark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    color: PDF_COLORS.ink,
  },
  brandKicker: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 1.2,
    color: PDF_COLORS.inkMuted,
    textTransform: "uppercase",
  },

  // Cover
  coverWrap: {
    flexGrow: 1,
    justifyContent: "center",
  },
  coverKicker: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: PDF_COLORS.accent,
    marginBottom: 16,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 36,
    lineHeight: 1.15,
    marginBottom: 8,
    color: PDF_COLORS.ink,
  },
  coverHandle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: PDF_COLORS.ink,
    marginTop: 24,
  },
  coverDisplayName: {
    fontSize: 13,
    color: PDF_COLORS.inkSoft,
    marginTop: 4,
  },
  coverDate: {
    fontSize: 10,
    color: PDF_COLORS.inkMuted,
    marginTop: 28,
    letterSpacing: 0.5,
  },
  avatarBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: PDF_COLORS.accentSoft,
    color: PDF_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 24,
  },
  avatarInitials: {
    fontFamily: "Helvetica-Bold",
    fontSize: 32,
    color: PDF_COLORS.accent,
  },

  // Section
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: PDF_COLORS.accent,
    marginBottom: 8,
  },
  sectionHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: PDF_COLORS.ink,
    marginBottom: 18,
  },
  sectionLead: {
    fontSize: 10.5,
    color: PDF_COLORS.inkSoft,
    marginBottom: 18,
  },

  // Profile identity
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 24,
  },
  identityName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: PDF_COLORS.ink,
  },
  identityHandle: {
    fontSize: 10,
    color: PDF_COLORS.inkMuted,
    marginTop: 2,
  },
  identityBio: {
    fontSize: 10,
    color: PDF_COLORS.inkSoft,
    marginTop: 8,
    lineHeight: 1.5,
  },
  verifiedBadge: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: PDF_COLORS.accent,
    marginTop: 6,
    letterSpacing: 1,
  },

  // Counter row (followers / following / posts)
  counterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  counterCell: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: PDF_COLORS.surfaceAlt,
    borderRadius: 6,
    padding: 12,
  },
  counterValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: PDF_COLORS.ink,
  },
  counterLabel: {
    fontSize: 8,
    color: PDF_COLORS.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },

  // Metric grid (2 cols)
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCell: {
    width: "48.5%",
    backgroundColor: PDF_COLORS.surfaceAlt,
    borderLeftWidth: 2,
    borderLeftColor: PDF_COLORS.accent,
    padding: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: PDF_COLORS.inkMuted,
    textTransform: "uppercase",
  },
  metricValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: PDF_COLORS.ink,
    marginTop: 6,
  },
  metricUnit: {
    fontSize: 10,
    color: PDF_COLORS.inkSoft,
    marginLeft: 4,
  },

  // Benchmark block
  benchCard: {
    borderWidth: 1,
    borderColor: PDF_COLORS.divider,
    borderRadius: 6,
    padding: 18,
    marginBottom: 18,
  },
  benchTier: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: PDF_COLORS.inkMuted,
    textTransform: "uppercase",
  },
  benchHeadline: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: PDF_COLORS.ink,
    marginTop: 6,
  },
  benchDelta: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    marginTop: 12,
  },
  benchExplanation: {
    fontSize: 10,
    color: PDF_COLORS.inkSoft,
    marginTop: 10,
    lineHeight: 1.5,
  },
  benchCompareRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.divider,
  },
  benchCompareCell: {
    flex: 1,
  },
  benchCompareLabel: {
    fontSize: 8,
    letterSpacing: 1,
    color: PDF_COLORS.inkMuted,
    textTransform: "uppercase",
  },
  benchCompareValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginTop: 4,
    color: PDF_COLORS.ink,
  },

  // Competitors table
  table: {
    borderWidth: 1,
    borderColor: PDF_COLORS.divider,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.divider,
  },
  tableHeadCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: PDF_COLORS.inkMuted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.divider,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 10,
    color: PDF_COLORS.ink,
  },
  tableCellMuted: {
    fontSize: 10,
    color: PDF_COLORS.inkMuted,
    fontStyle: "italic",
  },

  // Top posts cards
  postCard: {
    borderWidth: 1,
    borderColor: PDF_COLORS.divider,
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
  },
  postCardLast: {
    marginBottom: 0,
  },
  postMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postFormatBadge: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: PDF_COLORS.accent,
    backgroundColor: PDF_COLORS.accentSoft,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  postDate: {
    fontSize: 9,
    color: PDF_COLORS.inkMuted,
    letterSpacing: 0.4,
  },
  postCaption: {
    fontSize: 10,
    color: PDF_COLORS.inkSoft,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  postStatsRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.divider,
  },
  postStatCell: {
    flexDirection: "column",
  },
  postStatLabel: {
    fontSize: 7.5,
    letterSpacing: 1,
    color: PDF_COLORS.inkMuted,
    textTransform: "uppercase",
  },
  postStatValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: PDF_COLORS.ink,
    marginTop: 2,
  },
  postPermalink: {
    fontSize: 8.5,
    color: PDF_COLORS.accent,
    marginTop: 8,
  },
  postPermalinkMissing: {
    fontSize: 8.5,
    color: PDF_COLORS.inkMuted,
    fontStyle: "italic",
    marginTop: 8,
  },

  // Recommendations cards
  recoCard: {
    borderWidth: 1,
    borderColor: PDF_COLORS.divider,
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.accent,
    borderRadius: 4,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    marginBottom: 10,
  },
  recoCardLast: {
    marginBottom: 0,
  },
  recoHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 6,
  },
  recoNumber: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: PDF_COLORS.accent,
  },
  recoTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: PDF_COLORS.ink,
    flex: 1,
  },
  recoBody: {
    fontSize: 10,
    lineHeight: 1.5,
    color: PDF_COLORS.inkSoft,
  },

  // Footer (fixed)
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: PDF_COLORS.inkMuted,
    letterSpacing: 0.5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.divider,
  },
});

// Column widths used by the competitors table — fractions of the row width.
export const COMPETITOR_COL_WIDTHS = {
  handle: "32%",
  followers: "20%",
  engagement: "16%",
  likes: "16%",
  comments: "16%",
} as const;
