"use client";

import { ReactNode } from "react";
import { NextUIProvider } from "@nextui-org/react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>App Builder Studio - Custom Web & Mobile App Development</title>
        <meta
          name="description"
          content="We build custom web applications and mobile apps. From MVP to enterprise solutions, we turn your ideas into powerful, scalable software."
        />
        <link
          rel="icon"
          href="/images/logo.png"
          type="image/png"
        />
        <link
          href="https://fonts.googleapis.com/css?family=Josefin+Sans:100,100italic,300,300italic,400,400italic,600,600italic,700,700italic"
          rel="stylesheet"
          type="text/css"
        />
        <link
          href="https://fonts.googleapis.com/css?family=Roboto+Slab:100,300,400,700"
          rel="stylesheet"
          type="text/css"
        />
      </head>
      <body>
        <NextUIProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </NextUIProvider>
      </body>
    </html>
  );
}
