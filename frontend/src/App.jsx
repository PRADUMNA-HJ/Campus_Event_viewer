import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';

// Admin Pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminEventFormPage from './pages/AdminEventFormPage';

/**
 * Root Application Component
 * 
 * Provides global authentication context, persistent navigation & footer,
 * and declarative client-side route definitions for both public discovery
 * and protected administrator management.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app" id="app-root">
          <Navbar />
          <main>
            <Routes>
              {/* Public Discovery Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Administrator Authentication */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />

              {/* Protected Administrator Dashboard & CRUD Routes */}
              <Route path="/admin" element={<ProtectedRoute />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="events/new" element={<AdminEventFormPage />} />
                <Route path="events/:id/edit" element={<AdminEventFormPage />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
