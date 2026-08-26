import { TrackView } from "@/components/track-view";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-4">
      <TrackView trackId={id} />
    </div>
  );
}
