"use client";

import type { LucideIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PillOption<T extends string> {
    value: T;
    label: string;
    icon?: LucideIcon;
    description?: string;
}

export interface PillsProps<T extends string> {
    label: string;
    options: PillOption<T>[];
    value?: T;
    onChange: (value: T) => void;
    className?: string;
}

/**
 * Segmented pill for a single choice among a few options, on the Radix toggle
 * group (radios, arrow keys, one Tab stop); selection is styled from
 * aria-checked since a tooltip trigger overwrites data-state.
 */
export function Pills<T extends string>({
    label,
    options,
    value,
    onChange,
    className,
}: PillsProps<T>) {
    return (
        <ToggleGroup
            type="single"
            aria-label={label}
            value={value ?? ""}
            onValueChange={(next) => {
                if (next) onChange(next as T);
            }}
            spacing={1}
            className={cn("gap-0.5 rounded-full bg-muted p-0.5", className)}
        >
            {options.map(({ value: option, label: optionLabel, icon: Icon, description }) => {
                const item = (
                    <ToggleGroupItem
                        key={option}
                        value={option}
                        aria-label={optionLabel}
                        className={cn(
                            "h-7 min-w-7 rounded-full text-xs text-muted-foreground hover:bg-transparent hover:text-foreground aria-checked:hover:text-background aria-checked:bg-foreground aria-checked:text-background [&_svg:not([class*='size-'])]:size-3.5",
                            Icon ? "px-0" : "px-2.5 font-mono max-sm:px-1.5",
                        )}
                    >
                        {Icon ? <Icon aria-hidden="true" /> : optionLabel}
                    </ToggleGroupItem>
                );
                const tip = Icon ? optionLabel : description;
                if (!tip) return item;
                return (
                    <Tooltip key={option}>
                        <TooltipTrigger asChild>{item}</TooltipTrigger>
                        <TooltipContent side="bottom">{tip}</TooltipContent>
                    </Tooltip>
                );
            })}
        </ToggleGroup>
    );
}
