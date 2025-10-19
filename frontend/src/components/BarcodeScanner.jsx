// src/components/BarcodeScanner.jsx
import React, { useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useZxing } from 'react-zxing';
import axios from 'axios'; // Using the configured axios instance
import { toast } from 'react-toastify';
import './BarcodeScanner.css';

const BarcodeScanner = ({ onClose, onScanSuccess }) => {
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState('');

  const hints = new Map();
  // const formats = [BarcodeFormat.EAN_13, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE];
  // hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

  const { ref } = useZxing({
    constraints: {
      video: {
        facingMode: 'environment'
      }
    },
    hints: hints,
    onDecodeResult: async (result) => {
      const barcode = result.getText();
      console.log('Barcode detected:', barcode);
      toast.info(`Barcode detected: ${barcode}. Looking up product...`);
      onClose(); // Close scanner immediately

      try {
        // --- CALL OUR BACKEND PROXY ---
        const response = await axios.get(`/api/barcode-lookup/${barcode}`);
        console.log('Backend Lookup Response:', response.data);

        if (response.data.product_name) {
          const productName = response.data.product_name;
          console.log('Product found:', productName);
          toast.success(`Found: ${productName}. Adding to pantry...`);
          onScanSuccess(productName);
        } else {
          // Error message came from backend
          const errorMsg = response.data.error || `Product not found for barcode ${barcode}.`;
          console.log(errorMsg);
          toast.warn(`${errorMsg} Please add manually.`);
        }
      } catch (err) {
        // --- Error handling for OUR backend call ---
        console.error('Error calling backend lookup:', err);
        if (err.response) {
          console.error('Error Status:', err.response.status);
          console.error('Error Data:', err.response.data);
          // Display the error message from our backend
          const detail = err.response.data?.detail || 'Failed to look up barcode via backend.';
          toast.error(`Lookup Error: ${detail}`);
        } else if (err.request) {
          console.error('No response received:', err.request);
          toast.error('Network error: Could not reach our backend service.');
        } else {
          console.error('Error setting up request:', err.message);
          toast.error('Error during barcode lookup.');
        }
        // --- END Error handling ---
      }
    },
    onDecodeError: (error) => {
      if (!(error instanceof NotFoundException)) {
        console.error('Barcode scan error:', error);
        setError('Failed to scan barcode. Please ensure camera access is allowed.');
      }
    },
  });

  // Torch functionality remains experimental
  const toggleTorch = () => { /* ... */ };

  return (
    <div className="scanner-overlay">
      <div className="scanner-container">
        <video ref={ref} className="scanner-video" />
        {error && <p className="scanner-error">{error}</p>}
        <div className="scanner-controls">
          <button onClick={onClose} className="scanner-btn close-btn">Cancel</button>
        </div>
        <div className="scanner-aimer"></div>
      </div>
    </div>
  );
};

export default BarcodeScanner;