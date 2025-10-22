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
        <h2>All-In-One Meal Planning</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Find Deals Everywhere</h3>
            <p>Discover daily specials from major supermarkets and unique deals from local suppliers, all in one place.</p>
          </div>
          <div className="feature-card">
            <h3>Get Inspired by AI</h3>
            <p>Let our AI generate personalized recipes based on your taste, budget, and the best deals available. You can even modify recipes on the fly!</p>
          </div>
          <div className="feature-card">
            <h3>Build Your Smart List</h3>
            <p>Add recipes to create an intelligent shopping list that consolidates ingredients, calculates costs, and tracks your budget in real-time.</p>
          </div>
          <div className="feature-card">
            <h3>Cook with Confidence</h3>
            <p>Use our interactive Cook Mode with step-by-step instructions and integrated timers to make cooking a breeze.</p>
          </div>
          <div className="feature-card">
            <h3>Your Digital Pantry</h3>
            <p>Keep track of ingredients you already own. Our AI prioritizes recipes that use up what's in your pantry first, reducing food waste.</p>
          </div>
          <div className="feature-card">
            <h3>Effortless Scanning</h3>
            <p>Quickly add items to your pantry by scanning product barcodes or by simply taking a photo of your latest shopping receipt.</p>
          </div>
          <div className="feature-card">
            <h3>Shop Smarter</h3>
            <p>View an item's price history with interactive charts. See if that "special" is really a good deal before you buy.</p>
          </div>
        </div>
      </section>

      <section className="supplier-promo-section">
        <div className="supplier-promo-content">
          <h2>Are you a business owner?</h2>
          <p>
            Promote your weekly specials directly to local customers looking for the best deals. 
            Join our network of local suppliers today!
          </p>
          <Link to="/signup/supplier" className="cta-button">Sign up as a Supplier</Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;