// DEMO: generated SVG "photos" for seed profiles, so the demo needs no network access.
const PALETTES: [string, string, string][] = [
  ["#0F766E", "#E3F4F1", "#FFFFFF"],
  ["#115E59", "#5EC2B4", "#FFFFFF"],
  ["#F5B83D", "#FDF1DA", "#0F2A2E"],
  ["#7A4B0A", "#F5B83D", "#FDF1DA"],
  ["#4F6E6B", "#DCE9E6", "#FFFFFF"],
  ["#E3F4F1", "#0F766E", "#0F2A2E"],
  ["#FDF1DA", "#F5B83D", "#7A4B0A"],
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
