import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = localFont({
  src: [
    { path: "./fonts/InterVariable.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/InterVariable-Italic.woff2", weight: "100 900", style: "italic" },
  ],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "EduHealth Portal - School Management System",
  description: "Professional health-focused education management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <ToastContainer position="top-right" autoClose={3000} />
      </body>
    </html>
  );
}
