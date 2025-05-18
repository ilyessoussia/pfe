import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";


const TrailerForm = ({ trailer, onClose }) => {
  const isEditing = !!trailer;
  const [formData, setFormData] = useState({
    vin: "",
    immatriculation: "",
    dpmc: "",
    ptac: "",
    axle_reference: "",
    last_insurance_date: "",
    insurance_expiry_date: "",
    last_technical_inspection: "",
    next_technical_inspection: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        vin: trailer.vin || "",
        immatriculation: trailer.immatriculation || "",
        dpmc: trailer.dpmc || "",
        ptac: trailer.ptac ? trailer.ptac.toString() : "",
        axle_reference: trailer.axle_reference || "",
        last_insurance_date: trailer.last_insurance_date || "",
        insurance_expiry_date: trailer.insurance_expiry_date || "",
        last_technical_inspection: trailer.last_technical_inspection || "",
        next_technical_inspection: trailer.next_technical_inspection || "",
        description: trailer.description || "",
      });
    }
  }, [trailer, isEditing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "ptac" ? (value === "" ? "" : parseFloat(value) || "") : value,
    }));
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.vin) errors.push("VIN est requis");
    if (!formData.immatriculation) errors.push("Immatriculation est requise");
    if (!formData.dpmc) errors.push("DPMC est requis");
    if (!formData.ptac || formData.ptac <= 0) errors.push("PTAC doit être un nombre positif");
    if (!formData.axle_reference) errors.push("Référence d’essieux est requise");
    return errors.length > 0 ? errors.join("; ") : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      const trailerData = {
        vin: formData.vin,
        immatriculation: formData.immatriculation,
        dpmc: formData.dpmc,
        ptac: parseFloat(formData.ptac),
        axle_reference: formData.axle_reference,
        last_insurance_date: formData.last_insurance_date || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        last_technical_inspection: formData.last_technical_inspection || null,
        next_technical_inspection: formData.next_technical_inspection || null,
        description: formData.description || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('trailers')
          .update(trailerData)
          .eq('id', trailer.id);

        if (error) throw error;

        setSuccess("Remorque modifiée avec succès !");
      } else {
        const { error } = await supabase
          .from('trailers')
          .insert([trailerData]);

        if (error) throw error;

        setSuccess("Remorque ajoutée avec succès !");
      }

      setTimeout(() => {
        setFormData({
          vin: "",
          immatriculation: "",
          dpmc: "",
          ptac: "",
          axle_reference: "",
          last_insurance_date: "",
          insurance_expiry_date: "",
          last_technical_inspection: "",
          next_technical_inspection: "",
          description: "",
        });
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error processing trailer:", error);
      setError(`Erreur: ${error.message || "Une erreur s'est produite"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-labelledby="modal-title">
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="modal-title">{isEditing ? "Modifier la Remorque" : "Ajouter une Remorque"}</h3>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Fermer la fenêtre modale"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="form-group">
            <label htmlFor="vin">VIN *</label>
            <input
              type="text"
              id="vin"
              name="vin"
              value={formData.vin}
              onChange={handleInputChange}
              required
              aria-required="true"
              placeholder="ex: 1HGBH41JXMN109186"
            />
          </div>
          <div className="form-group">
            <label htmlFor="immatriculation">Immatriculation *</label>
            <input
              type="text"
              id="immatriculation"
              name="immatriculation"
              value={formData.immatriculation}
              onChange={handleInputChange}
              required
              aria-required="true"
              placeholder="ex: REM 7722"
            />
          </div>
          <div className="form-group">
            <label htmlFor="dpmc">DPMC (Date de Première Mise en Circulation) *</label>
            <input
              type="date"
              id="dpmc"
              name="dpmc"
              value={formData.dpmc}
              onChange={handleInputChange}
              required
              aria-required="true"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ptac">PTAC (kg) *</label>
            <input
              type="number"
              id="ptac"
              name="ptac"
              value={formData.ptac}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              required
              aria-required="true"
              placeholder="ex: 3500"
            />
          </div>
          <div className="form-group">
            <label htmlFor="axle_reference">Référence d’essieux *</label>
            <input
              type="text"
              id="axle_reference"
              name="axle_reference"
              value={formData.axle_reference}
              onChange={handleInputChange}
              required
              aria-required="true"
              placeholder="ex: BPW ECO Plus"
            />
          </div>
          <div className="form-group">
            <label htmlFor="last_insurance_date">Dernière Date d'Assurance</label>
            <input
              type="date"
              id="last_insurance_date"
              name="last_insurance_date"
              value={formData.last_insurance_date}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="insurance_expiry_date">Date d'Expiration de l'Assurance</label>
            <input
              type="date"
              id="insurance_expiry_date"
              name="insurance_expiry_date"
              value={formData.insurance_expiry_date}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="last_technical_inspection">Dernière Date de Contrôle Technique</label>
            <input
              type="date"
              id="last_technical_inspection"
              name="last_technical_inspection"
              value={formData.last_technical_inspection}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="next_technical_inspection">Prochaine Date de Contrôle Technique</label>
            <input
              type="date"
              id="next_technical_inspection"
              name="next_technical_inspection"
              value={formData.next_technical_inspection}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              placeholder="ex: Remorque frigorifique, état neuf"
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={submitting}
              aria-label="Annuler la saisie"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting}
              aria-label={isEditing ? "Mettre à jour la remorque" : "Enregistrer la remorque"}
            >
              {submitting ? (isEditing ? "Mise à jour..." : "Envoi en cours...") : (isEditing ? "Mettre à jour" : "Enregistrer")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrailerForm;