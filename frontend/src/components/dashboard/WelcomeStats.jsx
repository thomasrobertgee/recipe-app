// src/components/dashboard/WelcomeStats.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './DashboardModule.css'; // We'll create a shared CSS file

const WelcomeStats = () => {
    const { userProfile, pantryItems, savedRecipes } = useAuth();

    // Basic greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const userName = userProfile?.email?.split('@')[0] || 'User'; // Simple name extraction

    return (
        <div className="dashboard-module">
            <h2>{getGreeting()}, {userName}!</h2>
            <div className="stats-container">
                <div className="stat-item">
                    <span className="stat-value">{pantryItems?.length ?? 0}</span>
                    <span className="stat-label">Items in Pantry</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{savedRecipes?.length ?? 0}</span>
                    <span className="stat-label">Saved Recipes</span>
                </div>
                {/* Add more stats if needed */}
            </div>
        </div>
    );
};

export default WelcomeStats;