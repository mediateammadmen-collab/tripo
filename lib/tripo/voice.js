"use client";

// Live voice conversation with Tripo, using OpenAI's Realtime API over WebRTC.
//
// The traveler talks naturally (and can interrupt); Tripo answers out loud. When Tripo recommends
// places, plans, flights or hotels it calls a "show_…" tool, and the matching cards and map pins
// appear in the chat while it talks. Everything said is also written into the chat.
//
// If live voice can't start (no key on the server, old browser, network), the free browser voice
// mode in voice-browser.js is used instead.

import { L, getLang } from "./i18n";
import { nowTime } from "./util";
import { profileLine } from "./items";
import { runtime } from "./travel";
import { shownNote } from "./ai";
import { useTripo } from "./store";
import { useVoice } from "./voice-state";
import { browserOpen, browserClose, browserOrbTap, browserToggleMute, browserToggleTypeBox, browserAskTyped } from "./voice-browser";

export { useVoice };

const set = (patch) => useVoice.setState(patch);
const MAX_MINUTES = 15; // a single conversation ends after this long
const IDLE_SECONDS = 120; // …or after this long with nobody talking

let pc = null, dc = null, mic = null, audioEl = null, levelCtx = null, rafId = 0;
let live = false, pendingUser = null, idleTimer = null, maxTimer = null, startToken = 0;

const tripo = () => useTripo.getState();

function setState(state, text) {
  const label =
    {
      connecting: L("Connecting…", "সংযোগ হচ্ছে…"),
      listening: L("I'm listening — go ahead", "শুনছি — বলুন"),
      thinking: L("Thinking…", "ভাবছি…"),
      speaking: L("Tripo is talking · just speak to interrupt", "Tripo বলছে · থামাতে কথা বলুন"),
      paused: L("Microphone off", "মাইক্রোফোন বন্ধ"),
    }[state] || "";
  set({ state, status: text || label });
}

function send(event) {
  if (dc && dc.readyState === "open") dc.send(JSON.stringify(event));
}

function bumpIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => endLive(L("Ended after two quiet minutes. Tap the voice button to talk again.", "দুই মিনিট কোনো কথা না হওয়ায় শেষ হয়েছে। আবার কথা বলতে ভয়েস বাটনে ট্যাপ করুন।")), IDLE_SECONDS * 1000);
}

/* ---------------- what Tripo can show while it talks ---------------- */
function runTool(name, args) {
  const s = tripo();
  let block = null;
  if (name === "show_places" && Array.isArray(args.places) && args.places.length) block = { t: "places", places: args.places };
  else if (name === "show_itinerary" && Array.isArray(args.days) && args.days.length) block = { t: "itin", items: args.days, dest: args.destination || "" };
  else if (name === "show_flights") block = { t: "flight", f: args || {} };
  else if (name === "show_hotels") block = { t: "hotel", h: args || {} };
  else if (name === "talk_to_human") block = { t: "handoff" };
  if (!block) return { shown: false, reason: "nothing to show" };
  useTripo.setState({ mapFocus: null }); // let the map move to the new places
  s.pushBlock(block);
  // Remember what was shown so typed follow-ups ("more like these") know about it.
  const note = shownNote({ places: args.places, flight: name === "show_flights" ? args : null, hotel: name === "show_hotels" ? args : null });
  if (note) s.pushHistory({ role: "assistant", content: note.trim(), display: "" });
  set({ shown: useVoice.getState().shown + 1 });
  return { shown: true, note: "Shown on the traveler's screen. Mention it briefly; don't read it all out." };
}

