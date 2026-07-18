import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ariadne Inclusive Classroom Platform",
    short_name: "Ariadne",
    description: "A clear path to accessible classroom participation.",
    start_url: "/sign-in",
    display: "standalone",
    background_color: "#f4f5f0",
    theme_color: "#287265",
    lang: "en-US",
    icons: [
      {
        src: "/ariadne-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
