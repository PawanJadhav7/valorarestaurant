"use client";

import * as React from "react";

export type SearchableSelectOption = {
    value: string;
    label: string;
    sublabel?: string;
};

type SearchableLocationSelectProps = {
    value: string;
    options: SearchableSelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    allLabel?: string;
    className?: string;
    disabled?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function prettifyLocationLabel(raw: string | null | undefined): string {
    if (!raw) return "Unknown Location";

    return raw
        .replace(/_[A-F0-9]{8,}$/i, "")
        .replace(/_LOCATION$/i, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SearchableLocationSelect({
    value,
    options,
    onChange,
    placeholder = "Select location",
    searchPlaceholder = "Search location...",
    allLabel = "All Locations",
    className,
    disabled = false,
}: SearchableLocationSelectProps) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [activeIndex, setActiveIndex] = React.useState(0);

    const normalizedOptions = React.useMemo<SearchableSelectOption[]>(() => {
        const base: SearchableSelectOption[] = options.map((o) => ({
            value: o.value,
            label: prettifyLocationLabel(o.label),
            sublabel: o.sublabel ? prettifyLocationLabel(o.sublabel) : undefined,
        }));

        return [
            { value: "all", label: allLabel, sublabel: undefined },
            ...base,
        ];
    }, [options, allLabel]);

    const selected =
        normalizedOptions.find((o) => o.value === value) ??
        normalizedOptions[0] ?? {
            value: "all",
            label: allLabel,
        };

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return normalizedOptions;

        return normalizedOptions.filter((o) => {
            const haystack = `${o.label} ${o.sublabel ?? ""} ${o.value}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [normalizedOptions, query]);

    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (open) {
            setActiveIndex(0);
            const t = window.setTimeout(() => inputRef.current?.focus(), 40);
            return () => window.clearTimeout(t);
        }
    }, [open]);

    function handleSelect(nextValue: string) {
        onChange(nextValue);
        setOpen(false);
        setQuery("");
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>) {
        if (disabled) return;

        if (!open && (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
            return;
        }

        if (!open) return;

        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setQuery("");
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            const option = filtered[activeIndex];
            if (option) handleSelect(option.value);
        }
    }

    return (
        <div ref={containerRef} className={cn("relative min-w-[260px]", className)}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={handleKeyDown}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition",
                    "hover:bg-background/60 focus:outline-none focus:ring-2 focus:ring-foreground/20",
                    disabled && "cursor-not-allowed opacity-60"
                )}
            >
                <span className="truncate">{selected?.label || placeholder}</span>
                <span className="ml-3 shrink-0 text-xs opacity-70">{open ? "▲" : "▼"}</span>
            </button>

            {open ? (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl">
                    <div className="border-b border-border/50 p-2">
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setActiveIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={searchPlaceholder}
                            className="h-10 w-full rounded-xl border border-border/50 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
                        />
                    </div>

                    <div className="max-h-72 overflow-y-auto p-1">
                        {filtered.length ? (
                            filtered.map((option, idx) => {
                                const isSelected = option.value === value;
                                const isActive = idx === activeIndex;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                                            isActive ? "bg-foreground/10" : "hover:bg-foreground/5",
                                            isSelected && "border border-border/50"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate font-medium text-foreground">
                                                {option.label}
                                            </div>
                                            {option.sublabel ? (
                                                <div className="truncate text-xs text-muted-foreground">
                                                    {option.sublabel}
                                                </div>
                                            ) : null}
                                        </div>

                                        {isSelected ? (
                                            <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                                                ✓
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                No matching locations
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}