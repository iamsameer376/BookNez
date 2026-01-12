import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import MobileNav from "@/components/MobileNav";
import Index from "./pages/Index";
import LoginOwner from "./pages/LoginOwner";
import LoginUser from "./pages/LoginUser";
import RegisterOwner from "./pages/RegisterOwner";
import RegisterUser from "./pages/RegisterUser";
import DashboardOwner from "./pages/DashboardOwner";
import DashboardUser from "./pages/DashboardUser";
import AddVenue from "./pages/owner/AddVenue";
import ManageVenues from "./pages/owner/ManageVenues";
import VenueDetail from "./pages/VenueDetail";
import MyProfile from "./pages/MyProfile";
import VenuesList from "./pages/VenuesList";
import EditVenue from "./pages/owner/EditVenue";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerReviews from "./pages/owner/OwnerReviews";
import QRScanner from "./pages/owner/QRScanner";
import BookingConfirm from "./pages/BookingConfirm";
import BookingSuccess from "./pages/BookingSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import MyBookings from "./pages/MyBookings";
import VenueReviews from "./pages/VenueReviews";

// Create a wrapper component to handle conditional rendering
const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ['/', '/login/owner', '/login/user', '/register/owner', '/register/user', '/forgot-password'].includes(location.pathname);

  return (
    <>
      <div className={`min-h-screen bg-background text-foreground transition-colors duration-300 ${!isAuthPage ? 'pb-20' : ''}`}>
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
          <Route path="/owner/reviews" element={<OwnerReviews />} />
          <Route path="/owner/scan" element={<QRScanner />} />
          <Route path="/venues/:id" element={<VenueDetail />} />
          <Route path="/venues/:id/reviews" element={<VenueReviews />} />
          <Route path="/venues" element={<VenuesList />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/booking/confirm" element={<BookingConfirm />} />
          <Route path="/booking/success" element={<BookingSuccess />} />
          <Route path="/my-bookings" element={<MyBookings />} />
        </Routes>

        {/* Mobile Navigation Bar - Hidden on Auth pages */}
        {!isAuthPage && <MobileNav />}
      </div>
    </>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
