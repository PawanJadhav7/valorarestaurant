"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export default function FormField({
  label,
  htmlFor,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={clsx("space-y-2", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}

      {children}
    </div>
  );
}