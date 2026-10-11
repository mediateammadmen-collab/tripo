import { Poppins, Inter, Hind_Siliguri } from "next/font/google";
import { site } from "@/lib/tripo/config";
import { TripoInit } from "@/components/shell/AppShell";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--ff-poppins",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--ff-inter", display: "swap" });
const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--ff-hind",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  keywords: ["travel", "AI travel agent", "trip planner", "Bangladesh", "flights", "hotels", "Dhaka", "ভ্রমণ"],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFC00",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable} ${hind.variable}`}
      suppressHydrationWarning
    >
      <body>
        <TripoInit />
        {children}
      </body>
    </html>
  );
}
