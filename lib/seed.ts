import type { InStatement, InValue } from "@libsql/client";
import crypto from "node:crypto";
import type { Campus, Degree } from "./academics";
import { hashPhone, normalizePhone } from "./phone";
import { placeholderUrl } from "./placeholder";

export const TAG_TAXONOMY: Record<string, [string, string][]> = {
  "Sports & Fitness": [["Basketball", "🏀"], ["Soccer", "⚽"], ["Running", "🏃"], ["Gym", "🏋️"], ["Climbing", "🧗"], ["Volleyball", "🏐"], ["Swimming", "🏊"], ["Intramurals", "🏆"]],
  "Creative & Arts": [["Photography", "📷"], ["Drawing", "✏️"], ["Film", "🎬"], ["Writing", "📝"], ["Theatre", "🎭"], ["Fashion", "🧥"], ["Crafts & DIY", "🧶"]],
  "Food & Drink": [["Coffee", "☕"], ["Baking", "🥐"], ["Cooking", "🍳"], ["Bubble tea", "🧋"], ["Brunch", "🥞"], ["Trying new restaurants", "🍜"], ["Plant-based food", "🥗"]],
  Gaming: [["Board games", "🎲"], ["Valorant", "🎯"], ["Nintendo", "🍄"], ["Minecraft", "⛏️"], ["D&D", "🐉"], ["Chess", "♟️"], ["League of Legends", "🗡️"]],
  Music: [["Concerts", "🎤"], ["Indie", "🎧"], ["Hip-hop", "🎙️"], ["K-pop", "💿"], ["Jazz", "🎷"], ["Guitar", "🎸"], ["Choir", "🎶"], ["DJing", "🎛️"]],
  Outdoors: [["Hiking", "🥾"], ["Camping", "🏕️"], ["Cycling", "🚲"], ["Skating", "⛸️"], ["Beach days", "🏖️"], ["Birdwatching", "🐦"], ["Skiing", "🎿"]],
  Social: [["Karaoke", "🎤"], ["Trivia nights", "🧠"], ["Clubs & societies", "🎪"], ["Volunteering", "🤝"], ["Thrifting", "🛍️"], ["Road trips", "🚗"], ["Movie nights", "🍿"]],
  "Academic & Career": [["Study groups", "📚"], ["Hackathons", "💻"], ["Startups", "🚀"], ["Research", "🔬"], ["Debate", "🗣️"], ["Investing", "📈"], ["Learning languages", "🌍"]],
  Wellness: [["Meditation", "🧘"], ["Journaling", "📓"], ["Pilates", "🤸"], ["Mental health", "💚"], ["Skincare", "🧴"], ["Early mornings", "🌅"], ["Reading", "📖"]],
};

