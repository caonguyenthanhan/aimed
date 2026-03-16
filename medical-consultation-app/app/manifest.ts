import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedConsultAI",
    short_name: "MedConsultAI",
    description: "Tư vấn y tế & tâm lý với AI",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/medical-logo.png", sizes: "192x192", type: "image/png" },
      { src: "/medical-logo.png", sizes: "512x512", type: "image/png" },
    ],
  }
}

