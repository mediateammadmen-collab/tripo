// JSON fetching for the free map/photo services, with good manners built in.
// These services refuse (HTTP 429) or slow down when one visitor sends a burst of parallel requests, so each one
// gets only a few requests at a time, and a "busy" answer is retried after a short pause.

export const UA = `Tripo/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "travel planner"}; ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact via site"})`;

const LIMITS = [
  [/(^|\.)(wikipedia|wikimedia|wikidata|wikivoyage)\.org$/i, 2],
  [/(^|\.)photon\.komoot\.io$/i, 4],
  [/(^|\.)openverse\.org$/i, 2],
];
const lanes = new Map(); // host group -> { active, queue }

function laneFor(host) {
  const hit = LIMITS.find(([re]) => re.test(host));
  if (!hit) return null;
  const id = String(hit[0]);
  if (!lanes.has(id)) lanes.set(id, { max: hit[1], active: 0, queue: [] });
  return lanes.get(id);
}
async function enter(lane) {
  if (lane.active >= lane.max) await new Promise((r) => lane.queue.push(r));
  lane.active++;
}
function leave(lane) {
  lane.active--;
  const next = lane.queue.shift();
  if (next) next();
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJSON(url, timeout = 8000) {
  const lane = laneFor(new URL(url).hostname);
  for (let attempt = 0; ; attempt++) {
    if (lane) await enter(lane);
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(timeout), cache: "no-store" });
    } finally {
      if (lane) leave(lane);
    }
    if ((res.status === 429 || res.status === 503) && attempt < 4) {
      const wait = parseFloat(res.headers.get("retry-after")) * 1000;
      await pause(Math.min(Number.isFinite(wait) ? wait : 1000 * (attempt + 1), 5000) + Math.random() * 500);
      continue;
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }
}