// [prompt text, sample answers used by seed profiles]
const PROMPT_BANK: [string, string[]][] = [
  ["My ideal Saturday looks like…", ["Farmers market at 9, nap at 2, board games till midnight.", "Long run, big brunch, zero plans after that.", "Thrifting downtown then getting lost on the way home on purpose.", "Sleeping in, then a four-hour cooking project that may or may not work.", "Library in the morning (I know) and a concert at night.", "A day trip anywhere with a lake."]],
  ["The way to win me over as a friend is…", ["Send me a meme that proves you actually get my humour.", "Bring snacks to the study session. Any snacks.", "Remember the small thing I mentioned three weeks ago.", "Be down for a spontaneous 11pm grocery run.", "Recommend me a book and then actually ask what I thought.", "Laugh at my puns even when they're bad. Especially then."]],
  ["A hill I will die on…", ["Cereal is a soup. I will not be taking questions.", "8am classes should be illegal.", "The library's third floor is the only real study spot.", "Pineapple on pizza is elite.", "Walking is a completely valid hobby.", "Group projects need a group chat with a strict no-memes rule. (I break it.)"]],
  ["I'm looking for someone to…", ["Go to every free campus event with me, even the weird ones.", "Split a Costco membership and a giant bag of dumplings.", "Be my gym accountability buddy at 7am.", "Start a very casual book club of two.", "Try every bubble tea place within walking distance.", "Enter a trivia night and lose confidently."]],
  ["My most controversial food opinion…", ["Ketchup belongs on mac and cheese.", "Cold pizza is better than hot pizza.", "Oat milk tastes better than regular milk and I'm tired of pretending otherwise.", "Dining hall stir fry is genuinely good.", "Brunch is just lunch with a markup.", "Chocolate mint is the best ice cream flavour."]],
  ["The best spot on campus is…", ["The bench behind the science building at sunset.", "The quiet corner of the music library nobody knows about.", "The rooftop garden. Don't tell anyone.", "The second-floor lounge with the good couches.", "The café that has the cinnamon buns on Thursdays.", "Honestly? The laundry room at 1am. It's peaceful."]],
  ["Two truths and a lie…", ["I've met a Raptors player, I can juggle, I've never seen Star Wars.", "I was on a cooking show as a kid, I speak three languages, I hate chocolate.", "I've run a half marathon, I've been to 14 countries, I'm scared of geese.", "I can solve a Rubik's cube, I've never had a cavity, I once got stuck in an elevator for 3 hours.", "I have a twin, I've climbed a volcano, I can't whistle.", "I own 40 plants, I was born on a plane, I've read every Harry Potter book twice."]],
  ["I'll know we're friends when…", ["You steal fries off my plate without asking.", "We can sit in comfortable silence in the library.", "You send me a voice memo that's longer than four minutes.", "You know my coffee order by heart.", "We have at least one inside joke nobody else gets.", "You text me 'outside' and I actually come down."]],
  ["My go-to study snack is…", ["Frozen grapes. Trust me.", "An entire sleeve of rice crackers.", "Gummy bears as a reward system: one per paragraph.", "Apple slices with way too much peanut butter.", "Whatever's free at the student union that day.", "Seaweed snacks and iced coffee."]],
  ["Something I'm weirdly good at…", ["Parallel parking on the first try.", "Guessing the year a song came out.", "Remembering everyone's birthday.", "Finding four-leaf clovers.", "Assembling IKEA furniture without the manual.", "Beating people at Mario Kart while pretending I'm bad."]],
  ["My comfort show or movie…", ["Brooklyn Nine-Nine, for the fifth time.", "Studio Ghibli anything, especially Kiki's Delivery Service.", "The Great British Bake Off. It's basically therapy.", "Avatar: The Last Airbender. Obviously.", "Any 2000s rom-com with a makeover scene.", "Planet Earth with the volume on low."]],
  ["This semester I want to finally…", ["Go to the climbing gym more than once.", "Cook something that isn't pasta.", "Join a club and actually keep showing up.", "Learn enough Spanish to order food confidently.", "Stop pulling all-nighters. (We'll see.)", "Explore a new neighbourhood every weekend."]],
  ["The last thing that made me laugh out loud…", ["A squirrel stealing an entire bagel outside the library.", "My prof accidentally sharing their cat-filled desktop during a lecture.", "My roommate trying to parallel park a shopping cart.", "A goose chasing a campus tour group.", "Autocorrect changing 'midterm' to 'mid-tern' in my group chat.", "My own terrible attempt at latte art."]],
  ["A random fact I love…", ["Octopuses have three hearts.", "Honey never spoils; they've found edible honey in ancient tombs.", "Wombat poop is cube-shaped.", "Bananas are berries but strawberries aren't.", "There are more possible chess games than atoms in the universe.", "Sea otters hold hands while they sleep."]],
  ["You'll find me between classes…", ["Speed-walking to the café before the line gets long.", "On a bench, people-watching with headphones in.", "In the practice rooms, butchering a song on piano.", "At the gym, pretending I have more time than I do.", "Napping in the student centre. No shame.", "Sketching strangers (discreetly, I promise)."]],
];

type SeedUser = {
  name: string;
  gender: "male" | "female" | "rather_not_say";
  age: number;
  major: string;
  residence: "residence" | "commuter" | null;
  tags: string[];
  custom?: string;
  filter?: "same_gender";
};

