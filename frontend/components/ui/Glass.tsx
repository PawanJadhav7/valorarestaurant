import * as React from "react";
import { JSX } from "react"; // Explicitly import JSX

type GlassProps = React.HTMLAttributes<HTMLDivElement> & {
  as?: keyof JSX.IntrinsicElements;
};

export function Glass({ as, className = "", ...props }: GlassProps) {
  const Comp: any = as ?? "div";
  return <Comp className={`glass ${className}`} {...props} />;
}