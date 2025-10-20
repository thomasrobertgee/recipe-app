// src/components/ReceiptScannerModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import './ReceiptScannerModal.css';

const ReceiptScannerModal = ({ onClose, onScan }) => {
  const [mode, setMode] = useState('select'); // 'select', 'camera', 'preview'
  const [imageSrc, setImageSrc] = useState(null);
  const [imageFile, setImageFile] = useState(null); // Store the actual file object
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null); // <-- State to hold the stream object
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // --- Effect to handle stream attachment and playing ---
  useEffect(() => {
    // Only run when in camera mode AND stream is available AND video element exists
    if (mode === 'camera' && stream && videoRef.current) {
      const videoElement = videoRef.current;
      console.log("Effect running: Attaching stream to video element.");
      videoElement.srcObject = stream;

      videoElement.onloadedmetadata = () => {
        console.log("Video metadata loaded in effect. Attempting to play...");
        videoElement.play().then(() => {
          console.log("Camera video playing successfully via effect.");
        }).catch(playError => {
          console.error("Effect: Error playing video stream:", playError);
          setCameraError('Could not play video stream.');
          toast.error('Could not play video stream.');
          stopCameraStream(); // Clean up if play fails
          setMode('select');
        });
      };
      videoElement.onerror = (e) => { // Handle potential video element errors
          console.error("Effect: Video element error:", e);
          setCameraError('Video element encountered an error.');
          toast.error('Video element encountered an error.');
          stopCameraStream();
          setMode('select');
      };
    }

    // Cleanup function for this effect
    return () => {
        // Detach stream when effect re-runs or component unmounts
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            console.log("Effect cleanup: Detached stream from video element.");
        }
    };
  }, [mode, stream]); // Re-run ONLY if mode or stream changes

  // --- Effect for overall cleanup ---
   useEffect(() => {
    // Return cleanup function: Stop stream when modal is closed/unmounted
    return () => {
      stopCameraStream();
    };
  }, []); // Empty dependency array means this runs only on mount/unmount


  const stopCameraStream = () => {
    // Stop tracks using the stream state
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null); // Clear the stream state
      console.log("Camera stream stopped and state cleared.");
    }
     // Also ensure video srcObject is cleared if ref exists
     if (videoRef.current) {
         videoRef.current.srcObject = null;
     }
  };

  const startCamera = async () => {
    console.log("Attempting to start camera...");
    setCameraError('');
    stopCameraStream(); // Ensure previous stream is stopped cleanly

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by this browser.");
        toast.error("Camera access is not supported by this browser.");
        setMode('select');
        return;
    }

    try {
      const obtainedStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      console.log("getUserMedia successful, stream obtained.");
      setStream(obtainedStream); // <-- Store stream in state
      setMode('camera');      // <-- Set mode to trigger the useEffect
      // DO NOT try to attach srcObject or play here

    } catch (err) {
      console.error("Error accessing or starting camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No suitable camera found.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.name === 'OverconstrainedError') {
         setCameraError('Camera is already in use or cannot be accessed.');
      } else {
        setCameraError('Could not access camera.');
      }
      toast.error(cameraError || 'Could not access camera.');
      stopCameraStream(); // Clean up on error
      setMode('select');
    }
  };


  const handleFileChange = (event) => {
    stopCameraStream(); // Stop camera if user switches to file upload
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    } else {
      toast.warn('Please select a valid image file.');
    }
  };

  const capturePhoto = () => {
     if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
           const file = new File([blob], "receipt-capture.jpg", { type: "image/jpeg" });
           setImageFile(file);
           setImageSrc(dataUrl);
           stopCameraStream(); // Stop camera AFTER capture
           setMode('preview'); // Switch mode AFTER stopping camera
        });
    } else {
        console.warn("Capture failed: Video not ready or refs not available.");
        toast.warn("Camera not ready yet, please wait a moment.");
    }
  };

  const handleRetake = () => {
    setImageSrc(null);
    setImageFile(null);
    // No need to stop stream here as startCamera does it
    startCamera(); // Restart camera
  };

  const handleReSelectFile = () => {
      setImageSrc(null);
      setImageFile(null);
      setMode('select');
      // Use timeout to ensure state update happens before click simulation
      setTimeout(() => {
          document.getElementById('receipt-upload-input')?.click();
      }, 0);
  };

  const handleProcess = () => {
    if (imageFile) {
      onScan(imageFile); // Send the File object back via the onScan prop
    } else {
        toast.error("No image available to process.");
    }
  };

   const handleClose = () => {
       stopCameraStream(); // Ensure camera stops when closing modal
       onClose();
   };

  return (
    <div className="scanner-overlay receipt-overlay">
      <div className="scanner-container receipt-container">
        {mode === 'select' && (
          <div className="mode-selection">
            <h2>Scan Receipt</h2>
            <p>Choose how to add your receipt:</p>
            {cameraError && <p className="scanner-error">{cameraError}</p>}
            <button onClick={startCamera} className="scanner-btn mode-btn">
              📷 Use Camera
            </button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              id="receipt-upload-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="receipt-upload-input" className="scanner-btn mode-btn">
              ⬆️ Upload File
            </label>
            <button onClick={handleClose} className="scanner-btn close-btn cancel-select">Cancel</button>
          </div>
        )}

        {mode === 'camera' && (
          <div className="camera-view">
            {/* Added key prop to force re-mount if stream changes, ensuring cleanup */}
            <video key={stream ? 'active' : 'inactive'} ref={videoRef} className="scanner-video receipt-video" playsInline autoPlay muted />
            <div className="camera-controls">
              <button onClick={capturePhoto} className="scanner-btn capture-btn">⚪ Capture</button>
              {/* Go back to select mode, stopCameraStream is handled by useEffect */}
              <button onClick={() => setMode('select')} className="scanner-btn">Back</button>
            </div>
          </div>
        )}

        {mode === 'preview' && imageSrc && (
          <div className="preview-view">
            <h2>Preview</h2>
            <img src={imageSrc} alt="Receipt preview" className="receipt-preview-img" />
            <div className="preview-controls">
              {/* Logic relies on whether `stream` state was set before preview */}
              {stream ? (
                  <button onClick={handleRetake} className="scanner-btn">Retake Photo</button>
              ) : (
                  <button onClick={handleReSelectFile} className="scanner-btn">Select Different File</button>
              )}
              <button onClick={handleProcess} className="scanner-btn process-btn">✅ Looks Good, Process</button>
              <button onClick={handleClose} className="scanner-btn close-btn">Cancel</button>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      </div>
    </div>
  );
};

export default ReceiptScannerModal;