import type { CSSProperties, ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  /** Flat `surface-alt` (profile, settings). */
  variant?: "plain" | "wash";
  className?: string;
  /** Merged onto `<main>` (e.g. extra bottom padding over the nav + fixed UI). */
  mainStyle?: CSSProperties;
  /** Extra classes on the inner max-width column */
  contentClassName?: string;
  /**
   * When false, only the padded `main` is rendered (child supplies its own
   * `max-w-xl`, e.g. SettingsClient).
   */
  contained?: boolean;
};

/**
 * Authenticated in-app layout: same shell as profile (surface background + max width).
 * Use `wash` for feed-like subtle teal/orange gradient; `plain` everywhere else.
 */
export function AppShell({
  children,
  variant = "plain",
  className = "",
  mainStyle,
  contentClassName = "",
  contained = true,
}: AppShellProps) {
  const bgStyle =
    variant === "wash"
      ? ({ background: "var(--page-gradient-bg)", minHeight: "100vh" } as const)
      : ({ background: "var(--color-surface-alt)", minHeight: "100vh" } as const);

  const mainCombinedStyle = { ...bgStyle, ...mainStyle };

  const mainClass = `px-4 pb-24 pt-6 ${className}`.trim();

  if (!contained) {
    return (
      <main style={mainCombinedStyle} className={mainClass}>
        {children}
      </main>
    );
  }

  return (
    <main style={mainCombinedStyle} className={mainClass}>
      <div
        className={`mx-auto flex w-full max-w-xl flex-col gap-5 ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </main>
  );
}
