import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
          <div className="min-h-screen bg-background text-foreground">
            {children}
            <footer className="border-t border-border px-4 py-4 text-center text-sm text-muted-foreground">
              <p>© {year} Ruderklub am Baldeneysee – Intern</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs">
                Mit
                <span className="inline-block animate-pulse text-red-500" aria-label="Herz">
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
