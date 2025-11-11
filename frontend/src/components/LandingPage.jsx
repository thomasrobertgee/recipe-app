// src/components/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            {/* Hero Section */}
            <header className="hero-section">
                <div className="hero-content">
                    <h1>Cook Smarter with AI-Powered Specials</h1>
                    <p>Stop overspending on groceries. We generate delicious, budget-friendly recipes based on the latest specials from your local supermarkets and suppliers.</p>
                    <Link to="/signup" className="cta-button">Sign Up for Free</Link>
                </div>
                <div className="hero-image">
                    {/* Placeholder for split-screen image */}
                    <img src="https://via.placeholder.com/600x400?text=Receipt+->+Delicious+Meal" alt="The Local Catalogue concept" />
                </div>
            </header>

            {/* Features Section */}
            <section className="features-section">
                <h2>How It Works</h2>
                <div className="features-grid">
                    <div className="feature-item">
                        <div className="feature-icon">[📷]</div> {/* Placeholder for screenshot snippet */}
                        <h3>1. Find Local Specials</h3>
                        <p>Browse daily specials from major supermarkets and, more importantly, from your favorite local butchers, bakers, and grocers.</p>
                    </div>
                    <div className="feature-item">
                         <div className="feature-icon">[💡]</div> {/* Placeholder for screenshot snippet */}
                        <h3>2. Get AI Recipes</h3>
                        <p>Our AI generates custom recipes that use your pantry items and the best local deals, matching your diet, budget, and skill.</p>
                    </div>
                    <div className="feature-item">
                         <div className="feature-icon">[🛒]</div> {/* Placeholder for screenshot snippet */}
                        <h3>3. Save Time & Money</h3>
                        <p>Reduce food waste with our smart pantry tracker and build an intelligent shopping list that optimizes your spending.</p>
                    </div>
                </div>
            </section>

            {/* --- UPDATED: "For Suppliers" Section --- */}
            <section className="supplier-section">
                <div className="supplier-content">
                    <h2>Are you a local supplier?</h2>
                    <p className="supplier-subheading">Stop competing with the giants. Join your local food community.</p>
                    
                    <ul className="supplier-benefits-list">
                        <li>List your weekly specials in under 2 minutes.</li>
                        <li>Get discovered by thousands of local home cooks.</li>
                        <li>Track your engagement with a simple analytics dashboard.</li>
                    </ul>

                    <Link to="/portal/signup" className="cta-button secondary-cta">List Your Specials for Free</Link>
                </div>
                
                {/* NEW: Screenshot placeholders */}
                <div className="supplier-screenshots">
                    <div className="screenshot-item">
                         <img src="https://via.placeholder.com/300x200?text=Analytics+Dashboard" alt="Supplier Analytics Dashboard" />
                         <p>Track your views and list-adds.</p>
                    </div>
                     <div className="screenshot-item">
                         <img src="https://via.placeholder.com/300x200?text=Quick-Add+Feature" alt="Supplier Quick-Add Feature" />
                         <p>Re-list previous items with one click.</p>
                    </div>
                </div>
                {/* --- END UPDATED --- */}
            </section>
        </div>
    );
};

export default LandingPage;