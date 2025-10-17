"use client";

import * as React from "react";

export type TemplateActions = {
  useTemplate: (tplId: string) => void;
  previewTemplate: (tplId: string) => void;
  toggleSaveTemplate: (tplId: string) => void;
  saveTemplate: (tplId: string) => void;
  closePreview: () => void;
};

const noop = () => {};

const TemplateActionsCtx = React.createContext<TemplateActions>({
  useTemplate: noop,
  previewTemplate: noop,
  toggleSaveTemplate: noop,
  saveTemplate: noop,
  closePreview: noop,
});

export const useTemplateActions = () => React.useContext(TemplateActionsCtx);

export function TemplateActionsProvider({
  value,
  children,
}: {
  value: TemplateActions;
  children: React.ReactNode;
}) {
  return (
    <TemplateActionsCtx.Provider value={value}>
      {children}
    </TemplateActionsCtx.Provider>
  );
}
