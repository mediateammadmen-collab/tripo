"use client";

// Fallback voice mode, used when live voice (OpenAI Realtime) isn't available.
// Free: it uses the browser's own speech recognition (to hear the traveler)
// and speech synthesis (to read Tripo's reply aloud).

import { L, getLang } from "./i18n";
import { vCleanForSpeech, vSplit } from "./speechtext";
import { useTripo } from "./store";
import { useVoice } from "./voice-state";

const set = (patch) => useVoice.setState(patch);

let rec = null, active = false, userStop = false, noSpeech = 0, micBlocked = false, speakQueue = 0, voices = [], wired = false;
const SpeechRec = () => (typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
const synth = () => (typeof window === "undefined" ? null : window.speechSynthesis || null);

function loadVoices() {
  try { voices = synth() ? synth().getVoices() : []; } catch { voices = []; }
}
function wireOnce() {
  if (wired) return;
  wired = true;
  const s = synth();
  if (s) {
    loadVoices();
    try { s.addEventListener("voiceschanged", loadVoices); } catch { s.onvoiceschanged = loadVoices; }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && active) {
      interrupt();
      try { if (rec) rec.abort(); } catch {}
      setState("paused");
    }
  });
}

function pickVoice() {
  if (!voices.length) loadVoices();
  const want = getLang() === "bn" ? ["bn-BD", "bn-IN", "bn"] : ["en-GB", "en-US", "en-IN", "en"];
  for (const w of want) {
    const list = voices.filter((v) => (v.lang || "").replace("_", "-").toLowerCase().indexOf(w.toLowerCase()) === 0);
    if (list.length) {
      const nice = list.filter((v) => /google|natural|neural|samantha|premium|enhanced/i.test(v.name));
      return nice[0] || list[0];
    }
  }
  return null;
}

function setState(state, text) {
  const label =
    {
      listening: L("Listening… go ahead", "শুনছি… বলুন"),
      thinking: L("Thinking…", "ভাবছি…"),
      speaking: L("Tripo is speaking · tap to interrupt", "Tripo বলছে · থামাতে ট্যাপ করুন"),
      paused: L("Tap the circle to talk", "কথা বলতে বৃত্তে ট্যাপ করুন"),
    }[state] || "";
  set({ state, status: text || label });
}
const current = () => useVoice.getState().state;

function interrupt() {
  speakQueue++;
  try { if (synth()) synth().cancel(); } catch {}
}

function speak(text, done) {
  const cleanText = vCleanForSpeech(text);
  const muted = useVoice.getState().muted;
  const s = synth();
  if (!s || muted || !cleanText) {
    setState("paused", muted ? L("Voice is off — reading only", "ভয়েস বন্ধ — শুধু পড়ুন") : "");
    setTimeout(done, muted ? 600 : 0);
    return;
  }
  const voice = pickVoice();
  if (!voice && getLang() === "bn") {
    setState("paused", L("This device has no Bangla voice, so I'm showing the answer as text.", "এই ডিভাইসে বাংলা ভয়েস নেই, তাই উত্তরটি লেখায় দেখাচ্ছি।"));
    setTimeout(done, 1800);
    return;
  }
  try { s.cancel(); } catch {}
  const chunks = vSplit(cleanText);
  let idx = 0;
  const token = ++speakQueue;
  setState("speaking");
  function next() {
    if (token !== speakQueue || !active) return;
    if (idx >= chunks.length) { done(); return; }
    const u = new SpeechSynthesisUtterance(chunks[idx++]);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = getLang() === "bn" ? "bn-BD" : "en-US";
    u.rate = 1.02; u.pitch = 1;
    u.onend = next;
    u.onerror = () => next();
    s.speak(u);
  }
  next();
}

