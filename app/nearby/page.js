import { redirect } from "next/navigation";

// The old "Nearby" tab is now Explore.
export default function Page() {
  redirect("/explore");
}
