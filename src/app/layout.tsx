import { Web3AuthProviderWrapper } from "@/providers/Web3AuthProviderWrapper";
import { BiconomyProvider } from "@/contexts/biconomyContext";
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
  title: "Web3Auth + Biconomy POC",
  description: "Web3Auth 로그인 및 Biconomy 수수료 대납 데모 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ko'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3AuthProviderWrapper>
          <BiconomyProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#1f2937",
                  color: "#f3f4f6",
                  border: "1px solid #374151",
                },
              }}
            />
          </BiconomyProvider>
        </Web3AuthProviderWrapper>
      </body>
    </html>
  );
}
