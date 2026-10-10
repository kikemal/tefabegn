/**
 * Layout-only sample cards for the welcome page (not live campus data).
 * Live browse requires auth today (GET /reports/search is Bearer-only).
 * A future public feed must return public-safe fields only — never privateDetails,
 * identifier, private imageRef, evidence, or contact info.
 */
export type PublicFoundPreview = {
  id: string;
  title: string;
  location: string;
  foundAt: string;
  /** Optional public-safe image; omit for placeholder */
  imageTone: "phone" | "bag" | "keys" | "card" | "other";
};

export const MOCK_RECENTLY_FOUND: PublicFoundPreview[] = [
  {
    id: "preview-phone",
    title: "Black smartphone",
    location: "Main Library entrance",
    foundAt: "2026-10-08",
    imageTone: "phone",
  },
  {
    id: "preview-bag",
    title: "Blue backpack",
    location: "Student Union lobby",
    foundAt: "2026-10-07",
    imageTone: "bag",
  },
  {
    id: "preview-keys",
    title: "Set of keys",
    location: "Engineering building",
    foundAt: "2026-10-06",
    imageTone: "keys",
  },
  {
    id: "preview-card",
    title: "Campus ID card holder",
    location: "Cafeteria courtyard",
    foundAt: "2026-10-05",
    imageTone: "card",
  },
];
