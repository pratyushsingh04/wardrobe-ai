"use client";

import { useState } from "react";
import { CATEGORIES, OCCASIONS, SEASONS, type Item, type ItemTags } from "@/lib/types";
import { field as fieldClass, ghostButton, primaryButton } from "./ui";

type Props = {
  item: Item;
  onCancel: () => void;
  onSave: (tags: ItemTags) => void;
};


export default function EditItemDialog({ item, onCancel, onSave }: Props) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [colors, setColors] = useState(item.colors.join(", "));
  const [fabric, setFabric] = useState(item.fabric);
  const [seasons, setSeasons] = useState(item.seasons);
  const [occasions, setOccasions] = useState(item.occasions);

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((other) => other !== value) : [...list, value];
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSave({
      name: name.trim() || "Untitled item",
      category,
      colors: colors
        .split(",")
        .map((color) => color.trim().toLowerCase())
        .filter(Boolean),
      fabric: fabric.trim().toLowerCase(),
      seasons,
      occasions,
    });
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Edit tags"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto animate-rise rounded-[28px] border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 className="font-display text-3xl">Edit tags</h2>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} autoFocus />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ItemTags["category"])}
            className={`${fieldClass} capitalize`}
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Colours
          <input
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            placeholder="navy, white"
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Fabric
          <input
            value={fabric}
            onChange={(e) => setFabric(e.target.value)}
            placeholder="cotton"
            className={fieldClass}
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium">Seasons</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {SEASONS.map((season) => (
              <label key={season} className="flex items-center gap-1.5 text-sm capitalize">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={seasons.includes(season)}
                  onChange={() => setSeasons(toggle(seasons, season))}
                />
                {season}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Occasions</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {OCCASIONS.map((occasion) => (
              <label key={occasion} className="flex items-center gap-1.5 text-sm capitalize">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={occasions.includes(occasion)}
                  onChange={() => setOccasions(toggle(occasions, occasion))}
                />
                {occasion}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className={ghostButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={primaryButton}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
