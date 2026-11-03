// JSON fetching for the free map/photo services, with good manners built in.
// These services refuse (HTTP 429) or slow down when one visitor sends a burst of parallel requests, so each one
// gets only a few requests at a time, and a "busy" answer is retried after a short pause.

export const UA = `Tripo/1.0 (${process.env.NEXT_PUBLIC_SITE_URL || "travel planner"}; ${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact via site"})`;

const LIMITS = [
  [/(^|\.)(wikipedia|wikimedia|wikidata|wikivoyage)\.org$/i, 2],
  [/(^|\.)photon\.komoot\.io$/i, 2],
  [/(^|\.)openverse\.org$/i, 2],
];
const lanes = new Map(); // host group -> { active, queue, firstQueue, until }
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function laneFor(host) {
  const hit = LIMITS.find(([re]) => re.test(host));
  if (!hit) return null;
  const id = String(hit[0]);
  if (!lanes.has(id)) lanes.set(id, { max: hit[1], active: 0, queue: [], firstQueue: [] });
  return lanes.get(id);
}
async function enter(lane, first) {
  if (lane.active >= lane.max) await new Promise((r) => lane[first ? "firstQueue" : "queue"].push(r));
  lane.active++;
  // The service just said "too many requests": everyone waits, so the block isn't made longer.
  const wait = (lane.until || 0) - Date.now();
  if (wait > 0) await pause(wait);
}
function leave(lane) {
  lane.active--;
  const next = lane.firstQueue.shift() || lane.queue.shift();
  if (next) next();
}

// retries: how many times a "busy" answer is tried again (lower it when something faster can be asked instead).
// first: go ahead of requests that are already waiting (a map pin depends on this one, not just a photo).
export async function getJSON(url, timeout = 8000, { retries = 4, first = false } = {}) {
  const lane = laneFor(new URL(url).hostname);
  for (let attempt = 0; ; attempt++) {
    if (lane) await enter(lane, first);
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(timeout), cache: "no-store" });
    } finally {
      if (lane) leave(lane);
    }
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      const after = parseFloat(res.headers.get("retry-after")) * 1000;
      const wait = Math.min(Number.isFinite(after) ? after : 1000 * (attempt + 1), 5000);
      if (lane && res.status === 429) lane.until = Math.max(lane.until || 0, Date.now() + wait);
      await pause(wait + Math.random() * 500);
      continue;
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }
}
