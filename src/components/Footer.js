import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Footer = () => (
  <footer className="footer" id="contact">
     <div className="footer-map">
      <iframe
        title="Localisation Google Map"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1884.6879407909764!2d10.709514639681124!3d34.79826202287101!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1301d3883bd45f21%3A0x26b7aa337ae2d0ad!2sSoci%C3%A9t%C3%A9%20Ettaysir%20de%20Mat%C3%A9riaux%20de%20Construction!5e1!3m2!1sen!2stn!4v1744734357512!5m2!1sen!2stn"
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen=""
        loading="lazy"
      ></iframe>
    </div>
    <div className="footer-container">
      <div className="footer-section">
        <h3>À Propos de SNTT</h3>
        <p>
          CHB est un fournisseur de confiance de matériaux de construction depuis 1995, spécialisé dans les produits de haute qualité pour des projets durables.
        </p>
      </div>
      <div className="footer-section">
        <h3>Contact</h3>
        <p>Email: contact@sntt.tn</p>
        <p>Téléphone: +216 71 234 567</p>
        <p>Adresse: Route de Tunis, Sfax, Tunisie</p>
      </div>
      <div className="footer-section">
        <h3>Liens Rapides</h3>
        <ul className="footer-links">
          <li><Link to="/">Accueil</Link></li>
          <li><Link to="/products">Produits</Link></li>
          <li><Link to="/solutions">Solutions</Link></li>
          <li><Link to="/fleet">Flotte (Employés)</Link></li>
        </ul>
      </div>
    </div>
   
    <div className="footer-bottom">
      <p>&copy; 2025 CHB / SNTT. Site developpé par Acrecert.</p>
    </div>
  </footer>
);
export default Footer;