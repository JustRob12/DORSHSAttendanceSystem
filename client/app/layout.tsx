import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SciTrack – DORSHS Attendance System",
  description: "Attendance Management System for Davao Oriental Regional Science High School",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

