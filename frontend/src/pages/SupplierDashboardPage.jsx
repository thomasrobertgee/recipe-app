// frontend/src/pages/SupplierDashboardPage.jsx

import React, { useState, useEffect } from 'react';
import api from '../api'; // Using the interceptor-configured api
import { toast } from 'react-toastify';
import './SupplierDashboardPage.css';
// --- REMOVED './Page.css' import as app-container should handle base styles ---

const SupplierDashboardPage = () => {
    const [specials, setSpecials] = useState([]);
    const [ingredientName, setIngredientName] = useState('');
    const [price, setPrice] = useState(''); // This will now be a number
    const [unit, setUnit] = useState('/kg'); // New state for the unit
    const [category, setCategory] = useState('Meat & Seafood'); // New default category
    const [expiryDate, setExpiryDate] = useState(''); // --- NEW: State for expiry date ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- NEW: Define categories and units for dropdowns ---
    const categories = ['Meat & Seafood', 'Fruit & Vegetables', 'Dairy & Eggs', 'Bakery', 'Pantry Staples', 'Deli'];
    const units = ['/kg', '/g', 'each', 'bunch', 'pack'];
    // --- END NEW ---

    // Fetch specials on component mount
    useEffect(() => {
        fetchSpecials();
    }, []);

    const fetchSpecials = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/supplier/specials');
            setSpecials(response.data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch specials:", err);
            setError("Could not load your specials. Please try again.");
            toast.error("Could not load your specials.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSpecial = async (e) => {
        e.preventDefault();
        if (!ingredientName || !price || !category || !expiryDate) {
            toast.error("Please fill out all fields.");
            return;
        }

        // --- FIX: Combine price and unit into the expected string format ---
        const priceString = `$${parseFloat(price).toFixed(2)}${unit}`;
        const newSpecial = {
            ingredient_name: ingredientName,
            price: priceString,
            store: '', // Backend will override this
            category: category || null,
            expiry_date: expiryDate // --- NEW: Add expiry date to payload ---
        };

        try {
            const response = await api.post('/api/supplier/specials', newSpecial);
            // Add new special to the top of the list
            setSpecials([response.data, ...specials]);
            toast.success(`${ingredientName} added to your specials!`);
            
            // Reset form
            setIngredientName('');
            setPrice('');
            setUnit('/kg');
            setCategory('Meat & Seafood'); // Reset to default
            setExpiryDate(''); // --- NEW: Reset expiry date ---

        } catch (err) {
            console.error("Failed to add special:", err);
            toast.error("Failed to add special. Please try again.");
        }
    };

    const handleDeleteSpecial = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete the special for ${name}?`)) {
            return;
        }

        try {
            await api.delete(`/api/supplier/specials/${id}`);
            // Filter out the deleted special
            setSpecials(specials.filter(s => s.id !== id));
            toast.success(`${name} was deleted.`);
        } catch (err) {
            console.error("Failed to delete special:", err);
            toast.error("Failed to delete special. Please try again.");
        }
    };

    return (
        // --- CHANGED className here ---
        <div className="app-container supplier-dashboard"> {/* Was "page-container supplier-dashboard" */}
            {/* --- Use inline style or dedicated class for header if needed, similar to SpecialsPage --- */}
             <div className="page-header" style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h1>Supplier Portal</h1>
                <p style={{ margin: 0, color: '#555' }}>Manage your specials for today. New specials will appear to all users immediately.</p>
             </div>

            <div className="supplier-content">
                <div className="supplier-form-container">
                    <h3>Add New Special</h3>
                    <form onSubmit={handleAddSpecial} className="supplier-form">
                        <div className="form-group">
                            <label htmlFor="ingredientName">Ingredient Name</label>
                            <input
                                type="text"
                                id="ingredientName"
                                value={ingredientName}
                                onChange={(e) => setIngredientName(e.target.value)}
                                placeholder="e.g., Rump Steak"
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group price-group">
                                <label htmlFor="price">Price</label>
                                <input
                                    type="number"
                                    id="price"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="e.g., 19.99"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="form-group unit-group">
                                <label htmlFor="unit">Unit</label>
                                <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
                                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="expiryDate">Expiry Date</label>
                            <input
                                type="date"
                                id="expiryDate"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                required
                                min={new Date().toISOString().split("T")[0]} // Prevent selecting past dates
                            />
                        </div>
                        <button type="submit" className="btn-primary">Add Special</button>
                    </form>
                </div>

                <div className="supplier-list-container">
                    <h3>Your Active Specials</h3>
                    {loading && <p>Loading specials...</p>}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && specials.length === 0 && (
                        <p>You have no active specials for today. Add one using the form!</p>
                    )}
                     {/* Added check for specials before mapping */}
                    {!loading && specials.length > 0 && (
                        <ul className="specials-list">
                            {specials.map(special => (
                                <li key={special.id} className="special-item">
                                    <div className="special-info">
                                        <span className="special-name">{special.ingredient_name}</span>
                                        <span className="special-price">{special.price}</span>
                                        <span className="special-category">{special.category || 'No Category'}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteSpecial(special.id, special.ingredient_name)}
                                        className="btn-danger-outline"
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupplierDashboardPage;