import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import MobileNav from "@/components/MobileNav";
import { Loading } from "@/components/Loading";
import { FavoritesProvider } from "./hooks/useFavorites";

// Lazy load pages for performance
const Index = lazy(() => import("./pages/Index"));
const LoginOwner = lazy(() => import("./pages/LoginOwner"));
const LoginUser = lazy(() => import("./pages/LoginUser"));
const RegisterOwner = lazy(() => import("./pages/RegisterOwner"));
const RegisterUser = lazy(() => import("./pages/RegisterUser"));
const DashboardOwner = lazy(() => import("./pages/DashboardOwner"));
const DashboardUser = lazy(() => import("./pages/DashboardUser"));
const AddVenue = lazy(() => import("./pages/owner/AddVenue"));
const ManageVenues = lazy(() => import("./pages/owner/ManageVenues"));
const VenueDetail = lazy(() => import("./pages/VenueDetail"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const VenuesList = lazy(() => import("./pages/VenuesList"));
const EditVenue = lazy(() => import("./pages/owner/EditVenue"));
const OwnerBookings = lazy(() => import("./pages/owner/OwnerBookings"));
const OwnerRevenue = lazy(() => import("./pages/owner/OwnerRevenue"));
const OwnerReviews = lazy(() => import("./pages/owner/OwnerReviews"));
const QRScanner = lazy(() => import("./pages/owner/QRScanner"));
const BookingConfirm = lazy(() => import("./pages/BookingConfirm"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const VenueReviews = lazy(() => import("./pages/VenueReviews"));
const FavoriteVenues = lazy(() => import("@/pages/FavoriteVenues"));


// Create a wrapper component to handle conditional rendering
const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ['/', '/login/owner', '/login/user', '/register/owner', '/register/user', '/forgot-password'].includes(location.pathname);

  return (
    <>
      <div className={`min-h-screen bg-background text-foreground transition-colors duration-200 ${!isAuthPage ? 'pb-20' : ''}`}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login/owner" element={<LoginOwner />} />
            <Route path="/login/user" element={<LoginUser />} />
            <Route path="/register/owner" element={<RegisterOwner />} />
            <Route path="/register/user" element={<RegisterUser />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard/owner" element={<DashboardOwner />} />
            <Route path="/dashboard/user" element={<DashboardUser />} />
            <Route path="/owner/add-venue" element={<AddVenue />} />
            <Route path="/owner/venues" element={<ManageVenues />} />
            <Route path="/owner/venues/:id" element={<EditVenue />} />
            <Route path="/owner/bookings" element={<OwnerBookings />} />
            <Route path="/owner/revenue" element={<OwnerRevenue />} />
            <Route path="/owner/reviews" element={<OwnerReviews />} />
            <Route path="/owner/scan" element={<QRScanner />} />
            <Route path="/venues/:id" element={<VenueDetail />} />
            <Route path="/venues/:id/reviews" element={<VenueReviews />} />
            <Route path="/venues" element={<VenuesList />} />
            <Route path="/favorites" element={<FavoriteVenues />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/booking/confirm" element={<BookingConfirm />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path="/my-bookings" element={<MyBookings />} />
          </Routes>
        </Suspense>

        {/* Mobile Navigation Bar - Hidden on Auth pages */}
        {!isAuthPage && <MobileNav />}
      </div>
    </>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <FavoritesProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </FavoritesProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
