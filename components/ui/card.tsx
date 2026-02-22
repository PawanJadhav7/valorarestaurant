import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card text-foreground shadow-sm",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function CardContent({ className = "", ...props }: CardProps) {
  return <div className={["p-4", className].join(" ")} {...props} />;
}