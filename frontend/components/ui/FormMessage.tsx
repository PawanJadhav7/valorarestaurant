"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface FormMessageProps {
  children?: ReactNode;
  type?: "error" | "success" | "info";
  className?: string;
}

export default function FormMessage({
  children,
  type = "error",
  className,
}: FormMessageProps) {
  if (!children) return null;

  return (
    <p
      className={clsx(
        "mt-1 text-sm",
        type === "error" && "text-red-400",
        type === "success" && "text-green-400",
        type === "info" && "text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}