import React from "react";
import { Link } from "react-router-dom";
import "../Home.css";

const Navbar = () => {
  const handleNavigation = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <nav className="navbar">
      <div className="logo">CHB * SNTT</div>
      <div className="nav-links-container">
        <ul className="nav-links">
          <li><Link to="/" onClick={handleNavigation}>Accueil</Link></li>
          <li><Link to="/products" onClick={handleNavigation}>Articles</Link></li>
          <li><Link to="/solutions" onClick={handleNavigation}>Solutions</Link></li>
          <li><Link to="/MissionValues" onClick={handleNavigation}>Mission</Link></li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;