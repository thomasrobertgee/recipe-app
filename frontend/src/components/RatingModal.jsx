// src/components/RatingModal.jsx
import React, { useState } from 'react';
import StarRating from './StarRating';
import './RatingModal.css';

const RatingModal = ({ recipeTitle, onClose, onSubmitRating }) => {
  const [currentRating, setCurrentRating] = useState(0);

  const handleRate = (rating) => {
    setCurrentRating(rating);
  };

  const handleSubmit = () => {
    if (currentRating > 0) {
      onSubmitRating(currentRating);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rating-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h3>Rate "{recipeTitle}"</h3>
        <div className="rating-stars-container">
          <StarRating rating={currentRating} onRate={handleRate} />
        </div>
        <button className="submit-rating-btn" onClick={handleSubmit}>
          Submit Rating
        </button>
      </div>
    </div>
  );
};

export default RatingModal;