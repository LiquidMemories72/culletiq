import type { Metadata } from "next";
import { HistoryView } from "@/components/history/HistoryView";

export const metadata: Metadata = { title: "Sample history" };

export default function SamplesPage() {
  return <HistoryView />;
}
