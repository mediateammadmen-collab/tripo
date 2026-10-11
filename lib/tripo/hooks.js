"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useTripo } from "./store";

// Re-renders the component when the language changes; returns "en" or "bn".
export function useLang() {
  return useTripo((s) => s.lang);
}

// True on wide screens, where Chats shows the list and the conversation side by side.
const WIDE_QUERY = "(min-width:1100px)";
function subscribeWide(cb) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
export function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false
  );
}

// Opens the Tripo conversation and sends a message from anywhere in the app.
export function useAskTripo() {
  const router = useRouter();
  return useCallback(
    (text) => {
      const s = useTripo.getState();
      s.setChatSub("ai");
      router.push("/chat");
      if (text) s.sendChatMessage(text);
    },
    [router]
  );
}

// Opens the Tripo conversation without sending anything.
export function useOpenChat() {
  const router = useRouter();
  return useCallback(() => {
    useTripo.getState().setChatSub("ai");
    router.push("/chat");
  }, [router]);
}