/* ---------------- events from OpenAI ---------------- */
function onEvent(ev) {
  const s = tripo();
  switch (ev.type) {
    case "input_audio_buffer.speech_started":
      bumpIdle();
      set({ heard: "", interim: true });
      setState("listening");
      break;
    case "input_audio_buffer.speech_stopped":
      // Hold the traveler's place in the chat; the words arrive a moment later.
      if (!pendingUser) pendingUser = s.pushBlock({ t: "msg", role: "user", text: "…", time: nowTime() });
      setState("thinking");
      break;
    case "conversation.item.input_audio_transcription.completed": {
      const text = String(ev.transcript || "").trim();
      set({ heard: text, interim: false });
      if (pendingUser) {
        if (text) s.updateBlock(pendingUser, { text });
        else s.removeBlock(pendingUser);
      } else if (text) s.pushBlock({ t: "msg", role: "user", text, time: nowTime() });
      pendingUser = null;
      if (text) s.pushHistory({ role: "user", content: text });
      break;
    }
    case "response.created":
      set({ reply: "" });
      if (useVoice.getState().state !== "speaking") setState("thinking");
      break;
    case "response.output_audio_transcript.delta":
      set({ reply: useVoice.getState().reply + (ev.delta || "") });
      break;
    case "response.output_audio_transcript.done": {
      const text = String(ev.transcript || "").trim();
      if (text) {
        s.pushBlock({ t: "msg", role: "assistant", text, time: nowTime() });
        s.pushHistory({ role: "assistant", content: text, display: text });
        setTimeout(() => tripo().saveChat(), 300);
      }
      break;
    }
    case "output_audio_buffer.started":
      bumpIdle();
      setState("speaking");
      break;
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      if (live) setState(useVoice.getState().muted ? "paused" : "listening");
      break;
    case "response.done": {
      const out = (ev.response && ev.response.output) || [];
      const calls = out.filter((o) => o.type === "function_call");
      if (!calls.length) break;
      calls.forEach((c) => {
        let args = {};
        try { args = JSON.parse(c.arguments || "{}"); } catch {}
        const result = runTool(c.name, args);
        send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify(result) } });
      });
      send({ type: "response.create" });
      setTimeout(() => tripo().saveChat(), 300);
      break;
    }
    case "error":
      console.warn("Tripo voice:", ev.error && ev.error.message);
      break;
    default:
  }
}

/* ---------------- the orb follows the voices ---------------- */
function watchLevels(streams) {
  try {
    levelCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analysers = streams.map((st) => {
      const a = levelCtx.createAnalyser();
      a.fftSize = 256;
      levelCtx.createMediaStreamSource(st).connect(a);
      return a;
    });
    const buf = new Uint8Array(128);
    const tick = () => {
      let peak = 0;
      analysers.forEach((a) => {
        a.getByteTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
      });
      const el = document.getElementById("voiceOverlay");
      if (el) el.style.setProperty("--lvl", Math.min(1, peak * 2.2).toFixed(3));
      rafId = requestAnimationFrame(tick);
    };
    tick();
  } catch {}
}

/* ---------------- start / stop ---------------- */
function profileText() {
  const p = tripo().profile;
  return p ? profileLine(p).replace(/Personalize every suggestion[\s\S]*$/, "").trim() : "";
}
function recentContext() {
  return tripo()
    .history.filter((m) => m.display !== "")
    .slice(-8)
    .map((m) => (m.role === "user" ? "Traveler: " : "Tripo: ") + String(m.display || m.content).replace(/\n\[Shown:[\s\S]*$/, "").slice(0, 300))
    .join("\n");
}

async function startLive() {
  const token = ++startToken;
  live = true;
  set({ open: true, mode: "live", heard: "", interim: false, reply: "", muted: false, typeBox: false, shown: 0 });
  setState("connecting");
  // Audio must be unlocked inside the tap that opened voice (iPhone/iPad).
  audioEl = new Audio();
  audioEl.autoplay = true;
  audioEl.playsInline = true;
  audioEl.play().catch(() => {});

  if (!window.RTCPeerConnection || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("unsupported");
  // Ask for the microphone and the voice session at the same time — it connects faster.
  const sessionP = fetch("/api/voice/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang: getLang(), profile: profileText(), context: recentContext(), homeCity: runtime.HOME_CITY }),
  })
    .then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) }))
    .catch(() => ({ ok: false, body: {} }));
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    const e = new Error("mic_blocked");
    e.code = "mic_blocked";
    throw e;
  }
  if (token !== startToken) return;
  const { ok, body: sess } = await sessionP;
  if (!ok || !sess.value) {
    const e = new Error(sess.error || "unavailable");
    e.code = sess.error || "unavailable";
    throw e;
  }
  if (token !== startToken) return;

  pc = new RTCPeerConnection();
  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
    audioEl.play().catch(() => {});
    watchLevels([e.streams[0], mic]);
  };
  pc.onconnectionstatechange = () => {
    if (pc && (pc.connectionState === "failed" || pc.connectionState === "disconnected") && live) endLive(L("The connection dropped. Tap the voice button to talk again.", "সংযোগ কেটে গেছে। আবার কথা বলতে ভয়েস বাটনে ট্যাপ করুন।"));
  };
  pc.addTrack(mic.getAudioTracks()[0], mic);
  dc = pc.createDataChannel("oai-events");
  dc.onmessage = (m) => {
    try {
      const ev = JSON.parse(m.data);
      if (window.__tripoVoiceLog) window.__tripoVoiceLog.push(ev.type); // for testing
      onEvent(ev);
    } catch {}
  };
  dc.onopen = () => {
    setState("listening");
    send({ type: "response.create" }); // Tripo says hello first
    bumpIdle();
    maxTimer = setTimeout(() => endLive(L("That's the end of this voice chat (15 minutes). Tap the voice button to keep going.", "এই ভয়েস চ্যাট শেষ (১৫ মিনিট)। চালিয়ে যেতে আবার ভয়েস বাটনে ট্যাপ করুন।")), MAX_MINUTES * 60000);
  };

  await pc.setLocalDescription(await pc.createOffer());
  const answer = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: pc.localDescription.sdp,
    headers: { Authorization: "Bearer " + sess.value, "Content-Type": "application/sdp" },
  });
  if (!answer.ok) throw new Error("connect_failed");
  if (token !== startToken) return;
  await pc.setRemoteDescription({ type: "answer", sdp: await answer.text() });
}

