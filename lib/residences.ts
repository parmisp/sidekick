// York residence options, including The Quad student housing.
// University residence sources:
// https://www.yorku.ca/housing/keele-campus/p-keele-undergraduate/residence-buildings/
// https://www.yorku.ca/glendon/residence-life/
export const YORK_RESIDENCES = [
  { id: "york-bethune", name: "Bethune Residence", campus: "Keele" },
  { id: "york-calumet", name: "Calumet Residence", campus: "Keele" },
  { id: "york-founders", name: "Founders Residence", campus: "Keele" },
  { id: "york-pond", name: "Pond Residence", campus: "Keele" },
  { id: "york-quad", name: "The Quad", campus: "Keele" },
  { id: "york-stong", name: "Stong Residence", campus: "Keele" },
  { id: "york-tatham", name: "Tatham Hall", campus: "Keele" },
  { id: "york-vanier", name: "Vanier Residence", campus: "Keele" },
  { id: "york-winters", name: "Winters Residence", campus: "Keele" },
  { id: "york-hilliard", name: "Hilliard Residence", campus: "Glendon" },
  { id: "york-wood", name: "Wood Residence", campus: "Glendon" },
] as const;

export function residenceName(id: string | null): string | null {
  return YORK_RESIDENCES.find((residence) => residence.id === id)?.name ?? null;
}
