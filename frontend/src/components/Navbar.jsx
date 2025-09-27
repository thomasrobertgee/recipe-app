// src/components/Navbar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-logo">Recipe Saver</NavLink>
      <div className="nav-links">
        <NavLink to="/">Recipes</NavLink>
        <NavLink to="/specials">Manage Specials</NavLink>
      </div>
    </nav>
  );
};

export default Navbar;