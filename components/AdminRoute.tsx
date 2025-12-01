import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { UserRole } from '../types';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Protects routes that require ADMIN role
 *
 * Usage:
 *   <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
 *
 * Access Control:
 *   - User must be logged in (redirects to /login if not)
 *   - User must have ADMIN role (shows access denied if GUARD)
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user } = useContext(AuthContext);

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin - show access denied
  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h1>
          <p className="text-slate-600 mb-6">
            Esta área é restrita a administradores. Você está autenticado como <strong>{user.role}</strong>.
          </p>
          <div className="text-sm text-slate-500 mb-6">
            <p><strong>Nome:</strong> {user.first_name} {user.last_name}</p>
            <p><strong>ID:</strong> {user.id}</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // User is admin - render protected content
  return <>{children}</>;
};
