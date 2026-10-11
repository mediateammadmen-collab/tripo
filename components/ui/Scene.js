import { sceneSVG } from "@/lib/tripo/scene";
import { richText } from "@/lib/tripo/util";

// A drawn illustration for a place ("beach", "city", "hotel"…), picked from its name when no scene is given.
export function Scene({ scene, name, className, style }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: sceneSVG(scene, name) }} />;
}

// Renders Tripo's light formatting: **bold**, "- " bullets and paragraphs. Input is escaped by richText().
export function RichText({ text, className = "rt" }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: richText(text) }} />;
}
