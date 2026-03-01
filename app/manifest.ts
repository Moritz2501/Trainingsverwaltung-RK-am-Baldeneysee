import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RK Baldeneysee Trainerportal",
    short_name: "RK Trainer",
    description: "Interne Trainingsverwaltung für den Ruderklub am Baldeneysee",
    start_url: "/",
    display: "standalone",
    background_color: "#020817",
    theme_color: "#1d4ed8",
    orientation: "portrait",
    lang: "de",
    icons: [
      {
        src: "/rk.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/rk.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/rk.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
