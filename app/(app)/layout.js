import AppShell from "@/components/shell/AppShell";

// Shared frame for the main app screens (tab bar, dialogs, voice mode).
export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
