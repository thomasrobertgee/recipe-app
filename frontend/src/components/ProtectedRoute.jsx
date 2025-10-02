// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { token } = useAuth();

  // If there's a token, render the child component (via Outlet).
  // If not, redirect to the /login page.
  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;