function teardown() {
  clearTimeout(idleTimer);
  clearTimeout(maxTimer);
  cancelAnimationFrame(rafId);
  try { if (dc) dc.close(); } catch {}
  try { if (pc) pc.close(); } catch {}
  try { if (mic) mic.getTracks().forEach((t) => t.stop()); } catch {}
  try { if (levelCtx) levelCtx.close(); } catch {}
  try { if (audioEl) { audioEl.pause(); audioEl.srcObject = null; } } catch {}
  if (pendingUser) { tripo().removeBlock(pendingUser); pendingUser = null; }
  pc = dc = mic = levelCtx = audioEl = null;
}

function endLive(message) {
  live = false;
  startToken++;
  teardown();
  tripo().saveChat();
  set({ open: false, state: "idle", status: "", reply: "", heard: "" });
  if (message) tripo().showToast(message);
}

/* ---------------- what the screen calls ---------------- */

export async function openVoice() {
  tripo().ensureGreeting();
  if (useVoice.getState().open) return;
  try {
    await startLive();
  } catch (e) {
    teardown();
    live = false;
    // Live voice isn't available here (or the microphone is blocked): the browser's own voice mode
    // takes over; it explains a blocked microphone and offers typing instead.
    console.warn("Live voice unavailable, using browser voice:", e && (e.code || e.message));
    browserOpen();
  }
}

export function closeVoice() {
  if (useVoice.getState().mode === "browser") return browserClose();
  endLive();
}

export function orbTap(focusTypeInput) {
  const v = useVoice.getState();
  if (v.mode === "browser") return browserOrbTap(focusTypeInput);
  if (!live) return openVoice();
  if (v.state === "speaking") {
    send({ type: "response.cancel" });
    send({ type: "output_audio_buffer.clear" });
    setState("listening");
  } else if (v.muted) toggleMute();
}

export function toggleMute() {
  const v = useVoice.getState();
  if (v.mode === "browser") return browserToggleMute();
  const muted = !v.muted;
  if (mic) mic.getAudioTracks().forEach((t) => (t.enabled = !muted));
  set({ muted });
  if (live) setState(muted ? "paused" : "listening");
}

export function toggleTypeBox() {
  if (useVoice.getState().mode === "browser") return browserToggleTypeBox();
  const show = !useVoice.getState().typeBox;
  set({ typeBox: show });
  return show;
}

export function askTyped(text) {
  const v = String(text || "").trim();
  if (!v) return;
  if (useVoice.getState().mode === "browser" || !live) return browserAskTyped(v);
  const s = tripo();
  s.pushBlock({ t: "msg", role: "user", text: v, time: nowTime() });
  s.pushHistory({ role: "user", content: v });
  send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: v }] } });
  send({ type: "response.create" });
  bumpIdle();
}
