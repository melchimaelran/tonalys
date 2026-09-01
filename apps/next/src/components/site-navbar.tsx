"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GithubLogo, LinkedinLogo, List, WhatsappLogo, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TonalysLogo } from "@/components/tonalys-logo";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/melchimaelran/tonalys";
const LINKEDIN_URL = "https://www.linkedin.com/in/melchimael-roeh-429ab6210/";
const WHATSAPP_URL = "https://wa.me/261387817393";

const NAV_LINKS = [
  { href: "/", label: "Library" },
  { href: "/upload", label: "Add a track" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 border-b border-border bg-background"
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Tonalys home" className="shrink-0">
          <TonalysLogo showWordmark />
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubLogo aria-hidden className="size-4" />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <LinkedinLogo aria-hidden className="size-4" />
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <WhatsappLogo aria-hidden className="size-4" />
          </a>
          <Button
            variant="ghost"
            size="icon-sm"
            className="sm:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden /> : <List aria-hidden />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-border px-4 py-2 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className="py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
