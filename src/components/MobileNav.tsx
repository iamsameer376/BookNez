
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, QrCode, User, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const MobileNav = () => {
    const location = useLocation();
    const { userRole } = useAuth();

    if (!userRole) return null;

    const ownerLinks = [
        { href: '/dashboard/owner', label: 'Home', icon: Home },
        { href: '/owner/bookings', label: 'Bookings', icon: Calendar },
        { href: '/owner/add-venue', label: 'Add', icon: PlusCircle },
        { href: '/owner/scan', label: 'Scan', icon: QrCode },
        { href: '/profile', label: 'Profile', icon: User },
    ];

    const userLinks = [
        { href: '/dashboard/user', label: 'Home', icon: Home },
        { href: '/my-bookings', label: 'Bookings', icon: Calendar },
        { href: '/profile', label: 'Profile', icon: User },
    ];

    const links = userRole === 'owner' ? ownerLinks : userLinks;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe">
            <nav className="flex items-center justify-around h-16">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-primary/70"
                            )}
                        >
                            <Icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default MobileNav;
