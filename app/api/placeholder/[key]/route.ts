// DEMO: generated SVG "photos" for seed profiles, so the demo needs no network access.
const PALETTES: [string, string, string][] = [
  ["#3D6E5B", "#E4EEE7", "#FFFFFF"],
  ["#FF6F45", "#FBEBC9", "#FFFFFF"],
  ["#F2B33D", "#FFF7E6", "#1E2B23"],
  ["#7A2E14", "#FF6F45", "#FBEBC9"],
  ["#5B6B60", "#DDE4D6", "#FFFFFF"],
  ["#E4EEE7", "#3D6E5B", "#1E2B23"],
  ["#FBEBC9", "#F2B33D", "#7A2E14"],
];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const escape = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(request: Request, ctx: RouteContext<"/api/placeholder/[key]">) {
  const { key } = await ctx.params;
  const url = new URL(request.url);
  const text = (url.searchParams.get("t") ?? "✨").slice(0, 4);
  const wide = url.searchParams.get("shape") === "wide";
  const [w, h] = wide ? [800, 600] : [600, 800];
  const seed = hash(key);
  const [bg, blob, fg] = PALETTES[seed % PALETTES.length];
  const isEmoji = /\p{Extended_Pictographic}/u.test(text);
  const cx1 = 80 + (seed % 5) * 90;
  const cy1 = 120 + ((seed >> 3) % 5) * 110;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <circle cx="${cx1}" cy="${cy1}" r="${wide ? 220 : 260}" fill="${blob}" opacity="0.55"/>
  <circle cx="${w - cx1 / 2}" cy="${h - cy1 / 2}" r="${wide ? 140 : 180}" fill="${blob}" opacity="0.35"/>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
    font-family="Georgia, serif" font-weight="600" font-size="${isEmoji ? 200 : 220}" fill="${fg}">${escape(text)}</text>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
