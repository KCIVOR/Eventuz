"use client";

type Props = {
  href: `#${string}`;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export function SmoothAnchorLink({ href, className, style, children }: Props) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={(event) => {
        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", href);
      }}
    >
      {children}
    </a>
  );
}
