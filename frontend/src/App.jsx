// src/App.jsx

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ShoppingList from './components/ShoppingList';
import CookMode from './components/CookMode'; // <-- NEW
import Footer from './components/Footer'; // <-- NEW FOOTER IMPORT
import { useAuth } from './context/AuthContext';
import { useUI } from './context/UIContext';
import { useCookMode } from './context/CookModeContext'; // <-- NEW
import HomePage from './pages/HomePage';
import SpecialsPage from './pages/SpecialsPage';
import MySavedRecipesPage from './pages/MySavedRecipesPage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import AllRecipesPage from './pages/AllRecipesPage';
import PantryPage from './pages/PantryPage';
import './App.css';

// --- NEW IMPORTS ---
import SupplierProtectedRoute from './components/SupplierProtectedRoute';
import SupplierDashboardPage from './pages/SupplierDashboardPage';
import SupplierSignUpPage from './pages/SupplierSignUpPage';
// --- *** NEW MEAL PLAN IMPORT *** ---
import MealPlanPage from './pages/MealPlanPage';
// --- *** NEW SEARCH PAGE IMPORT *** ---
import SearchResultsPage from './pages/SearchResultsPage';
// --- *** NEW SUPPLIER DISCOVERY PAGE IMPORT *** ---
import SupplierDiscoveryPage from './pages/SupplierDiscoveryPage';
// --- *** FIX: Corrected import path *** ---
import SupplierPublicProfilePage from './pages/SupplierPublicProfilePage';
// --- *** END FIX *** ---

function App() {
  const { token, userProfile, logout } = useAuth();
  const { isSidebarOpen } = useUI();
  const { activeRecipe } = useCookMode(); // <-- NEW
  const [allSpecials, setAllSpecials] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      axios.get('/api/prices/today') // Use relative URL now
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
      <ToastContainer
        position="top-center"
        autoClose={3000}
        className="app-toast-container"
      />
      <Navbar />
      <div className="app-layout">
        <main className="main-content">
          <Routes>
            {/* --- Public Routes --- */}
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* --- NEW Supplier Public Routes --- */}
            <Route path="/portal/signup" element={<SupplierSignUpPage />} />

            {/* --- Consumer Protected Routes --- */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage allSpecials={allSpecials} />} />
              <Route path="/recipes" element={<AllRecipesPage allSpecials={allSpecials} />} />
              <Route path="/specials" element={<SpecialsPage />} />
              <Route path="/saved-recipes" element={<MySavedRecipesPage allSpecials={allSpecials} />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/pantry" element={<PantryPage />} />
              {/* --- *** NEW MEAL PLAN ROUTE *** --- */}
              <Route path="/meal-plan" element={<MealPlanPage />} />
              {/* --- *** NEW SEARCH ROUTE *** --- */}
              <Route path="/search" element={<SearchResultsPage />} />
              {/* --- *** NEW SUPPLIER DISCOVERY ROUTE *** --- */}
              <Route path="/suppliers" element={<SupplierDiscoveryPage />} />
              {/* --- *** NEW: Supplier Public Profile Route *** --- */}
              <Route path="/supplier/:supplierId" element={<SupplierPublicProfilePage />} />
            </Route>

            {/* --- NEW Supplier Protected Routes --- */}
            <Route element={<SupplierProtectedRoute />}>
              <Route path="/portal/dashboard" element={<SupplierDashboardPage />} />
            </Route>

          </Routes>
        </main>
        {token && userProfile?.role === 'consumer' && isSidebarOpen && (
          <aside className="sidebar">
            <ShoppingList allSpecials={allSpecials} />
          </aside>
        )}
      </div>
      {/* --- NEW: Render CookMode if there is an active recipe --- */}
      {activeRecipe && <CookMode />}

      {/* --- NEW: Render Footer --- */}
      <Footer />
    </div>
  );
}
export default App;