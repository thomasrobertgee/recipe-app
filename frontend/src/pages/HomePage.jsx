// src/pages/HomePage.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import LandingPage from '../components/LandingPage';

const HomePage = () => {
  const { token, isLoading } = useAuth();
  if (isLoading) { return <div>Loading...</div>; }
  return token ? <Navigate to="/dashboard" /> : <LandingPage />;
};
export default HomePage;