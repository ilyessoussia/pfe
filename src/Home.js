import React from "react";
import { Link } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import Chatbot from "./Chatbot";

import about1 from "./pictures/about1.jpg";
import about2 from "./pictures/about2.jpg";

const AboutUs = () => (
  <section className="about-us" id="presentation">
    <h2 className="section-title">À Propos de Nous</h2>
    <div className="about-background" style={{ backgroundImage: `url(${about2})` }}>
      <div className="about-overlay">
        <div className="about-content">
          <p>
            CHB est un fournisseur de confiance de matériaux de construction de haute qualité depuis 1995.
            Nous sommes spécialisés dans la fourniture de produits haut de gamme pour des projets à grande échelle,
            garantissant durabilité et efficacité dans chaque construction.
          </p>
        </div>
        <img src={about1} alt="Chantier de construction" className="about-secondary-img" />
      </div>
    </div>
  </section>
);

const Mission = () => (
  <section className="mission-section" id="mission">
    <div className="mission-container">
      <div className="mission-text">
        <h2 className="section-title">Notre Mission</h2>
        <h3 className="mission-heading">
          Soutenir vos projets avec
        </h3>
        <p className="mission-description">
          Chez CHB, notre mission est de fournir des matériaux de construction de haute qualité et des services de livraison fiables pour soutenir vos projets.
        </p>
        <ul className="mission-list">
          <li>
            <span className="icon"></span> Matériaux de construction robustes et durables.
          </li>
          <li>
            <span className="icon"></span> Livraisons rapides et efficaces sur site.
          </li>
          <li>
            <span className="icon"></span> Large gamme de produits pour tous vos besoins.
          </li>
          <li>
            <span className="icon"></span> Conseils d'experts pour vos projets.
          </li>
          <li>
            <span className="icon"></span> Solutions de transport adaptées à vos exigences.
          </li>
          <li>
            <span className="icon"></span> Engagement envers la satisfaction client.
          </li>
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
        <Link to="/products" className="cta-button">
          Voir nos produits
        </Link>
      </div>
    </div>
  </section>
);

const Values = () => (
  <section className="values" id="values">
    <h2>Nos Valeurs</h2>
    <div className="values-content">
      <div className="value-item">
        <h3>Qualité</h3>
        <p>Nous ne faisons jamais de compromis sur la qualité de nos produits et services.</p>
      </div>
      <div className="value-item">
        <h3>Intégrité</h3>
        <p>Nous maintenons les plus hauts standards d'honnêteté et d'éthique dans toutes nos activités.</p>
      </div>
      <div className="value-item">
        <h3>Durabilité</h3>
        <p>Nous nous engageons à minimiser notre impact environnemental et à promouvoir des pratiques durables.</p>
      </div>
      <div className="value-item">
        <h3>Service client</h3>
        <p>Nous plaçons la satisfaction de nos clients au cœur de tout ce que nous faisons.</p>
      </div>
    </div>
  </section>
);

const Home = () => (
  <>
    <Navbar />
    <Hero />
    <AboutUs />
    <Mission />
    <Values />
    <Footer />
    <Chatbot />
  </>
);

export default Home;