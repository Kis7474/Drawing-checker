export type PartCategory =
  | "printing-unit"
  | "folding-unit"
  | "roller-web"
  | "guide-roller-pk"
  | "fd-fr-component"
  | "web-edge-guide"
  | "rs-component"
  | "other";

export type PartRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MachinePart = {
  id: string;
  name: string;
  nameEn: string;
  category: PartCategory;
  keywords: string[];
  description: string;
  partNo?: string;
  region: PartRegion;
};
