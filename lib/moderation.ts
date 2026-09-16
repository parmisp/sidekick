// DEMO: a deliberately tiny word-list filter. It is NOT content moderation.
// Before launch, text (names, tags, prompts, comments, messages) and images
// (photos, prompt images) need a real moderation pipeline + reporting flow.

// Words that are blocked when they start a word ("fucking" is caught).
const PREFIX_BLOCKED = ["fuck", "shit", "bitch", "slut", "whore", "cunt", "nigg", "faggot", "retard"];
// Words that are blocked only as whole words, to avoid "cocktail" / "Dickens" false positives.
const WORD_BLOCKED = ["cock", "dick", "pussy", "fag", "rape", "nazi", "kys", "twat", "wank"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function normalize(text: string): string[] {
  const lowered = text
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("")
    .replace(/(.)\1{2,}/g, "$1$1"); // "fuuuuck" -> "fuuck"
  return lowered.split(/[^a-z]+/).filter(Boolean);
}

export function containsProfanity(text: string): boolean {
  const tokens = normalize(text);
  const squashed = tokens.join("");
  return tokens.some(
    (t) =>
      PREFIX_BLOCKED.some((w) => t.startsWith(w) || t.replace(/(.)\1+/g, "$1").startsWith(w)) ||
      WORD_BLOCKED.includes(t),
  ) || ["nigger", "faggot"].some((w) => squashed.includes(w)); // catches "n i g g e r"
}
