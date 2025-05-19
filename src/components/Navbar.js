import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Navbar = () => (
  <nav className="navbar">
    <div className="logo">CHB / SNTT</div>
    <div className="nav-links-container">
      <ul className="nav-links">
        <li><Link to="/">Accueil</Link></li>
        <li><Link to="/products">Produits</Link></li>
        <li><Link to="/solutions">Solutions</Link></li>
        <li><Link to="/#contact">Contact</Link></li>
      </ul>
    </div>
  </nav>
);

export default Navbar;