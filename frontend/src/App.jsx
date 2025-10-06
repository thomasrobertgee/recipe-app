// src/App.jsx

import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios'; // This was the missing line
import { ToastContainer } from 'react-toastify';
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
import './App.css';

function App() {
  const { token } = useAuth();
  const { isSidebarOpen } = useUI();
  const [allSpecials, setAllSpecials] = useState([]);

  useEffect(() => {
    if (token) {
      axios.get('http://127.0.0.1:8000/api/specials')
        .then(response => setAllSpecials(response.data))
        .catch(error => console.error("Could not fetch specials in App.jsx", error));
    }
  }, [token]);

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