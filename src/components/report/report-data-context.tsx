import { createContext, useContext, type ReactNode } from "react";
import { reportData as mockReportData, type ReportData } from "./report-mock-data";

const ReportDataContext = createContext<ReportData | null>(null);

export function ReportDataProvider({
  data,
  children,
}: {
  data: ReportData;
  children: ReactNode;
}) {
  return (
    <ReportDataContext.Provider value={data}>
      {children}
    </ReportDataContext.Provider>
  );
}

export function useReportData(): ReportData {
  const ctx = useContext(ReportDataContext);
  return ctx ?? mockReportData;
}
