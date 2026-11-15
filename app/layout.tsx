import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "H&M India | Fashion and quality at the best price",
  description:
    "Demo clone of the H&M India online store – Ladies, Men, Kids, Baby, H&M HOME and Sport, powered by Next.js and Redis.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
