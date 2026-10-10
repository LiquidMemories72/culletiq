import type { AnalysisConfig } from "@/types/analysis";
import { METHOD_STEPS, type MethodKey } from "@/lib/reports/methodology";
import { Disclosure } from "@/components/ui";

/** "How was this calculated?" disclosure for one or more pipeline steps. */
export function MethodNote({ keys, config }: { keys: MethodKey[]; config: AnalysisConfig }) {
  const steps = METHOD_STEPS.filter((s) => keys.includes(s.key));
  return (
    <Disclosure summary="How was this calculated?" className="mt-4">
      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.key}>
            <p className="font-medium text-ink">{s.title}</p>
            <dl className="mt-1.5 space-y-1.5">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Algorithm</dt>
                <dd>{s.algorithm(config)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Limitations</dt>
                <dd>{s.limitations}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Verify by</dt>
                <dd>{s.verification}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </Disclosure>
  );
}
