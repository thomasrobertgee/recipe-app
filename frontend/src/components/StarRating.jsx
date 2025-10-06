// src/components/StarRating.jsx
import React from 'react';
import './StarRating.css';

const StarRating = ({ rating, onRate, readOnly = false }) => {
  return (
    <div className={`star-rating ${readOnly ? 'read-only' : ''}`}>
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;

        let starClass = 'off';
        // Logic for read-only display with half stars
        if (readOnly) {
          if (rating >= starValue) {
            starClass = 'on';
          } else if (rating >= starValue - 0.5) {
            starClass = 'half';
          }
        } 
        // Logic for interactive rating (full stars)
        else {
          if (rating >= starValue) {
            starClass = 'on';
          }
        }

        return (
          <button
            type="button"
            key={starValue}
            className={starClass}
            onClick={() => !readOnly && onRate(starValue)}
            disabled={readOnly}
          >
            <span className="star">&#9733;</span>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;