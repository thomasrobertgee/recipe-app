// src/pages/HomePage.jsx

import React from 'react';
import { useAuth } from '../context/AuthContext';
import LandingPage from '../components/LandingPage';
import RecipeDashboard from '../components/RecipeDashboard';

const HomePage = () => {
  const { token, isLoading } = useAuth();

  // While the app is checking for a token, show a loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If a token exists, show the dashboard. Otherwise, show the landing page.
  return token ? <RecipeDashboard /> : <LandingPage />;
};

export default HomePage;