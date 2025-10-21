// frontend/src/components/SupplierProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SupplierProtectedRoute = () => {
  const { token, user, loading } = useAuth();

  if (loading) {
    // Wait until the user data is loaded before making a decision
    return <div>Loading...</div>; // Or a proper spinner component
  }

  if (!token) {
    // Not logged in at all
    return <Navigate to="/login" replace />;
  }

  if (user && user.role !== 'supplier') {
    // Logged in, but is a regular consumer
    return <Navigate to="/dashboard" replace />; // Send consumers to their dashboard
  }

  if (user && user.role === 'supplier') {
    // User is logged in AND is a supplier, allow access
    return <Outlet />;
  }

  // Fallback, though should be covered by loading/token checks
  return <Navigate to="/login" replace />;
};

export default SupplierProtectedRoute;