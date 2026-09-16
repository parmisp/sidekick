import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Sidequest",
  description: "Find your people on campus. Friends, not dates.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#EFF3EA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable} antialiased`}>
      <body>
        {/* Phone-sized column; on desktop it sits centred on the dark frame colour. */}
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg">{children}</div>
      </body>
    </html>
  );
}
