import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: 128,
          background: "linear-gradient(135deg, #f97316, #14b8a6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 300,
        }}
      >
        🍦
      </div>
    ),
    { ...size },
  );
}
