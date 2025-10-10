// src/context/CookModeContext.jsx

import React, { createContext, useState, useContext } from 'react';

const CookModeContext = createContext();

export const useCookMode = () => useContext(CookModeContext);

export const CookModeProvider = ({ children }) => {
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const startCooking = (recipe) => {
    setActiveRecipe(recipe);
    setCurrentStep(0);
    setIsMinimized(false);
  };

  const stopCooking = () => {
    setActiveRecipe(null);
    setCurrentStep(0);
  };

  const nextStep = () => {
    const steps = activeRecipe.instructions.split('\n');
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  const value = {
    activeRecipe,
    currentStep,
    isMinimized,
    startCooking,
    stopCooking,
    nextStep,
    prevStep,
    toggleMinimize,
  };

  return (
    <CookModeContext.Provider value={value}>
      {children}
    </CookModeContext.Provider>
  );
};