    import React from "react";
import { Link } from "react-router-dom";
import "../Home.css"; // Reusing the same CSS as Home.js
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import { FaGem, FaHandshake, FaLeaf, FaHeadset } from 'react-icons/fa'; 

const Mission = () => (
    
  <section className="mission-section section" id="mission">
    <div className="container">
      <h2 className="section-title">Notre Mission</h2>
      <div className="mission-container">
        <div className="mission-text">
          <h3 className="mission-heading">Soutenir vos projets avec</h3>
          <p className="mission-description">
            Chez CHB et SNTT, notre mission est de fournir des matériaux de construction de haute qualité et des services de livraison fiables pour soutenir vos projets.
          </p>
          <ul className="mission-list">
            <li>Matériaux de construction robustes et durables.</li>
            <li>Livraisons rapides et efficaces sur site.</li>
            <li>Solutions de transport adaptées à vos exigences.</li>
            <li>Engagement envers la satisfaction client.</li>
          </ul>
        </div>
        <div className="mission-visuals">
          <div className="mission-images">
            <img
              src="https://www.clarisdesignbuild.com/wp-content/uploads/2023/10/Untitled-1500-%C3%97-800-px-52.jpg"
              alt="Construction Materials"
              className="mission-image"
            />
            <img
              src="https://www.mysweetimmo.com/uy7i_73zhnb/uploads/2024/02/Materiaux-de-construction-MySweetimmo66.jpg"
              alt="Delivery Truck"
              className="mission-image"
            />
          </div>
          <Link to="/products" className="cta-button">Voir nos produits</Link>
        </div>
      </div>
    </div>
  </section>
);

const Values = () => (
  <section className="values section" id="values">
    <div className="container">
      <h2 className="section-title">Nos Valeurs</h2>
      <div className="values-content">
        <div className="value-item">
          <FaGem className="value-item-icon" />
          <h3>Qualité</h3>
          <p>Nous ne faisons jamais de compromis sur la qualité de nos produits et services.</p>
        </div>
        <div className="value-item">
          <FaHandshake className="value-item-icon" />
          <h3>Intégrité</h3>
          <p>Nous maintenons les plus hauts standards d'honnêteté et d'éthique dans toutes nos activités.</p>
        </div>
        <div className="value-item">
          <FaLeaf className="value-item-icon" />
          <h3>Durabilité</h3>
          <p>Nous nous engageons à minimiser notre impact environnemental et à promouvoir des pratiques durables.</p>
        </div>
        <div className="value-item">
          <FaHeadset className="value-item-icon" />
          <h3>Service client</h3>
          <p>Nous plaçons la satisfaction de nos clients au cœur de tout ce que nous faisons.</p>
        </div>
      </div>
    </div>
  </section>
);

const MissionValues = () => (
  <main className="mission-values-content">
    <Navbar />
    <Hero />
    <Mission />
    <Values />
    <Footer />
  </main>
);

export default MissionValues;