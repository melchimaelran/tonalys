import { TrackLibrary } from "@/components/track-library";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-background p-4">
      <main className="w-full max-w-2xl">
        <TrackLibrary />
      </main>
    </div>
  );
}
