import type { ReactNode } from "react";

// Small titled block shared by the homepage and the About page.
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
