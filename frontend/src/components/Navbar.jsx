// src/components/Navbar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import the useAuth hook
import './Navbar.css';

const Navbar = () => {
  const { token, logout } = useAuth(); // Get token and logout function from context

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-logo">Recipe Saver</NavLink>
      <div className="nav-links">
        <NavLink to="/">Recipes</NavLink>
        <NavLink to="/specials">Manage Specials</NavLink>
      </div>
      <div className="nav-auth">
        {token ? (
          // If token exists, show a Logout button
          <button onClick={logout} className="logout-button">Log Out</button>
        ) : (
          // If no token, show Log In and Sign Up links
          <>
            <NavLink to="/login">Log In</NavLink>
            <NavLink to="/signup" className="signup-button">Sign Up</NavLink>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;