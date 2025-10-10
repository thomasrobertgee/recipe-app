// src/components/Timer.jsx

import React, { useState, useEffect, useRef } from 'react';
import './Timer.css';

const Timer = ({ initialMinutes }) => {
  const [seconds, setSeconds] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const alarmRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      setIsActive(false);
      alarmRef.current.play();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const toggle = () => {
    setIsActive(!isActive);
  };

  const reset = () => {
    setSeconds(initialMinutes * 60);
    setIsActive(false);
  };

  const formatTime = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-widget">
      <audio ref={alarmRef} src="/alarm.mp3" preload="auto" />
      <div className="timer-display">{formatTime()}</div>
      <div className="timer-controls">
        <button onClick={toggle} className={`timer-btn ${isActive ? 'pause' : 'start'}`}>
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="timer-btn reset">
          Reset
        </button>
      </div>
    </div>
  );
};

export default Timer;