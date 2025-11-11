// src/components/Navbar.jsx

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import GlobalSearch from './GlobalSearch';
import './Navbar.css';

function Navbar() {
  const { userProfile, logout } = useAuth(); // <-- UPDATED: Get userProfile
  const { toggleSidebar, isSidebarOpen } = useUI();

  // Determine if the user is a supplier
  const isSupplier = userProfile?.role === 'supplier';

  return (
    // --- UPDATED: Add conditional 'supplier-theme' class ---
    <nav className={`navbar ${isSupplier ? 'supplier-theme' : ''}`}>
      <div className="nav-left">
        <Link to={isSupplier ? "/portal/dashboard" : "/dashboard"} className="nav-logo">
          LocalCatalogue
        </Link>
        <div className="nav-links">
          {!userProfile ? (
            // Public links
            <>
              {/* Maybe add "Features" or "About" here later */}
            </>
          ) : isSupplier ? (
            // Supplier links
            <>
              <NavLink to="/portal/dashboard">Dashboard</NavLink>
              {/* Add other supplier links here e.g. /portal/analytics */}
            </>
          ) : (
            // Consumer links
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/recipes">All Recipes</NavLink>
              <NavLink to="/saved-recipes">Saved</NavLink>
              <NavLink to="/specials">Specials</NavLink>
              <NavLink to="/pantry">My Pantry</NavLink>
              <NavLink to="/meal-plan">Meal Plan</NavLink>
              <NavLink to="/suppliers">Suppliers</NavLink>
            </>
          )}
        </div>
      </div>

      <div className="nav-right">
        {userProfile && !isSupplier && (
          <div className="nav-search-container">
            <GlobalSearch />
          </div>
        )}
        
        {!userProfile ? (
          // Logged-out state
          <div className="nav-links auth-links">
            <NavLink to="/portal/login" className="supplier-link">
              For Suppliers
            </NavLink>
            <span className="link-separator">|</span>
            <NavLink to="/login">Log In</NavLink>
            <NavLink to="/signup" className="signup-button">
              Sign Up
            </NavLink>
          </div>
        ) : (
          // Logged-in state
          <div className="nav-links auth-links">
            <NavLink to="/profile">My Profile</NavLink>
            <span className="link-separator">|</span>
            <button onClick={logout} className="logout-button">
              Log Out
            </button>
            
            {/* Show sidebar toggle only for consumers */}
            {!isSupplier && (
              <button 
                className={`sidebar-tab ${isSidebarOpen ? 'active' : ''}`} 
                onClick={toggleSidebar}
              >
                List
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;