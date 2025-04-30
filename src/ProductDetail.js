import React from "react";
import "./ProductDetail.css";

const ProductDetail = ({ product, onClose }) => {
  // Sample product details - in a real app, this would come from a database or props
  const productDetails = {
    1: { // Sacs de Ciment
      usine: "CimentTunisie",
      poids: "50kg",
      type: "Ciment Portland",
      résistance: "Très haute"
    },
    2: { // Briques-12
      usine: "BCM",
      poids: "3.5kg",
      type: "Brique rouge",
      résistance: "Haute"
    },
    3: { // Briques-8
      usine: "BCM",
      poids: "2.5kg",
      type: "Brique creuse",
      résistance: "Moyenne"
    },
    4: { // Briques-plateriere
      usine: "Platrix",
      poids: "1.8kg",
      type: "Brique de plâtre",
      résistance: "Standard"
    },
    5: { // Colle pro 100
      usine: "AdhésifTech",
      poids: "25kg/sac",
      type: "Colle céramique",
      résistance: "Haute adhérence"
    },
    6: { // Colle pro 200
      usine: "AdhésifTech",
      poids: "25kg/sac",
      type: "Colle renforcée",
      résistance: "Ultra adhérence"
    }
  };

  const details = productDetails[product.id];

  // Handle click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="product-detail" onClick={handleBackdropClick}>
      <div className="product-detail-content">
        <div className="detail-header">
          <h3>{product.name}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="detail-body">
          <img src={product.image} alt={product.name} className="detail-image" />
          <div className="detail-info">
            <p><strong>Usine:</strong> {details.usine}</p>
            <p><strong>Poids:</strong> {details.poids}</p>
            <p><strong>Type:</strong> {details.type}</p>
            <p><strong>Résistance:</strong> {details.résistance}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;