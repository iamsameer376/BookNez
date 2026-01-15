import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'framer-motion';

export const OfflineBanner = () => {
    const isOnline = useOnlineStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-destructive text-destructive-foreground"
                >
                    <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
                        <WifiOff className="h-4 w-4" />
                        <span>No internet connection. Content may be outdated.</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
