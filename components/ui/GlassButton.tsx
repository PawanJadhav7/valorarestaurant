import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function GlassButton({ className = "", ...props }: Props) {
  return (
    <button
      className={[
        "glass",
        "px-4 py-2",
        "text-sm font-medium",
        "hover:translate-y-[-1px] active:translate-y-[0px]",
        "transition-transform",
        className,
      ].join(" ")}
      {...props}
    />
  );
}