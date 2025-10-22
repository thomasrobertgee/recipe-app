// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import './Navbar.css';

const Navbar = () => {
    // --- Use userProfile (or user if you kept both in context) ---
    const { token, userProfile, logout, selectedRecipes } = useAuth();
    const { toggleSidebar } = useUI();
    const navigate = useNavigate(); // Added for logout redirect

    // --- Added handleLogout function ---
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

    return (
        <nav className="navbar">
            {/* --- Used your "Recipe Saver" logo text --- */}
            <NavLink to="/" className="nav-logo">Recipe Saver</NavLink>

            {/* --- Main Navigation Links --- */}
            <div className="nav-links">
                {token && userProfile && userProfile.role === 'consumer' && (
                    // --- Consumer Links ---
                    <>
                        <NavLink to="/dashboard" className={getNavLinkClass}>Dashboard</NavLink>
                        <NavLink to="/recipes" className={getNavLinkClass}>All Recipes</NavLink>
                        <NavLink to="/specials" className={getNavLinkClass}>View Specials</NavLink>
                        <NavLink to="/pantry" className={getNavLinkClass}>My Pantry</NavLink>
                        <NavLink to="/saved-recipes" className={getNavLinkClass}>My Saved</NavLink>
                        <NavLink to="/meal-plan" className={getNavLinkClass}>Meal Plan</NavLink>
                        <NavLink to="/profile" className={getNavLinkClass}>Profile</NavLink>
                    </>
                )}
                 {token && userProfile && userProfile.role === 'supplier' && (
                    // --- Supplier Link ---
                     <NavLink to="/portal/dashboard" className={getNavLinkClass}>Supplier Portal</NavLink>
                 )}
            </div>

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
                    // --- Logged Out: Show Supplier Signup, Login, Consumer Signup ---
                    <>
                        {/* Added Supplier Signup Link */}
                        <NavLink to="/portal/signup" className={getNavLinkClass}>Supplier Sign Up</NavLink>
                        <NavLink to="/login" className={getNavLinkClass}>Log In</NavLink>
                        <NavLink to="/signup" className={({ isActive }) => (isActive ? 'signup-button active' : 'signup-button')}>Sign Up</NavLink>
                    </>
                )}
            </div>
        </nav>
    );
};
export default Navbar;