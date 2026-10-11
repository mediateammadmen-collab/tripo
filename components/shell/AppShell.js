"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useTripo } from "@/lib/tripo/store";
import { useLang } from "@/lib/tripo/hooks";
import { t } from "@/lib/tripo/i18n";
import { Toast, Drawer, InviteModal, TripPicker, TripForm, VoiceOverlay } from "./Overlays";

const NAV = [
  { href: "/nearby", icon: "pin", key: "tabNearby" },
  { href: "/chat", icon: "chat", key: "tabChats" },
  { href: "/agent", icon: "spark", key: "tabAgent" },
  { href: "/inspiration", icon: "bulb", key: "tabInspiration" },
  { href: "/trips", icon: "suitcase", key: "tabPlan" },
  { href: "/profile", icon: "user", key: "tabProfile" },
];

// Loads the traveler's saved data once, in the browser.
export function TripoInit() {
  const init = useTripo((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return null;
}

export function LogoMark({ size = 16 }) {
  return (
    <span className="home-logo">
      <Icon name="sparkSolid" size={size} color="#FFFC00" />
    </span>
  );
}

function FooterNav() {
  useLang();
  const pathname = usePathname();
  return (
    <nav className="footer-nav" id="footerNav">
      <div className="side-brand">
        <LogoMark />
        <b>Tripo</b>
      </div>
      {NAV.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href}
            className={"footer-item" + (active ? " active" : "")}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              const s = useTripo.getState();
              if (n.href === "/chat") s.setChatSub("list");
              if (n.href === "/trips") s.showTrips(s.tripsTab, null);
            }}
          >
            <Icon name={n.icon} size={20} />
            <span>{t(n.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Frame for the main app screens: the page plus the tab bar (a side rail on wide screens).
export default function AppShell({ children }) {
  return (
    <>
      <div className="app">
        {children}
        <FooterNav />
      </div>
      <GlobalOverlays />
    </>
  );
}

export function GlobalOverlays() {
  return (
    <>
      <Drawer />
      <InviteModal />
      <TripPicker />
      <TripForm />
      <VoiceOverlay />
      <Toast />
    </>
  );
}
