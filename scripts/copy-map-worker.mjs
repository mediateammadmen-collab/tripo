// Copies MapLibre's worker script into public/ so the browser can load it from our own site.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const to = join(root, "public/vendor/maplibre-gl-worker.mjs");
mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log("map worker copied to public/vendor/");
