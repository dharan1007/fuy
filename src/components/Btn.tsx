"use client";

import React from "react";

type BtnTone = "neutral";
type BtnVariant = "solid" | "soft" | "outline";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Btn({
  children,
  onClick,
  tone = "neutral",
  variant = "soft",
  disabled,
  title,
  type = "button",
  className,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  tone?: BtnTone;
  variant?: BtnVariant;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  // monochrome palette
  const palette: Record<BtnTone, Record<BtnVariant, string>> = {
    neutral: {
      solid:
        "bg-black text-white hover:bg-black/90 active:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black",
      soft:
        "bg-black/5 text-black hover:bg-black/10 active:bg-black/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black",
      outline:
        "border border-black/15 bg-white text-black hover:bg-black/5 active:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black",
    },
  };

  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "select-none rounded-xl px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        palette[tone][variant],
        className
      )}
    >
      {children}
    </button>
  );
}
