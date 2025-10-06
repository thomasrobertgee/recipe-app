// src/App.jsx

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ShoppingList from './components/ShoppingList';
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import HomePage from './pages/HomePage';
import SpecialsPage from './pages/SpecialsPage';
import MySavedRecipesPage from './pages/MySavedRecipesPage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import AllRecipesPage from './pages/AllRecipesPage';
import PantryPage from './pages/PantryPage'; // --- NEW ---
import './App.css';

function App() {
  const { token, logout } = useAuth();
  const { isSidebarOpen } = useUI();
  const [allSpecials, setAllSpecials] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.get('http://127.0.0.1:8000/api/specials')
        .then(response => setAllSpecials(response.data))
        .catch(error => console.error("Could not fetch specials in App.jsx", error));
    }
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          logout();
          navigate('/login');
          toast.info("Your session has expired. Please log in again.");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout, navigate]);


  return (
    <div>
      <ToastContainer position="top-center" autoClose={3000} />
      <Navbar />
      <div className="app-layout">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage allSpecials={allSpecials} />} />
              <Route path="/recipes" element={<AllRecipesPage allSpecials={allSpecials} />} />
              <Route path="/specials" element={<SpecialsPage />} />
              <Route path="/saved-recipes" element={<MySavedRecipesPage allSpecials={allSpecials} />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/pantry" element={<PantryPage />} /> {/* --- NEW --- */}
            </Route>
          </Routes>
        </main>
        {token && isSidebarOpen && (
          <aside className="sidebar">
            <ShoppingList allSpecials={allSpecials} />
          </aside>
        )}
      </div>
    </div>
  );
}
export default App;