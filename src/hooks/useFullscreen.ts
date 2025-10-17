"use client";

import { RefObject, useEffect, useState } from "react";

type FS = {
  isFullscreen: boolean;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => void;
};

export default function useFullscreen(targetRef?: RefObject<HTMLElement>): FS {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = async () => {
    const el = targetRef?.current ?? document.documentElement;
    if (!document.fullscreenElement && el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
      } catch {
        /* no-op */
      }
    }
  };

  const exit = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* no-op */
      }
    }
  };

  const toggle = () => {
    if (document.fullscreenElement) exit();
    else enter();
  };

  return { isFullscreen, enter, exit, toggle };
}