const SEED_USERS: SeedUser[] = [
  { name: "Maya Chen", gender: "female", age: 19, major: "Computer Science", residence: "residence", tags: ["Bubble tea", "Hackathons", "Nintendo", "Photography"], custom: "Plant mom" },
  { name: "Jordan Okafor", gender: "male", age: 21, major: "Kinesiology", residence: "commuter", tags: ["Basketball", "Gym", "Hip-hop", "Brunch"] },
  { name: "Priya Raman", gender: "female", age: 20, major: "Psychology", residence: "residence", tags: ["Journaling", "Reading", "Coffee", "Mental health", "Indie"], custom: "Tea over coffee" },
  { name: "Liam Tremblay", gender: "male", age: 22, major: "Mechanical Engineering", residence: "commuter", tags: ["Cycling", "Hiking", "Board games", "Coffee"] },
  { name: "Sofia Alvarez", gender: "female", age: 18, major: "Biology", residence: "residence", tags: ["Soccer", "Baking", "K-pop", "Study groups"], custom: "Frog enthusiast" },
  { name: "Noah Kim", gender: "male", age: 19, major: "Computer Science", residence: "residence", tags: ["Valorant", "Hackathons", "Bubble tea", "Concerts"] },
  { name: "Aisha Mohammed", gender: "female", age: 21, major: "Political Science", residence: "commuter", tags: ["Debate", "Volunteering", "Writing", "Brunch"], filter: "same_gender" },
  { name: "Ethan Wright", gender: "male", age: 23, major: "Economics", residence: "commuter", tags: ["Investing", "Startups", "Running", "Chess"] },
  { name: "Riley Park", gender: "rather_not_say", age: 20, major: "Fine Arts", residence: "residence", tags: ["Drawing", "Thrifting", "Indie", "Film", "Crafts & DIY"], custom: "Zine maker" },
  { name: "Hannah Singh", gender: "female", age: 22, major: "Nursing", residence: "commuter", tags: ["Pilates", "Early mornings", "Cooking", "Movie nights"] },
  { name: "Marcus Johnson", gender: "male", age: 20, major: "Music", residence: "residence", tags: ["Jazz", "Guitar", "Concerts", "Karaoke"], custom: "Vinyl hoarder" },
  { name: "Chloé Martin", gender: "female", age: 19, major: "French Studies", residence: "residence", tags: ["Learning languages", "Film", "Coffee", "Fashion"] },
  { name: "Daniel Nguyen", gender: "male", age: 18, major: "Biology", residence: "residence", tags: ["Swimming", "Minecraft", "Study groups", "Plant-based food"] },
  { name: "Zara Ahmed", gender: "female", age: 21, major: "Computer Science", residence: "commuter", tags: ["Hackathons", "League of Legends", "Skincare", "Bubble tea"], filter: "same_gender" },
  { name: "Owen MacDonald", gender: "male", age: 22, major: "Environmental Science", residence: "commuter", tags: ["Camping", "Birdwatching", "Hiking", "Volunteering", "Photography"], custom: "Loon spotter" },
  { name: "Isabella Rossi", gender: "female", age: 20, major: "Psychology", residence: "residence", tags: ["Theatre", "Karaoke", "Brunch", "Journaling"] },
  { name: "Sam Rivera", gender: "rather_not_say", age: 19, major: "Film Studies", residence: "residence", tags: ["Film", "Movie nights", "D&D", "Writing"], custom: "Horror movie buff" },
  { name: "Arjun Patel", gender: "male", age: 21, major: "Accounting", residence: "commuter", tags: ["Soccer", "Investing", "Trivia nights", "Cooking"] },
  { name: "Emily Zhang", gender: "female", age: 18, major: "Architecture", residence: "residence", tags: ["Drawing", "Photography", "Coffee", "Skating"] },
  { name: "Tyler Brooks", gender: "male", age: 20, major: "History", residence: "residence", tags: ["D&D", "Board games", "Reading", "Trivia nights"], custom: "Map nerd" },
  { name: "Grace Oyelaran", gender: "female", age: 23, major: "Public Health", residence: "commuter", tags: ["Running", "Volunteering", "Choir", "Early mornings"] },
  { name: "Lucas Ferreira", gender: "male", age: 19, major: "Kinesiology", residence: "residence", tags: ["Volleyball", "Gym", "Beach days", "DJing"] },
  { name: "Mei Tanaka", gender: "female", age: 20, major: "Linguistics", residence: "residence", tags: ["Learning languages", "K-pop", "Baking", "Nintendo"], custom: "Onigiri expert" },
  { name: "Ben Cohen", gender: "male", age: 22, major: "Philosophy", residence: "commuter", tags: ["Chess", "Debate", "Coffee", "Jazz", "Reading"] },
  { name: "Olivia Brown", gender: "female", age: 21, major: "Marketing", residence: "commuter", tags: ["Thrifting", "Road trips", "Brunch", "Pilates"] },
  { name: "Kai Williams", gender: "rather_not_say", age: 21, major: "Computer Science", residence: "commuter", tags: ["Climbing", "Valorant", "Indie", "Meditation"] },
  { name: "Fatima Hassan", gender: "female", age: 19, major: "Biomedical Engineering", residence: "residence", tags: ["Research", "Study groups", "Baking", "Hiking"] },
  { name: "Ryan O'Connor", gender: "male", age: 20, major: "Economics", residence: null, tags: ["Skiing", "Road trips", "Hip-hop", "Karaoke"] },
  { name: "Leila Karimi", gender: "female", age: 22, major: "Fine Arts", residence: "commuter", tags: ["Drawing", "Crafts & DIY", "Meditation", "Trying new restaurants"], custom: "Pottery beginner" },
  { name: "Jamal Davis", gender: "male", age: 18, major: "Mechanical Engineering", residence: "residence", tags: ["Basketball", "Minecraft", "Hackathons", "Movie nights"] },
];

