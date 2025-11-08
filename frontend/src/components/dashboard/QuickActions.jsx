// src/components/dashboard/QuickActions.jsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import './DashboardModule.css'; // Re-using styles

const QuickActions = ({ onScanBarcode, onScanReceipt, allSpecials }) => {
    // --- NEW: Tab state and filtering ---
    const { handleSelectSpecial, selectedSpecials } = useAuth();
    const [activeTab, setActiveTab] = useState('local'); // 'local' or 'supermarket'
    const supermarkets = useMemo(() => ['Coles', 'Woolworths', 'Aldi'], []);

    const selectedSpecialIdSet = useMemo(() =>
        new Set(selectedSpecials.map(s => s.id)),
        [selectedSpecials]
    );

    const { localSpecials, supermarketSpecials } = useMemo(() => {
        if (!allSpecials) return { localSpecials: [], supermarketSpecials: [] }; // Guard against undefined
        const local = allSpecials.filter(s => !supermarkets.includes(s.store));
        const supermarket = allSpecials.filter(s => supermarkets.includes(s.store));
        return { localSpecials: local, supermarketSpecials: supermarket };
    }, [allSpecials, supermarkets]);

    const activeSpecials = activeTab === 'local' ? localSpecials : supermarketSpecials;
    // --- END NEW ---

    // --- NEW: Render specials list ---
    const renderSpecialsList = (specials) => (
        <ul className="quick-specials-list">
            {specials.slice(0, 5).map(special => { // Show top 5
                const isSelected = selectedSpecialIdSet.has(special.id);
                return (
                    <li key={special.id} className="quick-special-item">
                        <div className="quick-special-info">
                            <span className="special-name">{special.ingredient_name}</span>
                            <span className="special-store">{special.store}</span>
                            <span className="special-price">{special.price}</span>
                        </div>
                        <button
                            className={`add-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectSpecial(special)}
                            title={isSelected ? "Remove from list" : "Add to list"}
                        >
                            {isSelected ? '✓' : '+'}
                        </button>
                    </li>
                );
            })}
             {specials.length === 0 && (
                <p className="no-specials-message">
                    {activeTab === 'local' ? "No local specials found today." : "No supermarket specials found today."}
                </p>
            )}
        </ul>
    );
    // --- END NEW ---

    return (
        <div className="dashboard-module quick-actions-module">
            {/* Quick action buttons */}
            <div className="quick-actions-buttons">
                <Link to="/recipes" className="quick-action-btn generate">
                    💡
                    <span>Generate Recipes</span>
                </Link>
                <button onClick={onScanBarcode} className="quick-action-btn scan-item">
                    📷
                    <span>Scan Item</span>
                </button>
                <button onClick={onScanReceipt} className="quick-action-btn scan-receipt">
                    🧾
                    <span>Scan Receipt</span>
                </button>
                <Link to="/meal-plan" className="quick-action-btn meal-plan">
                    🗓️
                    <span>Meal Planner</span>
                </Link>
            </div>

            {/* --- NEW: Specials preview with tabs --- */}
            <div className="quick-specials-preview">
                <h3>Today's Specials</h3>
                <div className="dashboard-tabs quick-specials-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                        onClick={() => setActiveTab('local')}
                    >
                        Local
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'supermarket' ? 'active' : ''}`}
                        onClick={() => setActiveTab('supermarket')}
                    >
                        Supermarkets
                    </button>
                </div>
                
                {renderSpecialsList(activeSpecials)}

                {activeSpecials.length > 5 && (
                    <Link to="/specials" className="view-all-link">
                        View all {activeSpecials.length - 5} more...
                    </Link>
                )}
            </div>
            {/* --- END NEW --- */}
        </div>
    );
};

export default QuickActions;