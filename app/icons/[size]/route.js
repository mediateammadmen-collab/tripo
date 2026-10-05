import { ImageResponse } from "next/og";
import { LogoMark } from "@/lib/tripo/logo";

// PNG app icons for the web app manifest: /icons/192 and /icons/512
const SIZES = [192, 512];

export const dynamicParams = false;
export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_req, { params }) {
  const { size } = await params;
  const px = Number(size);
  return new ImageResponse(<LogoMark size={px} />, { width: px, height: px });
}
