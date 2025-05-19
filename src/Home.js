import React from "react";
import { Link } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import Chatbot from "./siteweb/Chatbot";
import about1 from "./pictures/about1.jpg";
import about2 from "./pictures/about2.jpg";
import imgcam1 from "./pictures/imagecam2.jpeg"




const AboutUs = () => (
  <section className="about-us" id="presentation">
    <div className="container">
      <h2 className="section-title">À Propos de Nous</h2>
      <div className="about-background" style={{ backgroundImage: `url(${about2})` }}>
        <div className="about-overlay">
          <div className="about-content">
            <p>
              CHB et SNTT forment un partenariat de confiance depuis 1995, spécialisé dans la fourniture de matériaux de construction de haute qualité et des services de transport fiables. CHB excelle dans la livraison de produits haut de gamme pour des projets à grande échelle, tandis que SNTT garantit des solutions de transport rapides et efficaces, assurant durabilité et efficacité dans chaque projet.
            </p>
          </div>
          <img src={about1} alt="Chantier de construction" className="about-secondary-img" />
        </div>
      </div>
      <div className="sntt-section">
        <h3>SNTT : Notre Partenaire en Transport</h3>
        <p>
          SNTT est une entreprise de transport de premier plan, dédiée à la livraison rapide et sécurisée de matériaux de construction. Avec une flotte moderne et une expertise logistique, SNTT soutient les projets de CHB et d'autres clients en offrant des solutions sur mesure pour répondre aux besoins spécifiques de chaque chantier.
        </p>
        <img src={imgcam1} alt="SNTT Transportation" className="sntt-img" />
      </div>
    </div>
  </section>
);

const Mission = () => (
  <section className="mission-section" id="mission">
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
  <section className="values" id="values">
    <div className="container">
      <h2 className="section-title">Nos Valeurs</h2>
      <div className="values-content">
        <div className="value-item">
          <img src="https://via.placeholder.com/60" alt="Quality Icon" className="value-item-img" />
          <h3>Qualité</h3>
          <p>Nous ne faisons jamais de compromis sur la qualité de nos produits et services.</p>
        </div>
        <div className="value-item">
          <img src="https://via.placeholder.com/60" alt="Integrity Icon" className="value-item-img" />
          <h3>Intégrité</h3>
          <p>Nous maintenons les plus hauts standards d'honnêteté et d'éthique dans toutes nos activités.</p>
        </div>
        <div className="value-item">
          <img src="https://via.placeholder.com/60" alt="Sustainability Icon" className="value-item-img" />
          <h3>Durabilité</h3>
          <p>Nous nous engageons à minimiser notre impact environnemental et à promouvoir des pratiques durables.</p>
        </div>
        <div className="value-item">
          <img src="https://via.placeholder.com/60" alt="Customer Service Icon" className="value-item-img" />
          <h3>Service client</h3>
          <p>Nous plaçons la satisfaction de nos clients au cœur de tout ce que nous faisons.</p>
        </div>
      </div>
    </div>
  </section>
);

const Clients = () => (
  <section className="clients-section" id="clients">
    <div className="container">
      <h2 className="section-title">Nos clients</h2>
      <p className="section-text">
        CHB et SNTT sont fiers de collaborer avec un large éventail d'organisations prestigieuses :
      </p>
      <img src="https://via.placeholder.com/600x200" alt="Clients Banner" className="clients-banner-img" />
      <div className="clients-grid">
        <div className="client-category">
          <img src="https://via.placeholder.com/80" alt="Public Sector Icon" className="client-category-img" />
          <h3>Secteur public</h3>
          <ul className="client-list">
            <li>Ministère de l’Équipement et de l’Habitat</li>
            <li>Collectivités locales</li>
            <li>Entreprises publiques de BTP</li>
            <li>Offices nationaux</li>
            <li>Établissements publics de travaux</li>
          </ul>
        </div>
        <div className="client-category">
          <img src="https://via.placeholder.com/80" alt="Private Sector Icon" className="client-category-img" />
          <h3>Secteur privé</h3>
          <ul className="client-list">
            <li>Entreprises de construction</li>
            <li>Promoteurs immobiliers</li>
            <li>Petites et Moyennes Entreprises (PME)</li>
            <li>Industries du bâtiment</li>
            <li>Fournisseurs de matériaux</li>
            <li>Entreprises de logistique et transport</li>
          </ul>
        </div>
        <div className="client-category">
          <img src="https://via.placeholder.com/80" alt="International Partners Icon" className="client-category-img" />
          <h3>Partenaires internationaux</h3>
          <ul className="client-list">
            <li>Entreprises étrangères du secteur BTP</li>
            <li>Importateurs/exportateurs de matériaux</li>
            <li>Partenaires logistiques internationaux</li>
            <li>Organisations de coopération technique</li>
          </ul>
        </div>
        <div className="client-category">
          <img src="https://via.placeholder.com/80" alt="Individual Clients Icon" className="client-category-img" />
          <h3>Clients particuliers</h3>
          <ul className="client-list">
            <li>Auto-constructeurs</li>
            <li>Propriétaires de chantiers privés</li>
            <li>Agriculteurs et exploitants ruraux</li>
            <li>Clients à la recherche de transport personnalisé</li>
          </ul>
        </div>
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
    <Clients />
    <Footer />
    <Chatbot />
  </>
);

export default Home;