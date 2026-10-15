"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useTripo } from "@/lib/tripo/store";
import { placeKey } from "@/lib/tripo/places";
import { L } from "@/lib/tripo/i18n";

// A real photo of a place — never a drawing.
//   q:    { name, context, kind: "place"|"hotel" } — looked up automatically, or
//   info: an already-known look-up result ({ photo, photoArea, photoNear, loading })
// While the photo is being found it shows a soft shimmer; if none exists, a plain tile with an icon.
export default function Photo({ q, info: given, className = "", icon = "pin", caption = true, alt = "" }) {
  const key = q && q.name ? placeKey(q) : "";
  const found = useTripo((s) => (key ? s.placeInfo[key] : null));
  const fixedReady = useTripo((s) => s.fixedPhotos !== null);
  const fixed = useTripo((s) => (key && s.fixedPhotos ? s.fixedPhotos[key] : null));
  const [broken, setBroken] = useState(0); // 1 = main photo failed (try the backup), 2 = both failed
  const known = given !== undefined && given !== null ? given : found;
  // A built-in place's photo is used until (or instead of) a full look-up.
  const info = known && (known.photo || !fixed) ? known : fixed || known;

  useEffect(() => {
    if (key && fixedReady && !found && !fixed) useTripo.getState().resolvePlaces([{ name: q.name, context: q.context || "", kind: q.kind || "place" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fixedReady]);
  useEffect(() => setBroken(0), [info && info.photo]);

  const cls = "photo " + className;
  const src = info && (broken === 0 ? info.photo : broken === 1 ? info.photoAlt : "");
  if (src) {
    const note = !caption ? "" : info.photoArea ? L("Photo of ", "ছবি: ") + info.photoArea : info.photoNear ? L("Photo taken nearby", "কাছাকাছি তোলা ছবি") : "";
    return (
      <div className={cls}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken((b) => b + 1)} />
        {note ? <span className="photo-note">{note}</span> : null}
      </div>
    );
  }
  const waiting = (!info && key) || (info && (info.loading || info.photoPending));
  return (
    <div className={cls + (waiting ? " photo-wait" : " photo-none")} aria-hidden="true">
      {!waiting && <Icon name={icon} size={22} />}
    </div>
  );
}
