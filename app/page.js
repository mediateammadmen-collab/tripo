import HomeScreen from "@/components/home/HomeScreen";
import { GlobalOverlays } from "@/components/shell/AppShell";
import { landingPhotos } from "@/lib/server/landing";

// Real destination photos are fetched on the server and refreshed once a day.
export const revalidate = 86400;

export default async function HomePage() {
  const photos = await landingPhotos();
  return (
    <>
      <HomeScreen photos={photos} />
      <GlobalOverlays />
    </>
  );
}
