import type { Metadata } from "next";
import { AnalyseWorkspace } from "@/components/analyse/AnalyseWorkspace";

export const metadata: Metadata = { title: "Analyse sample" };

export default function AnalysePage() {
  return <AnalyseWorkspace />;
}
