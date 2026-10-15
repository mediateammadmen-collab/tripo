import { richText } from "@/lib/tripo/util";

// Renders Tripo's light formatting: **bold**, "- " bullets and paragraphs. Input is escaped by richText().
export function RichText({ text, className = "rt" }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: richText(text) }} />;
}
