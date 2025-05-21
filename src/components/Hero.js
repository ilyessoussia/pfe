import React from "react";
import "../Home.css";
import back1 from "../pictures/back1.png";

const Hero = () => (
  <header className="hero">
    <div className="hero-container">
      <img src={back1} alt="Website Banner" className="hero-image" />
    </div>
  </header>
);

export default Hero;