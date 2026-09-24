export const CAMPUSES = [
  { id: "keele", name: "Keele" },
  { id: "glendon", name: "Glendon" },
  { id: "markham", name: "Markham" },
] as const;
export type Campus = (typeof CAMPUSES)[number]["id"];

export const DEGREES = ["BA", "BSc", "BEng", "BBA", "BCom", "BFA", "BEd", "BScN", "MA", "MSc", "MEng", "MBA", "MFA", "MEd", "JD", "LLM", "PhD", "Other", "Undecided"] as const;
export type Degree = (typeof DEGREES)[number];

export function isCampus(value: unknown): value is Campus {
  return CAMPUSES.some((campus) => campus.id === value);
}

export function isDegree(value: unknown): value is Degree {
  return DEGREES.some((degree) => degree === value);
}

export function campusName(value: Campus | null) {
  return CAMPUSES.find((campus) => campus.id === value)?.name ?? null;
}