/** Tiny deterministic PRNG so seed data is stable between resets. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** DEMO: fake phone numbers for seed users, listed in the README so testers can try the block flow. */
export function seedPhone(index: number) {
  return `+1 (555) 010-${String(index + 1).padStart(4, "0")}`;
}

/** Fictional academic details for demo profiles, also used to upgrade older seeds. */
export function seedAcademics(major: string): { campus: Campus; degree: Degree } {
  const campus = ["French Studies", "Linguistics"].includes(major) ? "glendon"
    : ["Computer Science", "Accounting", "Marketing"].includes(major) ? "markham" : "keele";
  const degree = major.includes("Engineering") ? "BEng"
    : ["Computer Science", "Biology", "Kinesiology", "Environmental Science", "Public Health"].includes(major) ? "BSc"
    : major === "Nursing" ? "BScN"
    : ["Accounting", "Marketing"].includes(major) ? "BCom"
    : ["Fine Arts", "Music", "Film Studies"].includes(major) ? "BFA" : "BA";
  return { campus, degree };
}

/** All inserts for the demo seed, run by db.ts as one atomic batch. */
export function seedStatements(): InStatement[] {
  const rand = mulberry32(42);
  const now = Date.now();
  const out: InStatement[] = [];
  const add = (sql: string, args: InValue[]) => out.push({ sql, args });

  const tagByName = new Map<string, { id: number; emoji: string }>();
  for (const [category, tags] of Object.entries(TAG_TAXONOMY)) {
    for (const [name, emoji] of tags) {
      const id = tagByName.size + 1;
      tagByName.set(name, { id, emoji });
      add("INSERT INTO interest_tags (id, name, category, emoji) VALUES (?, ?, ?, ?)", [id, name, category, emoji]);
    }
  }
  PROMPT_BANK.forEach(([text], i) => add("INSERT INTO prompts (id, text) VALUES (?, ?)", [i + 1, text]));
  const answerCursor = PROMPT_BANK.map(() => 0);

  SEED_USERS.forEach((u, idx) => {
    const id = crypto.randomUUID();
    const email = `${u.name.toLowerCase().replace(/[^a-z ]/g, "").replace(/ /g, ".")}@sidekick-demo.edu`;
    const phone = seedPhone(idx);
    const academic = seedAcademics(u.major);
    add(
      `INSERT INTO users
        (id, email, phone, phone_hash, name, age, major, main_campus, degree, gender, residence_status, gender_filter_mode, profile_complete, is_seed, demo_simulated, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?)`,
      [id, email, phone, hashPhone(normalizePhone(phone)!), u.name, u.age, u.major, academic.campus, academic.degree, u.gender, u.residence, u.filter ?? "everyone", now - (idx + 1) * 86_400_000],
    );

    const tags = u.tags.map((name) => {
      const tag = tagByName.get(name);
      if (!tag) throw new Error(`Unknown seed tag: ${name}`);
      return tag;
    });
    const initials = u.name.split(" ").map((p) => p[0]).join("");
    [initials, tags[0].emoji, tags[1].emoji, tags[2].emoji].forEach((text, pos) =>
      add("INSERT INTO photos (id, user_id, url, position) VALUES (?, ?, ?, ?)", [crypto.randomUUID(), id, placeholderUrl(`u${idx}-${pos}`, text), pos]),
    );
    tags.forEach((t) => add("INSERT INTO user_interests (user_id, tag_id) VALUES (?, ?)", [id, t.id]));
    if (u.custom) add("INSERT INTO user_custom_tags (id, user_id, text) VALUES (?, ?, ?)", [crypto.randomUUID(), id, u.custom]);

    const promptIds = new Set<number>();
    while (promptIds.size < 3) promptIds.add(Math.floor(rand() * PROMPT_BANK.length));
    [...promptIds].forEach((p, pos) => {
      const answers = PROMPT_BANK[p][1];
      const answer = answers[answerCursor[p]++ % answers.length];
      // Every third profile gets an image on its first prompt, to show the image card variant.
      const image = pos === 0 && idx % 3 === 0 ? placeholderUrl(`p${idx}`, tags[3]?.emoji ?? "✨", "wide") : null;
      add("INSERT INTO user_prompts (id, user_id, prompt_id, answer_text, image_url, position) VALUES (?, ?, ?, ?, ?, ?)", [
        crypto.randomUUID(), id, p + 1, answer, image, pos,
      ]);
    });
  });
  return out;
}
