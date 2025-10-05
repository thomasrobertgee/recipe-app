// src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import SpecialsPage from './pages/SpecialsPage';
import MySavedRecipesPage from './pages/MySavedRecipesPage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import AllRecipesPage from './pages/AllRecipesPage';
import './App.css';

function App() {
  return (
    <div>
      <ToastContainer position="top-center" autoClose={3000} />
      <Navbar />
      <main className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/recipes" element={<AllRecipesPage />} />
            <Route path="/specials" element={<SpecialsPage />} />
            <Route path="/saved-recipes" element={<MySavedRecipesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;