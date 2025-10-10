// src/components/CookMode.jsx

import React, { useMemo } from 'react';
import { useCookMode } from '../context/CookModeContext';
import Timer from './Timer';
import './CookMode.css';

const CookMode = () => {
  const {
    activeRecipe,
    currentStep,
    isMinimized,
    stopCooking,
    nextStep,
    prevStep,
    toggleMinimize,
  } = useCookMode();

  const steps = useMemo(() => activeRecipe.instructions.split('\n').filter(s => s.trim() !== ''), [activeRecipe]);

  if (!activeRecipe) {
    return null;
  }

  const parseInstructionForTimer = (instruction) => {
    const timeRegex = /(\d+)\s*(-)?\s*(\d+)?\s*(minutes?|mins?)/i;
    const match = instruction.match(timeRegex);

    if (!match) {
      return { text: instruction, timer: null };
    }

    // Use the first number found (e.g., in "5-7 minutes", use 5)
    const minutes = parseInt(match[1], 10);
    return {
      text: instruction,
      timer: <Timer initialMinutes={minutes} />
    };
  };

  const currentInstruction = parseInstructionForTimer(steps[currentStep]);

  return (
    <div className={`cook-mode-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="cook-mode-header">
        <h3>{activeRecipe.title}</h3>
        <div className="cook-mode-header-controls">
          <button onClick={toggleMinimize} className="minimize-btn">{isMinimized ? '🔼' : '🔽'}</button>
          <button onClick={stopCooking} className="close-cook-mode-btn">×</button>
        </div>
      </div>

      <div className="cook-mode-content">
        <div className="step-counter">
          Step {currentStep + 1} of {steps.length}
        </div>
        <div className="instruction-text">
          {currentInstruction.text}
        </div>
        {currentInstruction.timer && (
          <div className="instruction-timer">
            {currentInstruction.timer}
          </div>
        )}
      </div>

      <div className="cook-mode-footer">
        <button onClick={prevStep} disabled={currentStep === 0}>
          Previous
        </button>
        <button onClick={nextStep} disabled={currentStep === steps.length - 1}>
          Next
        </button>
      </div>
    </div>
  );
};

export default CookMode;