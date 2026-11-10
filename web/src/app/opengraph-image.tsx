import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const alt =
  "Lumi · Finanzas claras: ingresos, tarjetas, cuotas y próximos vencimientos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function SocialImage() {
  const logo = await readFile(
    path.join(process.cwd(), "public", "logo-completo.png"),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 48,
        background: "linear-gradient(135deg, #fff7ed, #ffffff 70%)",
        color: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 650,
          padding: 20,
          justifyContent: "space-between",
        }}
      >
        {/* ImageResponse renders native image elements from the existing brand asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={"data:image/png;base64," + logo.toString("base64")}
          width={370}
          height={207}
          alt="Lumi Finanzas Claras"
        />
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 580,
          }}
        >
          Tu plata, con más claridad.
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            fontSize: 23,
            color: "#475569",
            paddingBottom: 12,
          }}
        >
          Tarjetas · Cuotas · Presupuestos
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 430,
          marginLeft: 24,
          borderRadius: 36,
          padding: 36,
          background: "#0f172a",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          Planificá los próximos meses.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 20,
            height: 190,
          }}
        >
          {[90, 160, 125, 185].map((height, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                height,
                width: 64,
                borderRadius: 14,
                background: i % 2 ? "#fdba74" : "#7dd3fc",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#cbd5e1" }}>
          Finanzas personales
        </div>
      </div>
    </div>,
    size,
  );
}
