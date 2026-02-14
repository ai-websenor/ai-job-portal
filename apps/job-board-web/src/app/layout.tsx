import { Roboto } from "next/font/google";
import type { Metadata } from "next";
import Providers from "./layouts/Providers";
import "./globals.css";
import APP_CONFIG from "./config/config";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: `${APP_CONFIG.APP_NAME} | Find Your Next Career`,
  description: "The best place to find tech jobs.",
  icons: {
    icon: "/assets/images/logo.svg",
    shortcut: "/assets/images/logo.svg",
    apple: "/assets/images/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
