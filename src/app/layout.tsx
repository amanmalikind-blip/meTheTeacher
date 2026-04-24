import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "meTheTeacher — Learn any topic, your way",
  description:
    "Generate HTML lessons customised to your level, teaching style, character, voice and language. Export to PDF."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-full">{children}</div>
      </body>
    </html>
  );
}
