import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { AriadneProvider } from "@/lib/ariadne-store";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ariadne — Inclusive Classroom Platform",
    template: "%s | Ariadne",
  },
  description:
    "A clear path to accessible classroom participation for learners with complex communication needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <body>
        <AriadneProvider>{children}</AriadneProvider>
      </body>
    </html>
  );
}
