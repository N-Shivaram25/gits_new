
import React, { useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import VoiceToImage from './components/voice-to-image';

function App() {
  const [showLanding, setShowLanding] = useState(true);

  const handleGetStarted = () => {
    setShowLanding(false);
  };

  return (
    <div className="App">
      {showLanding ? (
        <LandingPage onGetStarted={handleGetStarted} />
      ) : (
        <VoiceToImage />
      )}
    </div>
  );
}

export default App;
