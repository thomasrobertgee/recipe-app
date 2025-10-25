// src/components/dashboard/PantrySnapshot.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DashboardModule.css';

const PantrySnapshot = () => {
    const { pantryItems } = useAuth();

    // Display first 5 items alphabetically, or recently added if we track that later
    const itemsToShow = pantryItems.slice(0, 5).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="dashboard-module">
            <div className="module-header">
                <h2>Pantry Snapshot</h2>
                <Link to="/pantry" className="module-link">Manage Pantry →</Link>
            </div>
            {pantryItems.length === 0 ? (
                <p>Your pantry is empty. <Link to="/pantry">Add some items!</Link></p>
            ) : (
                <ul className="snapshot-list">
                    {itemsToShow.map(item => (
                        <li key={item.ingredient_id}>{item.name}</li>
                    ))}
                    {pantryItems.length > 5 && (
                        <li>... and {pantryItems.length - 5} more</li>
                    )}
                </ul>
            )}
            {/* We could add the "Low Stock" items here later */}
        </div>
    );
};

export default PantrySnapshot;