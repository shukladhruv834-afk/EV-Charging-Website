import { Routes, Route } from "react-router-dom";
import LoginAdmin from "./components/LoginAdmin";
import Register from "./components/RegPage";
import Mapp from "./components/Mapp";
import GoogleAuthLogin from "./googleauth";
import MainPage from "./components/Main";
import ChargerPage from "./ChargerPage";
import ListedBookings from "./components/ListedBookings";
import StationProfile from "./components/StationProfile";
import UserNotifications from "./components/UserNotifications";
import ErrorHandler from "./components/error";
import BookSlot from "./components/BookSlot";
import Payment from "./components/Payment";
import Confirmation from "./components/Confirmation";
import Login from "./components/Login";
import ChargerScreen from "./components/ChargingScreen";
import Station from "./components/StationDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import UserPortal from "./components/UserProfile"; // Add this import
import "./App.css";

const App = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/user/login" element={<GoogleAuthLogin />} />
      <Route path="/userportal" element={<UserPortal />} /> {/* Add this route */}

      {/* Admin Routes */}
      <Route path="/admin" element={<ChargerPage />} />
      <Route path="/admin/login" element={<LoginAdmin />} />
      <Route path="/admin/register" element={<Register />} />
      <Route path="/admin/:id" element={<StationProfile />} />
      <Route path="/station" element={<Station />} />

      {/* User Routes */}
      <Route path="/user/:id" element={<Mapp />} />
      <Route path="/user/:id/bookings" element={<ListedBookings />} />
      <Route path="/user/:id/notifications" element={<UserNotifications />} />
      <Route
        path="/book"
        element={
          <ProtectedRoute>
            <BookSlot />
          </ProtectedRoute>
        }
      />
      <Route path="/charging" element={<ChargerScreen />} />
      <Route path="/payment" element={<Payment />} />
      <Route path="/confirmation" element={<Confirmation />} />

      {/* Error Route */}
      <Route path="/error" element={<ErrorHandler />} />
    </Routes>
  );
};

export default App;