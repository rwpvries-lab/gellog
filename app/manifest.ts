import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gellog",
    short_name: "Gellog",
    description: "Your personal ice cream diary",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#D97706",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
