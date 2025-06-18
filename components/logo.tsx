import Link from "next/link";
import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export default function Logo(props: Omit<ComponentPropsWithRef<"h1">, "children">) {
  return (
    <Link href="/">
      <h1
        {...props}
        className={cn("font-roboto-mono text-2xl font-light tracking-[0.2em]", props.className)}
      >
        <span className="text-brand-lilac-900">&#123;</span>
        <span className="text-brand-blue-300">Jstz DEX</span>
        <span className="text-brand-lilac-900">&#125;</span>
      </h1>
    </Link>
  );
}
