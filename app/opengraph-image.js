import { ImageResponse } from "next/og";

export const alt = "Tripo — Your AI travel agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "radial-gradient(120% 80% at 85% 0%, #2A2A12 0%, #0A0A0A 55%)",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 16,
            background: "#FFFC00",
            color: "#0A0A0A",
            borderRadius: 999,
            padding: "10px 30px 10px 10px",
            fontSize: 40,
            fontWeight: 800,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 56,
              background: "#0A0A0A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path fill="#FFFC00" d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4z" />
            </svg>
          </div>
          Tripo
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 78, fontWeight: 800, lineHeight: 1.12, marginTop: 44, letterSpacing: -2 }}>
          <span>Your AI travel agent,&nbsp;</span>
          <span style={{ color: "#FFFC00" }}>wherever you go</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 30, color: "rgba(255,255,255,0.75)" }}>
          Plan trips · compare flights &amp; hotels · talk to a real expert
        </div>
      </div>
    ),
    size
  );
}
