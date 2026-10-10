/** Schema for demo and evaluation manifests (public/demo/manifest.json, or your own dataset). */

export type GroundTruthKind =
  /** Pixel area as drawn in a synthetic image. */
  | "synthetic-drawn-area"
  /** Mass fractions from physically sorting and weighing the photographed sample. */
  | "physical-mass"
  /** Area fractions from manual pixel annotation of a real photo. */
  | "annotated-area";

export interface ManifestItem {
  id: string;
  title: string;
  /** Path relative to the manifest file. */
  file: string;
  synthetic: boolean;
  description: string;
  limitations: string;
  /** Required for third-party photos. */
  attribution?: { author: string; source: string; license: string; licenseUrl: string; changes: string };
  /**
   * Illustrative expectation only (e.g. the uploader labelled the photo as sorted green cullet).
   * Not a measured composition and never used to compute error.
   */
  expectation?: string;
  groundTruth?: {
    kind: GroundTruthKind;
    /** Percent per main class; should sum to ~100. */
    percent: { clear: number; green: number; brown: number };
    extraObjects?: { kind: string; x: number; y: number; w: number; h: number }[];
    uncoveredPercentOfImage?: number;
  };
}

export interface DemoManifest {
  description: string;
  generatedBy?: string;
  encoding?: string;
  items: ManifestItem[];
}
