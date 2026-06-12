import "./globals.css";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata = {
  title: "REOS",
  description: "Real Estate Operating System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${monoFont.variable}`}>
        {children}
        <footer className="landing-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <strong>REOS</strong>
              <p>
                A product of{" "}
                <a href="https://bastionshieldtechnologies.com" target="_blank" rel="noopener noreferrer">
                  BastionShield Technologies
                </a>
                . &copy; {new Date().getFullYear()} All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
