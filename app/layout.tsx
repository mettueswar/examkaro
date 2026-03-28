import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { MathJaxContext } from "better-react-mathjax";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ExamKaro – India's Best Mock Test Platform",
    template: "%s | ExamKaro",
  },
  description:
    "Prepare for SSC, Banking, Railway, UPSC and more with ExamKaro's comprehensive mock tests, previous year papers, and current affairs.",
  keywords: [
    "mock test",
    "exam preparation",
    "SSC",
    "banking",
    "UPSC",
    "Railway",
    "online test",
  ],
  authors: [{ name: "ExamKaro" }],
  creator: "ExamKaro",
  metadataBase: new URL("https://examkaro.com"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://examkaro.com",
    siteName: "ExamKaro",
    title: "ExamKaro – India's Best Mock Test Platform",
    description: "Practice with India's most comprehensive mock test series.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "ExamKaro" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ExamKaro – Mock Test Platform",
    description: "Ace your exams with ExamKaro.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${sora.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body className="min-h-screen bg-surface-50 font-sans">
        <MathJaxContext>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: "var(--font-jakarta)",
                  fontSize: "14px",
                  borderRadius: "8px",
                },
              }}
            />
          </AuthProvider>
        </MathJaxContext>
      </body>
    </html>
  );
}
