import React, { useState } from "react";
import { supabase } from "../supabase";
import './TruckForm.css';

const TruckForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    numeroSerie: "",
    immatriculation: "",
    modele: "",
    anneeFabrication: "",
    typeCarburant: "diesel",
    status: "active",
    equipements: "",
    accessoires: "",
    chauffeur: "",
    telephoneChauffeur: "",
    residenceChauffeur: "",
    lastInsuranceDate: "",
    insuranceExpirationDate: "",
    lastTechnicalInspectionDate: "",
    nextTechnicalInspectionDate: "",
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

  const statusOptions = ["active", "inactive"];

  const validateForm = () => {
    const newErrors = {};
    const currentYear = new Date().getFullYear();

    if (formData.numeroSerie && !/^[A-Z0-9]{5,17}$/i.test(formData.numeroSerie)) {
      newErrors.numeroSerie = "Le numéro de série doit contenir entre 5 et 17 caractères alphanumériques";
    }

   

    if (!formData.modele.trim()) {
      newErrors.modele = "Le modèle est requis";
    }

    if (formData.anneeFabrication) {
      const year = parseInt(formData.anneeFabrication);
      if (isNaN(year) || year < 1900 || year > currentYear) {
        newErrors.anneeFabrication = `L'année doit être entre 1900 et ${currentYear}`;
      }
    }

    if (!formData.typeCarburant) {
      newErrors.typeCarburant = "Le type de carburant est requis";
    }

    if (!formData.status) {
      newErrors.status = "L'état du camion est requis";
    }

    if (formData.telephoneChauffeur && !/^\d{8}$/.test(formData.telephoneChauffeur)) {
      newErrors.telephoneChauffeur = "Format de numéro de téléphone invalide (8 chiffres requis)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);
      try {
        console.log("Attempting to add truck with data:", formData);
        const { error } = await supabase
          .from('trucks')
          .insert([{
            numero_serie: formData.numeroSerie || null,
            immatriculation: formData.immatriculation,
            modele: formData.modele,
            annee_fabrication: formData.anneeFabrication ? parseInt(formData.anneeFabrication) : null,
            type_carburant: formData.typeCarburant,
            status: formData.status,
            equipements: formData.equipements || null,
            accessoires: formData.accessoires || null,
            chauffeur: formData.chauffeur || null,
            telephone_chauffeur: formData.telephoneChauffeur || null,
            residence_chauffeur: formData.residenceChauffeur || null,
            last_insurance_date: formData.lastInsuranceDate || null,
            insurance_expiration_date: formData.insuranceExpirationDate || null,
            last_technical_inspection_date: formData.lastTechnicalInspectionDate || null,
            next_technical_inspection_date: formData.nextTechnicalInspectionDate || null,
          }]);

        if (error) {
          throw error;
        }

        alert("✅ Camion ajouté avec succès !");
        onClose();
      } catch (error) {
        console.error("Detailed error:", error);
        alert(`❌ Une erreur s'est produite: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    } else {
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
          <label>Numéro de Série du Véhicule</label>
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
          <label>Année de Fabrication du Véhicule</label>
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
          <label>Dernière Date d'Assurance</label>
          <input 
            type="date" 
            name="lastInsuranceDate" 
            value={formData.lastInsuranceDate}
            onChange={handleChange} 
            className={errors.lastInsuranceDate ? "truck-input-error" : ""}
          />
          {errors.lastInsuranceDate && <div className="truck-error-message">{errors.lastInsuranceDate}</div>}
        </div>

        <div className="truck-field-group">
          <label>Date d'Expiration de l'Assurance</label>
          <input 
            type="date" 
            name="insuranceExpirationDate" 
            value={formData.insuranceExpirationDate}
            onChange={handleChange} 
            className={errors.insuranceExpirationDate ? "truck-input-error" : ""}
          />
          {errors.insuranceExpirationDate && <div className="truck-error-message">{errors.insuranceExpirationDate}</div>}
        </div>

        <div className="truck-field-group">
          <label>Dernière Date de Contrôle Technique</label>
          <input 
            type="date" 
            name="lastTechnicalInspectionDate" 
            value={formData.lastTechnicalInspectionDate}
            onChange={handleChange} 
            className={errors.lastTechnicalInspectionDate ? "truck-input-error" : ""}
          />
          {errors.lastTechnicalInspectionDate && <div className="truck-error-message">{errors.lastTechnicalInspectionDate}</div>}
        </div>

        <div className="truck-field-group">
          <label>Prochaine Date de Contrôle Technique</label>
          <input 
            type="date" 
            name="nextTechnicalInspectionDate" 
            value={formData.nextTechnicalInspectionDate}
            onChange={handleChange} 
            className={errors.nextTechnicalInspectionDate ? "truck-input-error" : ""}
          />
          {errors.nextTechnicalInspectionDate && <div className="truck-error-message">{errors.nextTechnicalInspectionDate}</div>}
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
            placeholder="ex: 0612345678"
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