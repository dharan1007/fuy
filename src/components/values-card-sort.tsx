"use client";

import { useState } from "react";

export type ValueItem = { slug: string; label: string };

type Props = {
  initialValues?: ValueItem[];
  /** Called when user confirms their top values (array of slugs) */
  onSave?: (top: string[]) => void | Promise<void>;
};

const DEFAULT_VALUES: ValueItem[] = [
  { slug: "growth", label: "Growth" },
  { slug: "kindness", label: "Kindness" },
  { slug: "curiosity", label: "Curiosity" },
  { slug: "health", label: "Health" },
  { slug: "family", label: "Family" },
  { slug: "creativity", label: "Creativity" },
  { slug: "adventure", label: "Adventure" },
];

export default function ValuesCardSort({ initialValues = DEFAULT_VALUES, onSave }: Props) {
  const [choices, setChoices] = useState<ValueItem[]>(initialValues);

  function toggleChoice(slug: string) {
    setChoices(prev =>
      prev.find(v => v.slug === slug)
        ? prev.filter(v => v.slug !== slug)
        : [...prev, initialValues.find(v => v.slug === slug)!]
    );
  }

  async function handleSave() {
    const top = choices.map(c => c.slug);
    await onSave?.(top);
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm opacity-80">
        Pick the values that resonate. Click to add/remove, then save.
      </p>
      <div className="flex flex-wrap gap-2">
        {initialValues.map(v => {
          const active = choices.some(c => c.slug === v.slug);
          return (
            <button
              key={v.slug}
              type="button"
              onClick={() => toggleChoice(v.slug)}
              className={`px-3 py-2 rounded border text-sm ${
                active ? "bg-black text-white" : "bg-white hover:bg-neutral-50"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      <div>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded bg-black text-white hover:opacity-90"
        >
          Save my values
        </button>
      </div>
    </div>
  );
}
