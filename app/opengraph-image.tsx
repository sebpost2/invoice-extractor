import { ImageResponse } from "next/og";

export const alt = "Invoice Extractor — AI for Peruvian receipts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fields = [
  { label: "VENDOR", value: "BLIJOU PERU SAC." },
  { label: "TAX ID", value: "20547530552" },
  { label: "TOTAL", value: "PEN 8.90" },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#09090b",
          color: "#f4f4f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#4ade80",
            }}
          />
          <span style={{ fontSize: 22, color: "#71717a", letterSpacing: 2 }}>
            LIVE EXTRACTION
          </span>
        </div>

        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 24 }}>
          Invoice Extractor
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", marginTop: 16, maxWidth: 820 }}>
          Upload a receipt, watch AI extract vendor, tax ID and totals live.
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 56 }}>
          {fields.map((f) => (
            <div
              key={f.label}
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 12,
                padding: "20px 28px",
              }}
            >
              <span style={{ fontSize: 18, color: "#71717a", letterSpacing: 1 }}>
                {f.label}
              </span>
              <span style={{ fontSize: 30, fontWeight: 600, marginTop: 6 }}>
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
