// src/pages/SearchResultsPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; // Import Link
import axios from 'axios';
import { toast } from 'react-toastify';
// Import necessary components for displaying results (e.g., RecipeCard, lists)
// import RecipeList from '../components/RecipeList'; // Example
import './SearchResultsPage.css';
import './Page.css'; // For consistent header styling

const SearchResultsPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState({ recipes: [], ingredients: [], specials: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('recipes'); // Default tab

    useEffect(() => {
        // Fetch results when the initial query (from URL) changes
        if (initialQuery) {
            fetchSearchResults(initialQuery);
        } else {
            setIsLoading(false); // No query, nothing to load
        }
    }, [initialQuery]);

    const fetchSearchResults = async (searchTerm) => {
        if (!searchTerm || searchTerm.length < 2) {
            setResults({ recipes: [], ingredients: [], specials: [] });
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // NOTE: We'll use the existing /api/search for now.
            // Ideally, we'd create a new backend endpoint (/api/search/all)
            // that returns ALL results without a limit. For now, it might only show 5 per category.
            // We should update the backend later to return all results for this page.
            const response = await axios.get(`/api/search?q=${searchTerm}`); // Removed limit for now
            setResults(response.data);
             // Automatically switch tab if the default ('recipes') has no results but others do
             if (response.data.recipes.length === 0) {
                 if (response.data.specials.length > 0) setActiveTab('specials');
                 else if (response.data.ingredients.length > 0) setActiveTab('ingredients');
                 else setActiveTab('recipes'); // Default back to recipes if nothing else found
             } else {
                 setActiveTab('recipes'); // Default back to recipes if they exist
             }
        } catch (error) {
            console.error("Error fetching search results:", error);
            toast.error("Could not load search results.");
            setResults({ recipes: [], ingredients: [], specials: [] });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        // Update URL and trigger fetch via useEffect
        navigate(`/search?q=${query}`);
    };

    const renderResults = () => {
        if (isLoading) {
            return <p>Loading results...</p>;
        }

        const noResultsFound = results.recipes.length === 0 && results.ingredients.length === 0 && results.specials.length === 0;
        if (noResultsFound) {
             return <p>No results found for "{initialQuery}".</p>;
        }

        switch (activeTab) {
            case 'recipes':
                return results.recipes.length > 0 ? (
                    <div className='search-results-list'>
                        {results.recipes.map(recipe => (
                             // --- Wrap div with Link ---
                             <Link key={recipe.id} to={`#recipe-${recipe.id}`} className="search-result-item-link">
                                <div className="search-result-item-page">
                                    {recipe.title}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : <p>No recipes found matching "{initialQuery}".</p>;
            case 'specials':
                 return results.specials.length > 0 ? (
                    <div className='search-results-list'>
                        {results.specials.map(special => (
                            // --- Wrap div with Link ---
                             <Link key={special.id} to={`#special-${special.id}`} className="search-result-item-link">
                                <div className="search-result-item-page">
                                    {special.ingredient_name} ({special.store}) - {special.price}
                                </div>
                             </Link>
                        ))}
                    </div>
                ) : <p>No specials found matching "{initialQuery}".</p>;
            case 'ingredients':
                 return results.ingredients.length > 0 ? (
                    <div className='search-results-list'>
                        {results.ingredients.map(ingredient => (
                             // --- Wrap div with Link ---
                             <Link key={ingredient.ingredient_id} to={`#ingredient-${ingredient.ingredient_id}`} className="search-result-item-link">
                                <div className="search-result-item-page">
                                    {ingredient.name}
                                </div>
                             </Link>
                        ))}
                    </div>
                ) : <p>No ingredients found matching "{initialQuery}".</p>;
            default:
                return null;
        }
    };

    return (
        <div className="app-container search-results-page">
            <div className="page-header">
                <h1>Search Results</h1>
                 {/* Search bar specific to this page */}
                 <form onSubmit={handleSearchSubmit} className="search-page-form">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search again..."
                        className="search-page-input"
                    />
                    <button type="submit" className='search-page-button'>Search</button>
                </form>
            </div>

            <div className="search-tabs">
                <button
                    className={`search-tab-button ${activeTab === 'recipes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recipes')}
                    disabled={results.recipes.length === 0 && !isLoading}
                >
                    Recipes ({results.recipes.length})
                </button>
                <button
                    className={`search-tab-button ${activeTab === 'specials' ? 'active' : ''}`}
                    onClick={() => setActiveTab('specials')}
                     disabled={results.specials.length === 0 && !isLoading}
                >
                    Specials ({results.specials.length})
                </button>
                <button
                    className={`search-tab-button ${activeTab === 'ingredients' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ingredients')}
                     disabled={results.ingredients.length === 0 && !isLoading}
                >
                    Ingredients ({results.ingredients.length})
                </button>
            </div>

            <div className="search-results-content">
                {renderResults()}
            </div>
        </div>
    );
};

export default SearchResultsPage;