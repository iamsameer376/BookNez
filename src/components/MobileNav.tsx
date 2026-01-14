
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, User, PlusCircle, QrCode, Heart, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const MobileNav = () => {
    const location = useLocation();
    const { activeRole } = useAuth();
    const userRole = activeRole || 'user';

    const ownerLinks = [
        { href: '/owner/bookings', label: 'Bookings', icon: Calendar },
        { href: '/owner/venues', label: 'Freeze', icon: Lock },
        { href: '/dashboard/owner', label: 'Home', icon: Home, isCenter: true },
        { href: '/owner/scan', label: 'Scan', icon: QrCode },
        { href: '/profile', label: 'Profile', icon: User },
    ];

    const userLinks = [
        { href: '/dashboard/user', label: 'Home', icon: Home },
        { href: '/my-bookings', label: 'Bookings', icon: Calendar },
        { href: '/favorites', label: 'Favorites', icon: Heart },
        { href: '/profile', label: 'Profile', icon: User },
    ];

    const links = userRole === 'owner' ? ownerLinks : userLinks;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
            <nav className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-full h-full transition-all duration-300",
                                isActive ? "text-primary" : "text-zinc-500"
                            )}
                        >
                            <div className="relative mb-1">
                                <Icon className={cn(
                                    "w-6 h-6 transition-transform duration-300",
                                    isActive ? "scale-110" : "scale-100 opacity-70"
                                )} />
                            </div>
                            <span className={cn(
                                "text-[10px] transition-all duration-300 tracking-tight",
                                isActive ? "font-bold opacity-100" : "font-medium opacity-50"
                            )}>
                                {link.label}
                            </span>

                            {isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default MobileNav;
