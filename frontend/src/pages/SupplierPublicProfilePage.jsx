// src/pages/SupplierPublicProfilePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import PriceHistoryChart from '../components/PriceHistoryChart';
import './Page.css';
import './SupplierDiscoveryPage.css'; // Reuse styles from Discovery page
import './SpecialsPage.css'; // Reuse styles from Specials page
import './SupplierPublicProfilePage.css'; // New specific styles

const SupplierPublicProfilePage = () => {
    const { supplierId } = useParams();
    const { 
        handleSelectSpecial, 
        selectedSpecials,
        followedSupplierIds, // <-- NEW
        followSupplier,      // <-- NEW
        unfollowSupplier     // <-- NEW
    } = useAuth();

    const [supplier, setSupplier] = useState(null);
    const [specials, setSpecials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for price history modal
    const [showPriceHistory, setShowPriceHistory] = useState(false);
    const [selectedIngredientId, setSelectedIngredientId] = useState(null);
    const [selectedIngredientName, setSelectedIngredientName] = useState(null);

    const selectedSpecialIdSet = useMemo(() =>
        new Set(selectedSpecials.map(s => s.id)),
        [selectedSpecials]
    );

    // --- NEW: Check if supplier is followed ---
    const isFollowed = useMemo(() => 
        followedSupplierIds.has(parseInt(supplierId)),
    [followedSupplierIds, supplierId]);
    // --- END NEW ---

    useEffect(() => {
        if (!supplierId) {
            setError("No supplier ID provided.");
            setIsLoading(false);
            return;
        }

        const fetchProfile = axios.get(`/api/supplier/${supplierId}/profile`);
        const fetchSpecials = axios.get(`/api/supplier/${supplierId}/specials`);

        Promise.all([fetchProfile, fetchSpecials])
            .then(([profileResponse, specialsResponse]) => {
                setSupplier(profileResponse.data);
                setSpecials(specialsResponse.data);
                setError(null);
            })
            .catch(err => {
                console.error("Error fetching supplier details:", err);
                setError("Could not load supplier details.");
                if (!err.response || err.response.status !== 401) {
                    toast.error("Could not load supplier details.");
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [supplierId]);

    const handleShowHistory = (ingredientId, ingredientName) => {
        setSelectedIngredientId(ingredientId);
        setSelectedIngredientName(ingredientName);
        setShowPriceHistory(true);
    };

    // --- NEW: Follow button handler ---
    const handleFollowToggle = () => {
        const id = parseInt(supplierId);
        if (isFollowed) {
            unfollowSupplier(id);
        } else {
            followSupplier(id);
        }
    };
    // --- END NEW ---

    if (isLoading) {
        return <div className="app-container"><p className="loading-message">Loading supplier profile...</p></div>;
    }

    if (error) {
        return <div className="app-container"><p className="error-message">{error}</p></div>;
    }

    if (!supplier) {
        return <div className="app-container"><p>Supplier not found.</p></div>;
    }

    return (
        <>
            {showPriceHistory && (
                <PriceHistoryChart
                    ingredientId={selectedIngredientId}
                    ingredientName={selectedIngredientName}
                    onClose={() => setShowPriceHistory(false)}
                />
            )}
            <div className="app-container supplier-public-profile-page">
                {/* Header section from Discovery Card */}
                <div className="supplier-card-header profile-page-header">
                    <img
                        src={supplier.logo_url || 'https://via.placeholder.com/100'}
                        alt={`${supplier.business_name} logo`}
                        className="supplier-logo"
                    />
                    <div className="supplier-card-title">
                        <h1>{supplier.business_name}</h1>
                        {supplier.business_type && (
                            <span className="supplier-type">{supplier.business_type}</span>
                        )}
                    </div>
                    {/* --- NEW: Follow Button --- */}
                    <button
                        className={`btn follow-btn ${isFollowed ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={handleFollowToggle}
                    >
                        {isFollowed ? '✓ Following' : '+ Follow'}
                    </button>
                    {/* --- END NEW --- */}
                </div>

                {/* Body section from Discovery Card */}
                <div className="supplier-profile-body">
                    {supplier.description && (
                        <p className="supplier-description">{supplier.description}</p>
                    )}
                    <div className="supplier-info-grid">
                        {supplier.address && (
                            <p className="supplier-info"><strong>Address:</strong> {supplier.address}</p>
                        )}
                         {supplier.postcode && (
                            <p className="supplier-info"><strong>Area:</strong> {supplier.postcode}</p>
                        )}
                        {supplier.opening_hours && (
                            <p className="supplier-info"><strong>Hours:</strong> {supplier.opening_hours}</p>
                        )}
                    </div>
                </div>

                {/* Specials List section from Specials Page */}
                <div className="supplier-specials-section">
                    <h2>Active Specials</h2>
                    {specials.length === 0 ? (
                        <p>{supplier.business_name} has no active specials right now.</p>
                    ) : (
                        <div className="specials-list profile-specials-list">
                            {specials.map(special => {
                                const isSelected = selectedSpecialIdSet.has(special.id);
                                return (
                                    <div key={special.id} className="special-item">
                                        <div className="special-item-info">
                                            <span className="special-item-name">{special.ingredient_name}</span>
                                            <span className="special-item-price">{special.price}</span>
                                        </div>
                                        <div className="special-item-actions">
                                            <button
                                                className="history-btn"
                                                onClick={() => handleShowHistory(special.ingredient_id, special.ingredient_name)}
                                                title="View price history"
                                            >
                                                📊
                                            </button>
                                            <button
                                                className={`add-to-list-btn ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleSelectSpecial(special)}
                                                title={isSelected ? "Remove from list" : "Add to list"}
                                            >
                                                {isSelected ? '✓' : '+'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SupplierPublicProfilePage;