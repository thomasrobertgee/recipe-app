// frontend/src/components/SupplierProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SupplierProtectedRoute = () => {
  const { userProfile, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Handle loading state
  }

  if (!userProfile || userProfile.role !== 'supplier') {
    // Not a supplier, or profile not loaded
    return <Navigate to="/portal/login" replace />; // <-- FIX: Was "/login"
  }

  // User is a supplier, render the protected route
  return <Outlet />;
};

export default SupplierProtectedRoute;