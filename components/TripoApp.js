"use client";

import { useEffect } from "react";
import { TRIPO_MARKUP } from "@/lib/tripo/markup";
import { startTripo } from "@/lib/tripo/app";
import { siteConfig } from "@/lib/tripo/config";

// React renders the app shell once; lib/tripo/app.js then drives it directly.
// The component never re-renders, so React and the app never fight over the DOM.
export default function TripoApp() {
  useEffect(() => {
    startTripo(siteConfig);
  }, []);

  return <div id="tripo-root" dangerouslySetInnerHTML={{ __html: TRIPO_MARKUP }} />;
}
