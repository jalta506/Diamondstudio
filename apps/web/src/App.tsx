import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BookingFlow from './pages/BookingFlow';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminBarbers from './pages/AdminBarbers';
import AdminSchedule from './pages/AdminSchedule';
import AdminBookings from './pages/AdminBookings';
import AdminDailySchedule from './pages/AdminDailySchedule';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('ds_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/book/:tenantSlug" element={<BookingFlow />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/barbers"
          element={
            <ProtectedRoute>
              <AdminBarbers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <ProtectedRoute>
              <AdminSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute>
              <AdminBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/daily"
          element={
            <ProtectedRoute>
              <AdminDailySchedule />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/book/diamond-studio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
