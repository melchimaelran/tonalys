"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GithubLogo, LinkedinLogo } from "@phosphor-icons/react";
import { TonalysLogo } from "@/components/tonalys-logo";

const GITHUB_URL = "https://github.com/melchimaelran/tonalys";
const LINKEDIN_URL = "https://www.linkedin.com/in/melchimael-roeh-429ab6210/";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <TonalysLogo className="text-muted-foreground" />
          <span>Tonalys — built by Melchimael Roeh</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="transition-colors hover:text-foreground"
          >
            <GithubLogo aria-hidden className="size-4" />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="transition-colors hover:text-foreground"
          >
            <LinkedinLogo aria-hidden className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
