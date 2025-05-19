import React from 'react';
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import './Solutions.css';
import '../App.css';
import camion1 from "../pictures/PLATEAU.png";
import camion2 from "../pictures/SEMI-GRUE.png";
import camion3 from "../pictures/iveco-s-way.png";
import camion4 from "../pictures/fourchette.png";

const Solutions = () => (
  <>
    <Navbar />
    <Hero />
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
                src={camion1}
                alt="Transport de Matériaux de Construction"
                className="solution-image"
              />
            </li>
            <li>
              <h4>Transport Spécial</h4>
              <p>Solutions pour charges surdimensionnées et équipements lourds avec véhicules spécialement équipés.</p>
              <img
                src={camion2}
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
                src={camion3}
                alt="Location de Camions"
                className="solution-image"
              />
            </li>
            <li>
              <h4>Location d'Équipements</h4>
              <p>Location de grues, chariots élévateurs et autres équipements de manutention.</p>
              <img
                src={camion4}
                alt="Location d'Équipements"
                className="solution-image"
              />
            </li>
          </ul>
        </div>
      </div>
    </section>
    <Footer />
  </>
);

export default Solutions;