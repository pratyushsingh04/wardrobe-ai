export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-ink shadow-[0_10px_24px_-12px_var(--accent)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0";

export const ghostButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium transition hover:border-foreground/40";

export const field =
  "w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm transition placeholder:text-muted/70 focus:border-accent focus:outline-none";

export const label = "text-xs font-semibold uppercase tracking-[0.12em] text-muted";

export const card =
  "rounded-[28px] border border-line bg-surface shadow-[0_24px_60px_-40px_rgba(60,30,10,0.45)]";

type ChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

export function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition first-letter:uppercase ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-line bg-surface hover:border-foreground/40"
      }`}
    >
      {children}
    </button>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className={label}>{eyebrow}</p>
      <h2 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{title}</h2>
      {children && <p className="mt-2 max-w-xl text-sm text-muted">{children}</p>}
    </div>
  );
}
