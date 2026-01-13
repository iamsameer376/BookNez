import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 text-center h-[400px] w-full rounded-lg border-2 border-dashed bg-card/50",
            className
        )}>
            {Icon && (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                    <Icon className="h-8 w-8 text-muted-foreground/50" />
                </div>
            )}
            <h3 className="text-xl font-semibold tracking-tight mb-2">
                {title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {description}
            </p>
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
}
