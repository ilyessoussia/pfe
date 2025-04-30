import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import './TruckForm.css';

const TruckForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    numeroSerie: "",
    immatriculation: "",
    modele: "",
    anneeFabrication: "",
    dateAcquisition: "",
    typeCarburant: "diesel", // Default value
    status: "active", // Default value
    equipements: "",
    accessoires: "",
    chauffeur: "",
    telephoneChauffeur: "",
    residenceChauffeur: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fuelTypes = [
    "diesel",
    "essence",
    "électrique",
    "hybride",
    "GPL",
    "GNV",
    "biodiesel"
  ];

  const statusOptions = [
    "active",
    "inactive"
  ];

  const validateForm = () => {
    const newErrors = {};
    const currentYear = new Date().getFullYear();
    
    // Required fields
    if (!formData.numeroSerie.trim()) {
      newErrors.numeroSerie = "Le numéro de série est requis";
    } else if (!/^[A-Z0-9]{5,17}$/i.test(formData.numeroSerie)) {
      newErrors.numeroSerie = "Le numéro de série doit contenir entre 5 et 17 caractères alphanumériques";
    }

    if (!formData.immatriculation.trim()) {
      newErrors.immatriculation = "L'immatriculation est requise";
    } else if (!/^\d{1,3}\s[A-Z]{2}\s\d{4}$/.test(formData.immatriculation.trim())) {
      newErrors.immatriculation = "Format d'immatriculation invalide (ex: 150 TU 4444)";
    }
    
    if (!formData.modele.trim()) {
      newErrors.modele = "Le modèle est requis";
    }

    // Year validations
    if (!formData.anneeFabrication) {
      newErrors.anneeFabrication = "L'année de fabrication est requise";
    } else {
      const year = parseInt(formData.anneeFabrication);
      if (isNaN(year) || year < 1900 || year > currentYear) {
        newErrors.anneeFabrication = `L'année doit être entre 1900 et ${currentYear}`;
      }
    }

    // Date validations
    if (!formData.dateAcquisition) {
      newErrors.dateAcquisition = "La date d'acquisition est requise";
    }

    // Fuel type validation
    if (!formData.typeCarburant) {
      newErrors.typeCarburant = "Le type de carburant est requis";
    }

    // Status validation
    if (!formData.status) {
      newErrors.status = "L'état du camion est requis";
    }

    // Phone number validation
    if (formData.telephoneChauffeur && !/^\d{8}$/.test(formData.telephoneChauffeur)) {
      newErrors.telephoneChauffeur = "Format de numéro de téléphone invalide (8 chiffres requis)";
    }
    

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear the error for this field when user changes it
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        console.log("Attempting to add truck with data:", formData);
        await addDoc(collection(db, "trucks"), {
          ...formData,
          createdAt: serverTimestamp()
        });
        alert("✅ Camion ajouté avec succès !");
        onClose();
      } catch (error) {
        console.error("Detailed error:", error);
        alert(`❌ Une erreur s'est produite: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "Actif";
      case "maintenance":
        return "En Maintenance";
      case "inactive":
        return "Inactif";
      default:
        return status;
    }
  };

  return (
    <div className="truck-form-container">
      <h2>Ajouter un Nouveau Camion</h2>
      <form className="truck-form" onSubmit={handleSubmit}>
        <div className="truck-field-group">
          <label>Numéro de Série du Véhicule*</label>
          <input 
            name="numeroSerie" 
            value={formData.numeroSerie}
            onChange={handleChange} 
            className={errors.numeroSerie ? "truck-input-error" : ""}
          />
          {errors.numeroSerie && <div className="truck-error-message">{errors.numeroSerie}</div>}
        </div>

        <div className="truck-field-group">
          <label>Immatriculation du Véhicule*</label>
          <input 
            name="immatriculation" 
            value={formData.immatriculation}
            onChange={handleChange} 
            className={errors.immatriculation ? "truck-input-error" : ""}
          />
          {errors.immatriculation && <div className="truck-error-message">{errors.immatriculation}</div>}
        </div>

        <div className="truck-field-group">
          <label>Modèle du Véhicule*</label>
          <input 
            name="modele" 
            value={formData.modele}
            onChange={handleChange} 
            className={errors.modele ? "truck-input-error" : ""}
          />
          {errors.modele && <div className="truck-error-message">{errors.modele}</div>}
        </div>

        <div className="truck-field-group">
          <label>Année de Fabrication du Véhicule*</label>
          <input 
            type="number" 
            name="anneeFabrication" 
            value={formData.anneeFabrication}
            onChange={handleChange} 
            min="1900"
            max={new Date().getFullYear()}
            className={errors.anneeFabrication ? "truck-input-error" : ""}
          />
          {errors.anneeFabrication && <div className="truck-error-message">{errors.anneeFabrication}</div>}
        </div>

        <div className="truck-field-group">
          <label>Date d'Acquisition du Véhicule*</label>
          <input 
            type="date" 
            name="dateAcquisition" 
            value={formData.dateAcquisition}
            onChange={handleChange} 
            className={errors.dateAcquisition ? "truck-input-error" : ""}
          />
          {errors.dateAcquisition && <div className="truck-error-message">{errors.dateAcquisition}</div>}
        </div>

        <div className="truck-field-group">
          <label>Type de Carburant du Véhicule*</label>
          <select 
            name="typeCarburant" 
            value={formData.typeCarburant}
            onChange={handleChange}
            className={errors.typeCarburant ? "truck-input-error" : ""}
          >
            <option value="" disabled>Sélectionnez un type de carburant</option>
            {fuelTypes.map(fuel => (
              <option key={fuel} value={fuel}>
                {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
              </option>
            ))}
          </select>
          {errors.typeCarburant && <div className="truck-error-message">{errors.typeCarburant}</div>}
        </div>

        <div className="truck-field-group">
          <label>État du Camion*</label>
          <select 
            name="status" 
            value={formData.status}
            onChange={handleChange}
            className={errors.status ? "truck-input-error" : ""}
          >
            <option value="" disabled>Sélectionnez un état</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
          {errors.status && <div className="truck-error-message">{errors.status}</div>}
        </div>

        <div className="truck-field-group">
          <label>Équipements Spécifiques</label>
          <textarea 
            name="equipements" 
            value={formData.equipements}
            onChange={handleChange}
            className={errors.equipements ? "truck-input-error" : ""}
          ></textarea>
          {errors.equipements && <div className="truck-error-message">{errors.equipements}</div>}
        </div>

        <div className="truck-field-group">
          <label>Accessoires Additionnels</label>
          <textarea 
            name="accessoires" 
            value={formData.accessoires}
            onChange={handleChange}
            className={errors.accessoires ? "truck-input-error" : ""}
          ></textarea>
          {errors.accessoires && <div className="truck-error-message">{errors.accessoires}</div>}
        </div>

        <div className="truck-field-group">
          <label>Nom du Conducteur Attitré (chauffeur)</label>
          <input 
            name="chauffeur" 
            value={formData.chauffeur}
            onChange={handleChange} 
            className={errors.chauffeur ? "truck-input-error" : ""}
          />
          {errors.chauffeur && <div className="truck-error-message">{errors.chauffeur}</div>}
        </div>

        <div className="truck-field-group">
          <label>Numéro de Téléphone du Chauffeur</label>
          <input 
            name="telephoneChauffeur" 
            value={formData.telephoneChauffeur}
            placeholder="ex: +33612345678"
            onChange={handleChange} 
            className={errors.telephoneChauffeur ? "truck-input-error" : ""}
          />
          {errors.telephoneChauffeur && <div className="truck-error-message">{errors.telephoneChauffeur}</div>}
        </div>

        <div className="truck-field-group">
          <label>Lieu de Résidence du Chauffeur</label>
          <input 
            name="residenceChauffeur" 
            value={formData.residenceChauffeur}
            placeholder="Ville / Adresse"
            onChange={handleChange} 
            className={errors.residenceChauffeur ? "truck-input-error" : ""}
          />
          {errors.residenceChauffeur && <div className="truck-error-message">{errors.residenceChauffeur}</div>}
        </div>

        <div className="truck-form-note">* Champs obligatoires</div>

        <div className="form-buttons">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Ajout en cours..." : "✅ Ajouter"}
          </button>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="cancel-btn">❌ Annuler</button>
        </div>
      </form>
    </div>
  );
};

export default TruckForm;