import { IntlGate } from "@/lib/intl/IntlGate";
import { IntlRouteGate } from "@/lib/intl/IntlRouteGate";
import { getDefaultLanguage } from "@/lib/intl/languageUtils";
import { Web3AuthProviderWrapper } from "@/providers/Web3AuthProviderWrapper";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
  title: "Web3Auth POC",
  description: "Web3Auth 로그인 데모 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ko'>
      <head>
        <style>{`
          #app-shell[data-intl="loading"] { visibility: hidden; }
          [data-intl-pending] { visibility: hidden; }
          #intl-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font: 16px system-ui;
            background: #111827;
            color: #f3f4f6;
            z-index: 2147483647;
          }
          #intl-overlay[hidden] {
            display: none;
          }
        `}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div id='intl-overlay' role='status' aria-live='polite'>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid #374151",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "500",
                color: "#d1d5db",
                minHeight: "24px",
              }}
              id='loading-text'
            >
              {/* Text will be set by JavaScript only */}
            </div>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <div id='app-shell' data-intl='loading'>
          <Web3AuthProviderWrapper>
            {children}
            <Toaster
              position='bottom-right'
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#1f2937",
                  color: "#f3f4f6",
                  border: "1px solid #374151",
                },
              }}
            />
          </Web3AuthProviderWrapper>

          <IntlGate baseLang={getDefaultLanguage()} />
          <IntlRouteGate />
        </div>
      </body>
    </html>
  );
}
