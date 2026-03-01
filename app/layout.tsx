import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RK Baldeneysee | Trainerportal",
  description: "Interne Trainingsverwaltung für den Ruderklub am Baldeneysee",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/rk.png",
    apple: "/rk.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RaB Trainer",
  },
  applicationName: "RaB Trainer",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const year = new Date().getFullYear();

  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <PwaRegister />
          <PwaInstallBanner />
          <div className="home-app-background flex min-h-dvh flex-col bg-background text-foreground">
            <main className="min-h-0 flex-1">{children}</main>
            <footer className="border-t border-border px-4 py-4 text-center text-sm text-muted-foreground">
              <p>© {year} Ruderklub am Baldeneysee – Intern</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs">
                Mit
                <span className="inline-block animate-heartbeat-scale text-red-500" aria-label="Herz">
                  ❤️
                </span>
                programmiert von Moritz Döppner
              </p>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
