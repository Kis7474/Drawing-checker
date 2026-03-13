export type PartRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MachinePart = {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  partNo?: string;
  maintenance?: string;
  region: PartRegion;
};
