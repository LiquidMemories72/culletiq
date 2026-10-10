/**
 * Real, openly licensed photographs used as demonstration inputs.
 * Source: Wikimedia Commons, photographer "Alter Fritz", CC BY-SA 3.0.
 * Files in public/demo/real/ are the 1280 px renditions served by Wikimedia (no other changes).
 *
 * There is NO measured ground truth for these photos. They were also used to
 * inspect the green/brown hue boundary (see lib/vision/config.ts), so they are
 * not a held-out test set.
 */
import type { ManifestItem } from "./manifest";

const AUTHOR = "Alter Fritz (Wikimedia Commons)";
const LICENSE = "CC BY-SA 3.0";
const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/3.0/";
const CHANGES = "Downscaled to 1280×960 by Wikimedia's thumbnail service; no other changes.";

const common =
  "Real photograph of washed, re-sorted cullet from a glass processing plant on white paper, with a €1 coin for scale (Wikimedia Commons, 2009).";

export const REAL_DEMOS: ManifestItem[] = [
  {
    id: "real-cullet-mixed",
    title: "Real photo — mixed colours",
    file: "real/real-cullet-mixed.jpg",
    synthetic: false,
    description: `${common} Mixed clear, green, amber and blue pieces, plus a few small light-coloured non-glass-looking bits.`,
    limitations:
      "Top lighting makes thick dark glass appear near-black, so much of it is uncertain. The paper background is neutral, so clear glass is hard to separate. The pile is one connected mass, so fragments merge. No measured composition exists for this photo.",
    expectation: "Visibly mixed; the uploader describes it as various colours. No measured composition.",
    attribution: {
      author: AUTHOR,
      source: "https://commons.wikimedia.org/wiki/File:Glas_aus_Aufbereitungsanlage_bunt_-_glass_cullet_various_(Alter_Fritz).JPG",
      license: LICENSE,
      licenseUrl: LICENSE_URL,
      changes: CHANGES,
    },
  },
  {
    id: "real-cullet-green",
    title: "Real photo — sorted green",
    file: "real/real-cullet-green.jpg",
    synthetic: false,
    description: `${common} Labelled by the uploader as the green fraction.`,
    limitations:
      "Thick dark-green pieces are near-black under top lighting and become uncertain. Includes olive-toned pieces that sit near the green/brown hue boundary.",
    expectation: "Predominantly green by the uploader's sorting label. Not a measured composition.",
    attribution: {
      author: AUTHOR,
      source: "https://commons.wikimedia.org/wiki/File:Glas_aus_Aufbereitungsanlage_gr%C3%BCn_-_glass_cullet_green_(Alter_Fritz).JPG",
      license: LICENSE,
      licenseUrl: LICENSE_URL,
      changes: CHANGES,
    },
  },
  {
    id: "real-cullet-amber",
    title: "Real photo — sorted amber",
    file: "real/real-cullet-amber.jpg",
    synthetic: false,
    description: `${common} Labelled by the uploader as the amber (brown) fraction.`,
    limitations:
      "Much of the pile is near-black and therefore uncertain. The €1 coin is real metal and is not flagged by the screening in this photo, while some glass glints may be — an example of both false negatives and false positives.",
    expectation: "Predominantly brown/amber by the uploader's sorting label. Not a measured composition.",
    attribution: {
      author: AUTHOR,
      source: "https://commons.wikimedia.org/wiki/File:Glas_aus_Aufbereitungsanlage_braun_-_glass_cullet_amber_(Alter_Fritz).JPG",
      license: LICENSE,
      licenseUrl: LICENSE_URL,
      changes: CHANGES,
    },
  },
  {
    id: "real-cullet-white",
    title: "Real photo — sorted clear (flint)",
    file: "real/real-cullet-white.jpg",
    synthetic: false,
    description: `${common} Labelled by the uploader as the white (clear/flint) fraction.`,
    limitations:
      "Clear glass transmits the white paper, so separating it from the background is unreliable; light-green-tinted pieces fall into the uncertain band.",
    expectation: "Predominantly clear by the uploader's sorting label. Not a measured composition.",
    attribution: {
      author: AUTHOR,
      source: "https://commons.wikimedia.org/wiki/File:Glas_aus_Aufbereitungsanlage_wei%C3%9F_-_glass_cullet_white_(Alter_Fritz).JPG",
      license: LICENSE,
      licenseUrl: LICENSE_URL,
      changes: CHANGES,
    },
  },
  {
    id: "real-cullet-blue",
    title: "Real photo — sorted blue",
    file: "real/real-cullet-blue.jpg",
    synthetic: false,
    description: `${common} Labelled by the uploader as the blue fraction, which also contains clear pieces.`,
    limitations:
      "Blue glass is outside the three main classes, so it is reported as 'other colour' and triggers 'unusual colour' flags by design — those flags do not mean the pieces are contaminants.",
    expectation: "Blue plus clear pieces by the uploader's label. Not a measured composition.",
    attribution: {
      author: AUTHOR,
      source: "https://commons.wikimedia.org/wiki/File:Glas_aus_Aufbereitungsanlage_blau_-_glass_cullet_blue_(Alter_Fritz).JPG",
      license: LICENSE,
      licenseUrl: LICENSE_URL,
      changes: CHANGES,
    },
  },
];
