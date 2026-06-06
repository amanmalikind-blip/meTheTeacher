import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "meTheTeacher — CBSE chapters explained your way",
  description:
    "AI teacher for CBSE Class 10 & 12. Explains chapters with analogies built from your own interests, in English, Hindi or Hinglish. Read aloud or export to PDF."
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
