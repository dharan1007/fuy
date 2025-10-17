"use client";

import * as React from "react";
import type { Block } from "@/lib/types";

type Handlers = {
  onActivate: (id: string) => void;
  onChange: (id: string, patch: Partial<Block>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
};

const noop = () => {};

const CanvasCtx = React.createContext<Handlers>({
  onActivate: noop,
  onChange: noop,
  onRemove: noop,
  onMove: noop,
  onResize: noop,
});

export const useCanvasCtx = () => React.useContext(CanvasCtx);

export function CanvasProvider({
  value,
  children,
}: {
  value: Handlers;
  children: React.ReactNode;
}) {
  return <CanvasCtx.Provider value={value}>{children}</CanvasCtx.Provider>;
}
