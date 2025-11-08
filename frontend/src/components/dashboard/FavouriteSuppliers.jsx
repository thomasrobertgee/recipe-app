// src/components/dashboard/FavouriteSuppliers.jsx
import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import './DashboardModule.css';
import './FavouriteSuppliers.css';

const FavouriteSuppliers = ({ allSpecials }) => {
    const { followedSupplierIds, handleSelectSpecial, selectedSpecials } = useAuth();

    const selectedSpecialIdSet = useMemo(() =>
        new Set(selectedSpecials.map(s => s.id)),
        [selectedSpecials]
    );

    const followedSpecials = useMemo(() => {
        if (!allSpecials || followedSupplierIds.size === 0) {
            return [];
        }
        // Filter all specials to find ones whose store (which is the supplier_profile_id for supplier items)
        // is in the user's followed list.
        // NOTE: This assumes supplier specials have a `supplier_profile_id`.
        // Let's check `allSpecials` structure.
        
        // Reviewing `backend/main.py` at `get_todays_prices` (line 1042)
        // The response `PriceHistoryRead` does not include `supplier_profile_id`.
        // This is a problem.
        
        // --- PROACTIVE PARTNERSHIP: API CHANGE NEEDED ---
        // I've identified a problem: The `/api/prices/today` endpoint does not
        // return the `supplier_profile_id` for supplier specials.
        // We cannot filter by `followedSupplierIds` without this.
        
        // --- TEMPORARY WORKAROUND (assuming `store` name is unique) ---
        // This is fragile, but let's see if we can filter by store name
        // against a list of followed supplier *names*.
        // This won't work as we only have IDs.

        // --- REAL FIX: Need to update backend first. ---
        // For now, I will build the component assuming the backend
        // *will* provide `supplier_profile_id` in the `PriceHistoryRead` schema.
        
        // Let's assume `allSpecials` contains items like:
        // { id: 1, ingredient_name: "Steak", price: "$19/kg", store: "Local Butcher", supplier_profile_id: 5 }
        // { id: 2, ingredient_name: "Bread", price: "$5", store: "Coles", supplier_profile_id: null }

        return allSpecials.filter(special => 
            special.supplier_profile_id && followedSupplierIds.has(special.supplier_profile_id)
        );

    }, [allSpecials, followedSupplierIds]);

    if (followedSupplierIds.size === 0) {
        return null; // Don't show the module if the user isn't following anyone
    }

    return (
        <div className="dashboard-module favourite-suppliers-module">
            <h3>My Favourite Shops</h3>
            {followedSpecials.length === 0 ? (
                <p className="no-specials-message">
                    Your followed shops have no specials today.
                    <Link to="/suppliers">Find more local suppliers!</Link>
                </p>
            ) : (
                <ul className="quick-specials-list">
                    {followedSpecials.slice(0, 5).map(special => { // Show top 5
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
                </ul>
            )}
            {followedSpecials.length > 5 && (
                <Link to="/specials" className="view-all-link">
                    View all {followedSpecials.length - 5} more...
                </Link>
            )}
        </div>
    );
};

export default FavouriteSuppliers;