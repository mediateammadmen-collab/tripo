"use client";

import { create } from "zustand";

// What the voice screen shows. Shared by live voice (voice.js) and the browser fallback (voice-browser.js).
export const useVoice = create(() => ({
  open: false,
  mode: "live", // live (OpenAI Realtime) | browser (built-in speech)
  state: "idle", // idle | connecting | listening | thinking | speaking | paused | error
  status: "",
  heard: "", // what the traveler said
  interim: false,
  reply: "", // what Tripo is saying (live caption)
  muted: false, // live: microphone off · browser: Tripo's voice off
  typeBox: false,
  shown: 0, // cards Tripo put on screen during this conversation
}));
