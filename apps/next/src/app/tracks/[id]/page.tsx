import { BackLink } from "@/components/back-link";
import { TrackView } from "@/components/track-view";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-1 flex-col items-center gap-4 bg-background p-4">
      <div className="w-full max-w-2xl">
        <BackLink href="/" label="Home" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <TrackView trackId={id} />
      </div>
    </div>
  );
}
