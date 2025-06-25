
import React from 'react';
import '../styles/LandingPage.css';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="hero-section">
          <div className="logo-animation">
            <h1 className="brand-title">
              <span className="sound">Sound</span>
              <span className="pix">Pix</span>
            </h1>
            <div className="sound-waves">
              <div className="wave wave1"></div>
              <div className="wave wave2"></div>
              <div className="wave wave3"></div>
            </div>
          </div>
          
          <p className="hero-caption">
            Get an imaginary <span className="highlight">Visual Art!!</span>
          </p>
          
          <button className="get-started-btn" onClick={onGetStarted}>
            <span className="btn-text">Get Started</span>
            <div className="btn-animation">
              <div className="spark spark1"></div>
              <div className="spark spark2"></div>
              <div className="spark spark3"></div>
              <div className="spark spark4"></div>
              <div className="btn-ripple"></div>
            </div>
            <i className="fas fa-arrow-right btn-icon"></i>
          </button>
        </div>
        
        <div className="features-preview">
          <div className="feature-card">
            <i className="fas fa-microphone feature-icon"></i>
            <h3>Voice to Image</h3>
            <p>Transform your voice into stunning visuals</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-book feature-icon"></i>
            <h3>Voice to Saga</h3>
            <p>Create visual stories with your voice</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-video feature-icon"></i>
            <h3>Voice to Video</h3>
            <p>Generate videos from your descriptions</p>
          </div>
        </div>
      </div>
      
      <div className="background-animation">
        <div className="floating-element elem1"></div>
        <div className="floating-element elem2"></div>
        <div className="floating-element elem3"></div>
        <div className="floating-element elem4"></div>
        <div className="floating-element elem5"></div>
      </div>
    </div>
  );
};

export default LandingPage;
