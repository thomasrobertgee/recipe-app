// src/components/FilterSortControls.jsx
import React from 'react';
import './FilterSortControls.css';

const FilterSortControls = ({ minRating, setMinRating, sortBy, setSortBy }) => {
  return (
    <div className="filter-sort-controls">
      <div className="filter-group">
        <label htmlFor="min-rating">Minimum Rating:</label>
        <select
          id="min-rating"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
        >
          <option value="">All</option>
          <option value="1">1 Star</option>
          <option value="2">2 Stars</option>
          <option value="3">3 Stars</option>
          <option value="4">4 Stars</option>
          <option value="5">5 Stars</option>
        </select>
      </div>
      <div className="sort-group">
        <label htmlFor="sort-by">Sort By:</label>
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="">Default</option>
          <option value="rating_asc">Rating Ascending</option>
          <option value="rating_desc">Rating Descending</option>
        </select>
      </div>
    </div>
  );
};

export default FilterSortControls;