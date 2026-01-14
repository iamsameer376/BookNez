
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, IndianRupee, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export type SlotMode = "selection" | "freezing" | "pricing";

interface VenueSlotGridProps {
    slots: string[];
    selectedSlots?: string[]; // For selection mode
    frozenSlots?: string[]; // For freezing mode
    pricing?: { [key: string]: number }; // For pricing mode
    basePrice?: number;
    peakPrice?: number;
    disabledSlots?: string[];
    bookedSlots?: string[];
    onSlotClick?: (slot: string) => void;
    onPriceChange?: (slot: string, price: number) => void;
    mode: SlotMode;
}

export const VenueSlotGrid = ({
    slots,
    selectedSlots = [],
    frozenSlots = [],
    pricing = {},
    basePrice = 0,
    peakPrice = 0,
    disabledSlots = [],
    bookedSlots = [],
    onSlotClick,
    onPriceChange,
    mode,
}: VenueSlotGridProps) => {
    const { toast } = useToast();

    // DEBUG: Check what slots are being passed
    if (bookedSlots.length > 0) {
        console.log('VenueSlotGrid received bookedSlots:', bookedSlots);
    }

    const handlePriceChange = (slot: string, rawValue: string) => {
        if (rawValue === "") {
            onPriceChange?.(slot, 0);
            return;
        }

        const val = parseFloat(rawValue);
        if (isNaN(val)) return;

        onPriceChange?.(slot, val);
    };

    const handleBlur = (slot: string, currentPrice: number) => {
        if (currentPrice <= 50) {
            toast({
                title: "Invalid Price",
                description: "Price must be greater than ₹50.",
                variant: "destructive",
                duration: 2000
            });
            onPriceChange?.(slot, Math.max(51, basePrice));
        }
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {slots.map((slot) => {
                const isSelected = selectedSlots.includes(slot);
                const isFrozen = frozenSlots.includes(slot);
                const isDisabled = disabledSlots.includes(slot);
                const price = pricing[slot] !== undefined ? pricing[slot] : basePrice;

                let content = null;
                let containerClass = "h-auto py-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer relative overflow-hidden border bg-card hover:border-primary/50 rounded-xl";

                const isBooked = bookedSlots.includes(slot);

                if (isDisabled) {
                    containerClass = "h-auto py-4 px-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden border bg-muted/30 opacity-60 rounded-xl cursor-not-allowed grayscale-[0.8]";
                    content = (
                        <>
                            <span className="font-medium text-muted-foreground">{slot}</span>
                            <Badge variant="outline" className="text-[10px] h-5 px-2 bg-muted text-muted-foreground border-muted-foreground/20">
                                PASSED
                            </Badge>
                        </>
                    );
                } else if (isBooked) {
                    containerClass = "h-auto py-4 px-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden border bg-blue-500/5 opacity-80 rounded-xl cursor-not-allowed border-blue-200";
                    content = (
                        <>
                            <span className="font-medium text-blue-700">{slot}</span>
                            <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                                BOOKED
                            </Badge>
                        </>
                    );
                } else if (mode === "selection") {
                    // Peak Hours Mode
                    containerClass = cn(
                        containerClass,
                        isSelected
                            ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                            : "border-border hover:bg-secondary/20"
                    );
                    content = (
                        <>
                            <span className={cn("font-medium", isSelected ? "text-primary" : "text-foreground")}>{slot}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">₹{isSelected ? (peakPrice || basePrice * 1.5) : basePrice}</span>
                            {isSelected && (
                                <Badge variant="default" className="text-[10px] h-5 px-2">
                                    <Zap className="w-3 h-3 mr-1 fill-current" /> PEAK
                                </Badge>
                            )}
                        </>
                    );
                } else if (mode === "freezing") {
                    // Availability Mode
                    containerClass = cn(
                        containerClass,
                        isFrozen
                            ? "border-destructive/50 bg-destructive/5"
                            : "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                    );
                    content = (
                        <>
                            <span className={cn("font-medium", isFrozen ? "text-destructive" : "text-green-600")}>{slot}</span>
                            <div className="flex items-center gap-1.5">
                                {isFrozen ? (
                                    <Badge variant="destructive" className="text-[10px] h-5 px-2">
                                        <Lock className="w-3 h-3 mr-1" /> BLOCKED
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] h-5 px-2 border-green-200 text-green-700 bg-green-100">
                                        <Check className="w-3 h-3 mr-1" /> ACTIVE
                                    </Badge>
                                )}
                            </div>
                        </>
                    );
                } else if (mode === "pricing") {
                    // Pricing Mode
                    const isInvalid = price <= 50;
                    containerClass = cn(
                        "h-auto py-3 px-3 flex flex-col items-center justify-center gap-2 transition-all border bg-card rounded-xl",
                        price !== basePrice ? "border-primary/50 bg-primary/5" : "border-border",
                        isInvalid && "border-destructive bg-destructive/5"
                    );
                    content = (
                        <>
                            <span className="font-medium text-sm text-muted-foreground">{slot}</span>
                            <div className="relative w-full max-w-[100px] group">
                                <IndianRupee className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="number"
                                    value={price === 0 ? '' : price}
                                    onChange={(e) => handlePriceChange(slot, e.target.value)}
                                    onBlur={(e) => handleBlur(slot, parseFloat(e.target.value) || 0)}
                                    // Disable input if slot is disabled (though usually pricing mode won't strictly enforce 'passed' slots unless desired, but user said 'edit available slots')
                                    // BUT usually past slots pricing doesn't matter. 
                                    // We will respect isDisabled if passed.
                                    disabled={isDisabled || isBooked || isFrozen}
                                    className={cn(
                                        "h-8 pl-6 text-center font-mono text-sm bg-background/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                        isInvalid && "text-destructive border-destructive focus-visible:ring-destructive"
                                    )}
                                />
                                {isInvalid && !isDisabled && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        Min ₹51
                                    </div>
                                )}
                            </div>
                        </>
                    );
                }

                return (
                    <motion.div
                        key={slot}
                        whileHover={!isDisabled && !isBooked ? { scale: 1.02 } : {}}
                        whileTap={!isDisabled && !isBooked && mode !== "pricing" ? { scale: 0.98 } : {}}
                        onClick={() => !isDisabled && !isBooked && mode !== "pricing" && onSlotClick?.(slot)}
                        className={containerClass}
                    >
                        {content}
                    </motion.div>
                );
            })}
        </div>
    );
};
