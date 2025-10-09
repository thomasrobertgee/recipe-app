// src/context/UIContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  // --- UPDATED: Initialize state from localStorage, defaulting to false ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const storedState = localStorage.getItem('sidebarOpen');
    return storedState ? JSON.parse(storedState) : false;
  });

  // --- NEW: Save state to localStorage whenever it changes ---
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);


  return (
    <UIContext.Provider value={{ isSidebarOpen, openSidebar, closeSidebar, toggleSidebar }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  return useContext(UIContext);
};