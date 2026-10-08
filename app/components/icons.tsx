// Single-stroke line icons on a 24x24 grid, drawn with `stroke="currentColor"`.
export const STYLE_ICONS = [
  {
    label: "Hangers",
    path: "M12 8V6.6a2.2 2.2 0 1 0-2.2-2.2M12 8l8.4 6.2a1 1 0 0 1-.6 1.8H4.2a1 1 0 0 1-.6-1.8z",
  },
  { label: "Shirts", path: "M8 3l4 2 4-2 5 4-3 3-2-1v12H8V9l-2 1-3-3z" },
  { label: "Trousers", path: "M7 3h10l1 18h-4l-2-11-2 11H6z" },
  { label: "Dresses", path: "M9 3c1 1.6 5 1.6 6 0l-1 5 4 13H6l4-13z" },
  { label: "Shoes", path: "M3 18v-6l4 1 4 3 7 1a3 3 0 0 1 3 1H3" },
  { label: "Hair", path: "M4 6h16v5H4zM6.5 11v7M9.5 11v7M12.5 11v7M15.5 11v7M18 11v7" },
  { label: "Makeup", path: "M9 21v-8h6v8zM10 13V8l4-3v8M7.5 21h9" },
  {
    label: "Fragrance",
    path: "M9 9h6l2 4v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6zM10 9V6h4v3M11 3h2v3h-2z",
  },
] as const;

export function LineIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} pathLength={1} />
    </svg>
  );
}
