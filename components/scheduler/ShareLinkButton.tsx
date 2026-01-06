"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Link2 } from "lucide-react";

import Button from "@/components/ui/Custom/Button/Button";

export default function ShareLinkButton({
  label = "اشتراک گذاری",
}: {
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onCopy = async () => {
    const qs = searchParams.toString();
    const url = `${window.location.origin}${pathname}${
      qs ? `?${qs}` : ""
    }`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }

    setCopied(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={onCopy}
      title="Copy shareable link"
    >
      <Link2 className="h-4 w-4" />
      {copied ? "Copied" : label}
    </Button>
  );
}
