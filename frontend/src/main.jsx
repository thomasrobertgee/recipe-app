// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { CookModeProvider } from './context/CookModeContext';
import App from './App';
import './index.css';

// --- IMPORTANT: Get your Client ID from the .env file ---
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error("Missing VITE_GOOGLE_CLIENT_ID in .env file");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <UIProvider>
          <AuthProvider>
            <CookModeProvider>
              <App />
            </CookModeProvider>
          </AuthProvider>
        </UIProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)