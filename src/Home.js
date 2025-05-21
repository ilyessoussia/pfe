import React from "react";
import "./Home.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import about1 from "./pictures/about1.jpg";
import about2 from "./pictures/about2.jpg";
import imgcam1 from "./pictures/imagecam2.jpeg";
import imgcam2 from "./pictures/imagecam4.jpeg";

// Icons for Values and Clients sections
import { FaBuilding, FaBriefcase, FaGlobe, FaUser } from 'react-icons/fa';

const AboutUs = () => (
  <section className="about-us section" id="presentation">
    <div className="container">
      <h2 className="section-title">À Propos de Nous</h2>
      <div className="about-background" style={{ backgroundImage: `url(${about2})` }}>
        <div className="about-overlay">
          <div className="about-content">
            <p className="about-paragraph">
              CHB et SNTT forment un partenariat de confiance depuis 2005, spécialisé dans la fourniture de matériaux de construction de haute qualité et des services de transport fiables. CHB excelle dans la livraison de produits haut de gamme pour des projets à grande échelle, tandis que SNTT garantit des solutions de transport rapides et efficaces, assurant durabilité et efficacité dans chaque projet.
            </p>
          </div>
          <img src={about1} alt="Chantier de construction" className="about-secondary-img" />
        </div>
      </div>
      <div className="sntt-section">
        <div className="about-background" style={{ backgroundImage: `url(${imgcam2})` }}>
          <div className="about-overlay">
            <div className="about-content">
              <h3>SNTT : Notre Partenaire en Transport</h3>
              <p className="about-paragraph">
                SNTT est une entreprise de transport de premier plan, dédiée à la livraison rapide et sécurisée de matériaux de construction. Avec une flotte moderne et une expertise logistique, SNTT soutient les projets de CHB et d'autres clients en offrant des solutions sur mesure pour répondre aux besoins spécifiques de chaque chantier.
              </p>
              <img src={imgcam1} alt="SNTT Transportation" className="sntt-img" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);


const Clients = () => (
  <section className="clients-section section" id="clients">
    <div className="container">
      <h2 className="section-title">Nos clients</h2>
      <p className="section-text">
        CHB et SNTT sont fiers de collaborer avec un large éventail d'organisations prestigieuses :
      </p>
      <div className="clients-grid">
        <div className="client-category">
          <FaBuilding className="client-category-icon" />
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
          <FaBriefcase className="client-category-icon" />
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
          <FaGlobe className="client-category-icon" />
          <h3>Partenaires internationaux</h3>
          <ul className="client-list">
            <li>Entreprises étrangères du secteur BTP</li>
            <li>Importateurs/exportateurs de matériaux</li>
            <li>Partenaires logistiques internationaux</li>
            <li>Organisations de coopération technique</li>
          </ul>
        </div>
        <div className="client-category">
          <FaUser className="client-category-icon" />
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
    <main className="home-content">
      <AboutUs />
      <Clients />
      <Footer />
    </main>
  </>
);

export default Home;