import { ImageResponse } from "next/og";

export const alt = "Vexa — Question Paper Builder and Learning Resources";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#090914", color: "white", padding: "72px 82px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", background: "#6366f1", fontSize: 36, fontWeight: 800 }}>V</div>
        <div style={{ display: "flex", fontSize: 38, fontWeight: 800 }}>Vexa</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
        <div style={{ display: "flex", fontSize: 63, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2 }}>Build classroom-ready test papers with confidence</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 27, lineHeight: 1.4, color: "#c7d2fe" }}>Structured question banks · Blueprint controls · Answer keys · Editable DOCX exports</div>
      </div>
      <div style={{ display: "flex", fontSize: 20, color: "#a5b4fc" }}>vexaonline.in</div>
    </div>,
    size,
  );
}
