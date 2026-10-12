import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Discovery Pages
import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';

// Authentication Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLoginPage from './pages/AdminLoginPage';

// Coordinator Access & Workflow Pages
import CoordinatorRequestPage from './pages/CoordinatorRequestPage';
import CoordinatorStatusPage from './pages/CoordinatorStatusPage';
import CoordinatorDashboardPage from './pages/CoordinatorDashboardPage';
import CoordinatorEventFormPage from './pages/CoordinatorEventFormPage';

// Main Admin Management Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminEventFormPage from './pages/AdminEventFormPage';

/**
 * Root Application Component
 * 
 * Configures role-based client-side routing across three experiences:
 * 1. Public discovery (unauthenticated visitors)
 * 2. Regular students (ROLE_USER) & event coordinators (ROLE_COORDINATOR)
 * 3. Main Admin control hub (ROLE_MAIN_ADMIN)
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

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Protected Regular User: Coordinator Request & Status */}
              <Route
                path="/coordinator/request"
                element={
                  <ProtectedRoute>
                    <CoordinatorRequestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator/status"
                element={
                  <ProtectedRoute>
                    <CoordinatorStatusPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Coordinator Management Routes */}
              <Route
                path="/coordinator"
                element={<ProtectedRoute allowedRoles={['COORDINATOR', 'MAIN_ADMIN', 'ADMIN']} />}
              >
                <Route index element={<Navigate to="/coordinator/dashboard" replace />} />
                <Route path="dashboard" element={<CoordinatorDashboardPage />} />
                <Route path="events/new" element={<CoordinatorEventFormPage />} />
                <Route path="events/:id/edit" element={<CoordinatorEventFormPage />} />
              </Route>

              {/* Protected Main Admin Dashboard & CRUD Routes */}
              <Route
                path="/admin"
                element={<ProtectedRoute allowedRoles={['MAIN_ADMIN', 'ADMIN']} />}
              >
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
