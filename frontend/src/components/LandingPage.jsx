// src/components/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <header className="hero-section">
        <h1>Save Money, Eat Smarter.</h1>
        <p className="subtitle">Let AI create delicious, budget-friendly recipes from your local supermarket's weekly specials.</p>
        
        {/* --- UPDATED --- */}
        <div className="cta-buttons-container">
          <Link to="/signup" className="cta-button">Sign up for free</Link>
          <Link to="/login" className="secondary-cta-button">Log in</Link>
        </div>

      </header>

      <section className="features-section">
        <h2>How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>1. View Specials</h3>
            <p>Browse daily updated specials from Australia's major supermarkets.</p>
          </div>
          <div className="feature-card">
            <h3>2. Generate Recipes</h3>
            <p>Our AI analyzes your specials and personal preferences to create custom recipes just for you.</p>
          </div>
          <div className="feature-card">
            <h3>3. Shop & Cook</h3>
            <p>Get an interactive shopping list and easy-to-follow recipes to make your week easier and more affordable.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;