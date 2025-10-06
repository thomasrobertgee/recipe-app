// src/components/StarRating.jsx
import React from 'react';
import './StarRating.css';

const StarRating = ({ rating, onRate, readOnly = false }) => {
  return (
    <div className={`star-rating ${readOnly ? 'read-only' : ''}`}>
      {[...Array(5)].map((star, index) => {
        index += 1;
        return (
          <button
            type="button"
            key={index}
            className={index <= rating ? "on" : "off"}
            onClick={() => !readOnly && onRate(index)}
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