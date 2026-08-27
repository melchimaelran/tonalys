import { cn } from "@/lib/utils";

interface TonalysLogoProps {
  showWordmark?: boolean;
  className?: string;
}

// Very simple brand mark: three vertical waveform bars, drawn in
// currentColor so it inherits the surrounding text colour (amber where
// placed on its own). The same shape backs src/app/icon.svg (favicon).
export function TonalysLogo({ showWordmark = false, className }: TonalysLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 20 20"
        className="h-5 w-5"
        fill="currentColor"
        {...(showWordmark
          ? { "aria-hidden": true }
          : { role: "img", "aria-label": "Tonalys" })}
      >
        <rect x="2" y="7" width="3" height="6" />
        <rect x="8.5" y="2" width="3" height="16" />
        <rect x="15" y="5" width="3" height="10" />
      </svg>
      {showWordmark && (
        <span className="font-sans text-sm font-semibold tracking-tight">
          Tonalys
        </span>
      )}
    </span>
  );
}
