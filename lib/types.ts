import type { Campus, Degree } from "./academics";

export type Gender = "male" | "female" | "rather_not_say";
export type ResidenceStatus = "residence" | "commuter";
export type GenderFilterMode = "everyone" | "same_gender";
export type CommentTargetType = "photo" | "prompt" | "custom_tag";

export interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  phone_hash: string | null;
  name: string | null;
  age: number | null;
  major: string | null;
  main_campus: Campus | null;
  degree: Degree | null;
  hometown: string | null;
  gender: Gender | null;
  residence_status: ResidenceStatus | null;
  residence_id: string | null;
  gender_filter_mode: GenderFilterMode;
  profile_complete: number;
  is_seed: number;
  demo_simulated: number;
  created_at: number;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  position: number;
}

export interface ProfileTag {
  id: number;
  name: string;
  category: string;
  emoji: string;
}

export interface ProfilePrompt {
  id: string;
  promptId: number;
  question: string;
  answerText: string;
  imageUrl: string | null;
  position: number;
}

/** Public profile shape. Deliberately excludes email, phone and gender. */
export interface Profile {
  id: string;
  name: string;
  age: number;
  major: string;
  mainCampus: Campus | null;
  degree: Degree | null;
  hometown: string | null;
  residenceStatus: ResidenceStatus | null;
  /** Always null for commuters and viewers with no residence status. */
  residenceName: string | null;
  photos: ProfilePhoto[];
  interests: ProfileTag[];
  customTag: { id: string; text: string } | null;
  prompts: ProfilePrompt[];
}

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
