import type { Metadata } from "next";
import "./globals.css";
import { TimerProvider } from "./context/TimerContext";

export const metadata: Metadata = {
  title: "UX Nightmares",
  description: "A game of intentionally terrible UX",
};

export default function GameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TimerProvider>
      {children}
    </TimerProvider>
  );
}
