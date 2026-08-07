// Картинка-превью для ссылок в соцсетях и мессенджерах (Open Graph / Twitter).
// Next.js сам подставляет её в мета-теги og:image и twitter:image для всего сайта.
// Рисуется на сервере в фирменных цветах Domora, без внешних шрифтов и файлов.
import { ImageResponse } from "next/og";

export const alt = "Domora - Home services in Ireland";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #4C7C3F 0%, #3d6533 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 110, fontWeight: 800, letterSpacing: -3 }}>
          <span>DOMO</span>
          <span style={{ color: "#EFF4EA" }}>RA</span>
        </div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 10, opacity: 0.96 }}>
          Home services in Ireland
        </div>
        <div style={{ display: "flex", fontSize: 27, marginTop: 44, opacity: 0.82, letterSpacing: 0.5 }}>
          Chef · Cleaning · Handyman · Beauty · Massage · Events
        </div>
        <div style={{ display: "flex", position: "absolute", bottom: 64, left: 90, fontSize: 32, fontWeight: 700 }}>
          domora.irish
        </div>
        <div style={{ display: "flex", position: "absolute", bottom: 66, right: 90, fontSize: 26, opacity: 0.85 }}>
          Free · no fees
        </div>
      </div>
    ),
    { ...size },
  );
}
