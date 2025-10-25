// src/components/dashboard/RecentActivity.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RecipeTile from '../RecipeTile';
import './DashboardModule.css';

const RecentActivity = () => {
    const { savedRecipes } = useAuth();

    // Show the last 3 saved recipes (assuming savedRecipes is ordered by save date, which it isn't currently)
    // For now, just show the first 3 from the fetched list.
    const recentRecipes = savedRecipes.slice(0, 3);

    return (
        <div className="dashboard-module">
            <div className="module-header">
                <h2>Recently Saved</h2>
                <Link to="/saved-recipes" className="module-link">View All →</Link>
            </div>
            {savedRecipes.length === 0 ? (
                <p>You haven't saved any recipes yet.</p>
            ) : (
                <div className="recent-recipes-container">
                    {recentRecipes.map(recipe => (
                        <RecipeTile key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentActivity;