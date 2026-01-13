import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
    title: "Simba Bingwa Kikoba Endelevu",
    description: "Web management for Simba Bingwa Kikoba Endelevu",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <ThemeProvider>
                        {children}
                    </ThemeProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