function listen() {
  const SR = SpeechRec();
  if (!active || !SR) return;
  try { if (synth()) synth().cancel(); } catch {}
  try { if (rec) rec.abort(); } catch {}
  rec = new SR();
  rec.lang = getLang() === "bn" ? "bn-BD" : "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "", gotResult = false;
  userStop = false;
  rec.onstart = () => { setState("listening"); set({ heard: "", interim: false }); };
  rec.onresult = (evt) => {
    let interim = "", fin = "";
    for (let i = evt.resultIndex; i < evt.results.length; i++) {
      const tr = evt.results[i][0].transcript;
      if (evt.results[i].isFinal) fin += tr; else interim += tr;
    }
    if (fin) finalText += fin;
    gotResult = true;
    set({ heard: (finalText + " " + interim).trim(), interim: !fin });
  };
  rec.onerror = (e) => {
    const code = e && e.error;
    if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
      micBlocked = true;
      set({ typeBox: true });
      setState("paused", L("The microphone is blocked here. Allow mic access in your browser, or type below — Tripo will still answer out loud.", "এখানে মাইক্রোফোন বন্ধ। ব্রাউজারে মাইক চালু করুন, অথবা নিচে লিখুন — Tripo জোরে উত্তর দেবে।"));
    } else if (code === "network") {
      setState("paused", L("Voice needs an internet connection. Tap the circle to try again.", "ভয়েসের জন্য ইন্টারনেট লাগবে। আবার চেষ্টা করতে বৃত্তে ট্যাপ করুন।"));
    }
  };
  rec.onend = () => {
    if (!active) return;
    const text = finalText.trim();
    if (text) { noSpeech = 0; ask(text); return; }
    if (current() === "paused") return;
    if (userStop) { setState("paused"); return; }
    noSpeech++;
    if (noSpeech < 3 && !gotResult) setTimeout(() => { if (active && current() === "listening") listen(); }, 250);
    else setState("paused");
  };
  try { rec.start(); } catch { setState("paused"); }
}

async function ask(text) {
  if (!active) return;
  setState("thinking");
  set({ heard: text, interim: false });
  if (useTripo.getState().aiBusy) await new Promise((r) => setTimeout(r, 1200));
  const res = await useTripo.getState().sendChatMessage(text);
  await new Promise((r) => setTimeout(r, 900)); // let cards render
  if (!active) return;
  const reply = res && res.reply ? res.reply : L("Sorry, I didn't catch that. Could you say it again?", "দুঃখিত, বুঝতে পারিনি। আবার বলবেন?");
  set({ reply });
  const spoken = reply + (res && res.cards ? "\n" + L("I've put the options on your screen.", "অপশনগুলো আপনার স্ক্রিনে দিয়েছি।") : "");
  speak(spoken, () => {
    if (active && !micBlocked && SpeechRec()) listen();
    else if (active) setState("paused", micBlocked ? L("Type your next question below", "নিচে পরের প্রশ্ন লিখুন") : "");
  });
}

/* ---------------- what the screen calls ---------------- */

export function browserOpen() {
  wireOnce();
  useTripo.getState().ensureGreeting();
  active = true;
  noSpeech = 0;
  set({ open: true, mode: "browser", heard: "", interim: false, reply: "", shown: 0 });
  // unlock speech on iPhone/iPad: the first utterance must start inside a tap
  if (synth()) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth().speak(u); } catch {} }
  const p = useTripo.getState().profile;
  const hello = p && p.name
    ? L("Hi " + p.name + "! Where would you like to go?", "হাই " + p.name + "! কোথায় যেতে চান?")
    : L("Hi! I'm Tripo. Where would you like to go?", "হাই! আমি Tripo। কোথায় যেতে চান?");
  set({ reply: hello });
  if (!SpeechRec()) {
    set({ typeBox: true });
    setState("paused", L("Voice input isn't supported in this browser. Type below and Tripo will answer out loud.", "এই ব্রাউজারে ভয়েস ইনপুট নেই। নিচে লিখুন, Tripo জোরে উত্তর দেবে।"));
    speak(hello, () => {});
    return;
  }
  set({ typeBox: micBlocked });
  speak(hello, () => { if (active) listen(); });
}

export function browserClose() {
  active = false;
  try { if (rec) rec.abort(); } catch {}
  try { if (synth()) synth().cancel(); } catch {}
  set({ open: false, state: "idle", status: "" });
}

export function browserOrbTap(focusTypeInput) {
  const st = current();
  const canListen = SpeechRec() && !micBlocked;
  if (st === "speaking") { interrupt(); if (canListen) listen(); else setState("paused"); return; }
  if (st === "listening") { userStop = true; try { rec.stop(); } catch {} return; }
  if (st === "thinking") return;
  if (!canListen) { if (focusTypeInput) focusTypeInput(); return; }
  noSpeech = 0;
  listen();
}

export function browserToggleMute() {
  const muted = !useVoice.getState().muted;
  set({ muted });
  if (muted && current() === "speaking") {
    interrupt();
    if (SpeechRec() && !micBlocked) listen(); else setState("paused");
  }
}

export function browserToggleTypeBox() {
  const show = !useVoice.getState().typeBox;
  set({ typeBox: show });
  if (show) {
    try { if (rec) rec.abort(); } catch {}
    setState("paused", L("Type your question below", "নিচে প্রশ্ন লিখুন"));
  }
  return show;
}

export function browserAskTyped(text) {
  const v = String(text || "").trim();
  if (!v) return;
  interrupt();
  ask(v);
}
