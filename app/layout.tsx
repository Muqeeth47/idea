import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Scheme Sahayak - Find Government Benefits",
    description: "Discover government schemes you're eligible for. No middlemen, no corruption - direct access to your benefits.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
