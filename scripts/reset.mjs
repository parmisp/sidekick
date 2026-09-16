// Deletes the local demo database, secrets and uploads. They're recreated (and
// re-seeded) automatically the next time the app handles a request.
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
fs.rmSync(dir, { recursive: true, force: true });
console.log("Removed ./data. Restart `npm run dev` for a freshly seeded demo.");
