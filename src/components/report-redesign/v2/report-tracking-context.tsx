import { createContext, useContext, type ReactNode } from "react";

export interface ReportTrackingContextValue {
  snapshotId: string | null;
  handle: string | null;
  variant: string;
}

const ReportTrackingContext = createContext<ReportTrackingContextValue>({
  snapshotId: null,
  handle: null,
  variant: "public_mvp",
});

export function ReportTrackingProvider({
  value,
  children,
}: {
  value: ReportTrackingContextValue;
  children: ReactNode;
}) {
  return (
    <ReportTrackingContext.Provider value={value}>
      {children}
    </ReportTrackingContext.Provider>
  );
}

export function useReportTracking(): ReportTrackingContextValue {
  return useContext(ReportTrackingContext);
}