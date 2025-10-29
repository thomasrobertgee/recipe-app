// src/components/GlobalSearch.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './GlobalSearch.css';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  // --- Add state for results and flags ---
  const [results, setResults] = useState({ recipes: [], ingredients: [], specials: [], has_more: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const RESULT_LIMIT = 5; // Define the limit used in backend

  useEffect(() => {
    // Debounce search
    if (query.length < 2) {
      setResults({ recipes: [], ingredients: [], specials: [], has_more: false });
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchResults();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      // Assuming backend returns { recipes: [...], ingredients: [...], specials: [...], has_more: boolean }
      const response = await axios.get(`/api/search?q=${query}&limit=${RESULT_LIMIT}`); // Pass limit
      setResults(response.data);
      setIsDropdownOpen(true);
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (path) => {
    setQuery('');
    setIsDropdownOpen(false);
    navigate(path); // Navigate to the provided path
  };

  // Navigate to the full search page on form submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query) return;
    setQuery(''); // Clear input
    setIsDropdownOpen(false); // Close dropdown
    navigate(`/search?q=${query}`); // Navigate to the results page
  };

  const hasResults = results.recipes.length > 0 || results.ingredients.length > 0 || results.specials.length > 0;

  return (
    <div className="global-search-container" ref={searchRef}>
      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className="global-search-input"
          placeholder="Search recipes, ingredients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && hasResults && setIsDropdownOpen(true)} // Re-open on focus if query exists
        />
        {/* We can add a search icon/button here if needed */}
      </form>

      {isDropdownOpen && (
        <div className="global-search-dropdown">
          {isLoading ? (
            <div className="search-result-item">Loading...</div>
          ) : !hasResults ? (
            <div className="search-result-item">No results found for "{query}"</div>
          ) : (
            <>
              {results.recipes.length > 0 && (
                <div className="search-result-category">
                  <h5>Recipes</h5>
                  {results.recipes.map(recipe => (
                    // --- Link to the search page for now, passing recipe title ---
                    // --- In future, link to a specific recipe page: /recipes/{recipe.id} ---
                    <Link
                      key={`recipe-${recipe.id}`}
                      to={`/search?q=${encodeURIComponent(recipe.title)}`}
                      className="search-result-item"
                      onClick={() => handleResultClick(`/search?q=${encodeURIComponent(recipe.title)}`)}
                    >
                      {recipe.title}
                    </Link>
                  ))}
                </div>
              )}
              {results.specials.length > 0 && (
                <div className="search-result-category">
                  <h5>On Special</h5>
                  {results.specials.map(special => (
                     // --- Link to the search page for now, passing ingredient name ---
                     // --- In future, link to specials page filtered: /specials?q={special.ingredient_name} ---
                    <Link
                      key={`special-${special.id}`}
                      to={`/search?q=${encodeURIComponent(special.ingredient_name)}`}
                      className="search-result-item"
                       onClick={() => handleResultClick(`/search?q=${encodeURIComponent(special.ingredient_name)}`)}
                    >
                      {special.ingredient_name} ({special.store})
                    </Link>
                  ))}
                </div>
              )}
              {results.ingredients.length > 0 && (
                <div className="search-result-category">
                  <h5>Ingredients</h5>
                  {results.ingredients.map(ingredient => (
                    // --- Link to the search page for now, passing ingredient name ---
                    // --- In future, link to pantry page focused: /pantry?highlight={ingredient.name} ---
                    <Link
                      key={`ingredient-${ingredient.ingredient_id}`}
                       to={`/search?q=${encodeURIComponent(ingredient.name)}`}
                      className="search-result-item"
                      onClick={() => handleResultClick(`/search?q=${encodeURIComponent(ingredient.name)}`)}
                    >
                      {ingredient.name}
                    </Link>
                  ))}
                </div>
              )}
              {/* --- Show "More results..." link --- */}
              {results.has_more && (
                  <Link
                      to={`/search?q=${query}`}
                      className="search-result-item more-results-link"
                       onClick={() => handleResultClick(`/search?q=${query}`)}
                  >
                     See all results for "{query}"...
                  </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;