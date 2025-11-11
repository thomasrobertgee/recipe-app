// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import './Navbar.css';
import GlobalSearch from './GlobalSearch'; // --- IMPORT REMAINS ---

const Navbar = () => {
    const { token, userProfile, logout, selectedRecipes } = useAuth();
    const { toggleSidebar } = useUI();
    const navigate = useNavigate(); // Added for logout redirect

    const handleLogout = () => {
        logout();
        // navigate('/'); // logout function in your context already handles navigation
    };

    const handleToggleSidebar = () => {
        // Only allow consumers to open the shopping list
        if (userProfile?.role === 'consumer') {
            toggleSidebar();
        }
    };

    // --- Helper function for NavLink className ---
    const getNavLinkClass = ({ isActive }) => (isActive ? 'active' : '');

    // --- BUG FIX: Determine the correct destination for the logo ---
    let logoDestination = '/'; // Default for logged-out users
    if (token && userProfile) {
        if (userProfile.role === 'supplier') {
            logoDestination = '/portal/dashboard';
        } else if (userProfile.role === 'consumer') {
            logoDestination = '/dashboard';
        }
    }
    // --- END BUG FIX ---

    return (
        <nav className="navbar">
            {/* --- UPDATED: Use the dynamic logoDestination --- */}
            <NavLink to={logoDestination} className="nav-logo">The Local Catalogue</NavLink>

            {/* --- Main Navigation Links --- */}
            <div className="nav-links">
                {token && userProfile && userProfile.role === 'consumer' && (
                    // --- Consumer Links ---
                    <>
                        <NavLink to="/dashboard" className={getNavLinkClass}>Dashboard</NavLink>
                        <span className="nav-separator">|</span>
                        <NavLink to="/recipes" className={getNavLinkClass}>All Recipes</NavLink>
                        <span className="nav-separator">|</span>
                        <NavLink to="/specials" className={getNavLinkClass}>Specials</NavLink>
                        <span className="nav-separator">|</span>
                        <NavLink to="/pantry" className={getNavLinkClass}>My Pantry</NavLink>
                        <span className="nav-separator">|</span>
                        <NavLink to="/saved-recipes" className={getNavLinkClass}>Saved</NavLink>
                        <span className="nav-separator">|</span>
                        <NavLink to="/meal-plan" className={getNavLinkClass}>Meal Plan</NavLink>
                        <span className="nav-separator">|</span>
                        <NavLink to="/profile" className={getNavLinkClass}>Profile</NavLink>
                    </>
                )}
                {token && userProfile && userProfile.role === 'supplier' && (
                    // --- Supplier Link ---
                    <NavLink to="/portal/dashboard" className={getNavLinkClass}>Supplier Portal</NavLink>
                )}
            </div>

            {/* --- NEW: Global Search moved here, between links and auth --- */}
            {token && userProfile && userProfile.role === 'consumer' && (
                <GlobalSearch />
            )}

            {/* --- Auth/Utility Links (using your structure) --- */}
            <div className="nav-auth">
                {token && userProfile && userProfile.role === 'consumer' && (
                    // --- Show Shopping List only for consumers ---
                    <button onClick={handleToggleSidebar} className="sidebar-tab">
                        Shopping List ({selectedRecipes.length})
                    </button>
                )}
                {token ? (
                    // --- Logged In: Show Logout ---
                    // Use handleLogout for consistency
                    <button onClick={handleLogout} className="logout-button">Log Out</button>
                ) : (
                    // --- Logged Out: Show Login (secondary), Consumer Signup (primary) ---
                    <>
                        {/* --- UPDATED: Swapped order and added class to Login --- */}
                        <NavLink to="/signup" className={({ isActive }) => `signup-button ${isActive ? 'active' : ''}`}>Sign Up</NavLink>
                        <NavLink to="/login" className={({ isActive }) => `login-button-nav ${isActive ? 'active' : ''}`}>Log In</NavLink>
                        {/* --- END UPDATED --- */}
                    </>
                )}
            </div>
        </nav>
    );
};
export default Navbar;