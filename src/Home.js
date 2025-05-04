import React, { useState } from "react";
import "./App.css";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, FreeMode } from "swiper/modules";
import ProductDetail from "./ProductDetail"; 
import Chatbot from "./Chatbot";

import back1 from "./pictures/back1.png";

import about1 from "./pictures/about1.jpg";
import about2 from "./pictures/about2.jpg";

import product1 from "./pictures/ciment.png";
import product2 from "./pictures/brique-12.png";
import product3 from "./pictures/brique-8.png";
import product4 from "./pictures/brique-platriere.png";
import product5 from "./pictures/ecocol100d.png";
import product6 from "./pictures/pro-200-le.png";

import camion1 from "./pictures/PLATEAU.png";
import camion2 from "./pictures/SEMI-GRUE.png";
import camion3 from "./pictures/iveco-s-way.png";
import camion4 from "./pictures/fourchette.png";


const Navbar = () => (
  <nav className="navbar">
    <div className="logo">CHB</div>
    <div className="nav-links-container">
      <ul className="nav-links">
        <li><a href="/">Accueil</a></li>
        <li><a href="#presentation">Présentation</a></li>
        <li><a href="#products">Produits</a></li>
        <li><a href="#solutions">Solutions</a></li>
        <li><a href="#values">Valeurs</a></li>
        <li><a href="#mission">Mission</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </div>
  </nav>
);

const Hero = () => (
  <header className="hero">
    <div className="hero-container">
      <img src={back1} alt="Website Banner" className="hero-image" />
    </div>
  </header>
);



const AboutUs = () => (
  <section className="about-us" id="presentation">
    <h2 className="section-title" >À Propos de Nous</h2>
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

const products = [
  { id: 1, name: "Sacs de Ciment", image: product1 },
  { id: 2, name: "Briques-12", image: product2 },
  { id: 3, name: "Briques-8", image: product3 },
  { id: 4, name: "Briques-plateriere", image: product4 },
  { id: 5, name: "Colle pro 100", image: product5 },
  { id: 6, name: "Colle pro 200", image: product6 },
  
];

const ProductCategories = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
  };

  return (
     <section className="product-categories" id="products">
      <h2>Catégories de Produits</h2>
      <Swiper
        slidesPerView="auto"
        spaceBetween={15}
        centeredSlides={true}
        freeMode={true}
        navigation
        modules={[FreeMode, Navigation]}
        className="product-swiper"
      >
        {products.map((product) => (
          <SwiperSlide 
            key={product.id} 
            className="product-card"
            onClick={() => handleProductClick(product)}
          >
            <img src={product.image} alt={product.name} className="product-image" />
            <h3 className="product-name">{product.name}</h3>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onClose={closeProductDetail} 
        />
      )}
    </section>
  );
};

const Mission = () => (
<section className="mission-section" id="mission">
  <div className="mission-container">
    {/* Section Texte */}
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
    {/* Section Image et Statistiques */}
    <div className="mission-visuals">
      <div className="mission-images">
        <img
          src="https://www.clarisdesignbuild.com/wp-content/uploads/2023/10/Untitled-1500-%C3%97-800-px-52.jpg" // Replace with relevant image URL
          alt="Construction Materials"
          className="mission-image"
        />
        <img
          src="https://www.mysweetimmo.com/uy7i_73zhnb/uploads/2024/02/Materiaux-de-construction-MySweetimmo66.jpg" // Replace with relevant image URL
          alt="Delivery Truck"
          className="mission-image"
        />
      </div>
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



const SolutionsOffered = () => (
  <section className="solutions-offered" id="solutions">
    <h2>Solutions Offertes</h2>
    <div className="solutions-content">
      <div className="solution-category">
        <h3>Transport par Camions Lourds</h3>
        <ul className="solution-list">
          <li>
            <h4>Transport de Matériaux de Construction</h4>
            <p>Livraison fiable de briques, blocs, poutres et autres matériaux de construction sur les chantiers avec notre flotte de camions plateaux.</p>
            <img
              src={camion1} // Replace with image URL
              alt="Transport de Matériaux de Construction"
              className="solution-image"
            />
          </li>
          <li>
            <h4>Transport Spécial</h4>
            <p>Solutions pour charges surdimensionnées et équipements lourds avec véhicules spécialement équipés.</p>
            <img
              src={camion2} // Replace with image URL
              alt="Transport Spécial"
              className="solution-image"
            />
          </li>
        </ul>
      </div>
      <div className="solution-category">
        <h3>Solutions de Location</h3>
        <ul className="solution-list">
          <li>
            <h4>Location de Camions</h4>
            <p>Options de location à court et long terme pour différents types de camions de transport.</p>
            <img
              src={camion3}// Replace with image URL
              alt="Location de Camions"
              className="solution-image"
            />
          </li>
          <li>
            <h4>Location d'Équipements</h4>
            <p>Location de grues, chariots élévateurs et autres équipements de manutention.</p>
            <img
              src={camion4} // Replace with image URL
              alt="Location d'Équipements"
              className="solution-image"
            />
          </li>
        </ul>
      </div>
    </div>
  </section>
);


const Footer = () => (
  <footer className="footer" id="contact">
    <p>Contenu du Pied de Page</p>
    <div className="footer-links">
      <Link to="/fleet" className="footer-btn">Flotte (Réservé aux employés)</Link>
    </div>
    <div className="map-container">
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
  </footer>
);

const Home = () => (
  <>
    <Navbar />
    <Hero />
    <AboutUs />
    <ProductCategories />
    <SolutionsOffered />
    <Values />
    <Mission />
    <Footer />
    <Chatbot />
  </>
);

export default Home;