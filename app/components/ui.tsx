export const primaryButton =
  "group/button relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-accent to-accent-2 px-7 py-3.5 text-sm font-semibold text-accent-ink shadow-[0_14px_40px_-14px_var(--accent)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-12px_var(--accent)] active:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0";

export const ghostButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium transition duration-300 hover:border-accent hover:text-accent";

export const field =
  "w-full rounded-xl border border-line bg-background/60 px-3.5 py-2.5 text-sm transition placeholder:text-muted/60 focus:border-accent focus:outline-none";

export const label = "text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted";

export const card = "glow-card rounded-[28px]";

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
      className={`rounded-full border px-3.5 py-1.5 text-sm transition duration-300 first-letter:uppercase ${
        active
          ? "border-accent bg-accent text-accent-ink shadow-[0_8px_24px_-10px_var(--accent)]"
          : "border-line bg-surface hover:border-accent/60"
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
      <p className={`${label} flex items-center gap-3`}>
        <span className="h-px w-8 bg-accent" />
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-4xl leading-[1.05] sm:text-6xl">{title}</h2>
      {children && <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">{children}</p>}
    </div>
  );
}
