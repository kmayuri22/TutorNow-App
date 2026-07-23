import type { Metadata } from "next";
import "./globals.css";
import ClientLayoutWrapper from "@/components/common/ClientLayoutWrapper";

export const metadata: Metadata = {
  title: "TutorNow - Real-Time On-Demand Tutor Booking Platform",
  description: "Book certified, professional tutors in real-time. Manage lessons, availability, and payments securely.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TutorNow",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="transition-colors duration-200">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
