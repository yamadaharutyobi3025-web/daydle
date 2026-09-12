import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "soft" | "text";

const base =
  "relative z-10 touch-manipulation inline-flex items-center justify-center transition-colors duration-300 disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "rounded-2xl bg-ink px-7 py-3.5 text-[15px] tracking-wide text-cream hover:bg-ink/90",
  ghost:
    "rounded-2xl border border-line/80 px-7 py-3.5 text-[15px] text-ink hover:bg-cream-deep/60",
  soft: "rounded-full bg-sage-soft/70 px-4 py-1.5 text-[13px] text-sage-deep hover:bg-sage-soft",
  text: "text-sm text-ink-soft hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
