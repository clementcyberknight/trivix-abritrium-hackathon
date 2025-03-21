import localFont from "next/font/local";
import ClientLayout from "./components/ClientLayout";
import "./globals.css";

// Font configurations
const myFont = localFont({ src: "./fonts/Aeonik.otf" });

export const metadata = {
  title: "Trivix",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  // Function to get initial theme safely
  const getInitialTheme = () => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light"; // Default theme on server
  };

  const initialTheme = getInitialTheme();

  return (
    <html
      lang="en"
      className={`${initialTheme === "dark" ? "dark" : "light"} scroll-smooth`}
    >
      <head>
        <meta name="Trivix" content="Trivix" />
      </head>
      <body className={myFont.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
