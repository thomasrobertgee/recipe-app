// src/components/Navbar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { token, logout } = useAuth();

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-logo">Recipe Saver</NavLink>
      <div className="nav-links">
        {token && <NavLink to="/dashboard">Dashboard</NavLink>}
        {token && <NavLink to="/recipes">All Recipes</NavLink>}
        {token && <NavLink to="/specials">View Specials</NavLink>}
        {token && <NavLink to="/saved-recipes">My Saved</NavLink>}
        {token && <NavLink to="/profile">Profile</NavLink>}
      </div>
      <div className="nav-auth">
        {token ? (
          <button onClick={logout} className="logout-button">Log Out</button>
        ) : (
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