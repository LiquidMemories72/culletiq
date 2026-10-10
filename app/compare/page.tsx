import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare/CompareView";

export const metadata: Metadata = { title: "Compare samples" };

export default function ComparePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <CompareView />
    </Suspense>
  );
}
