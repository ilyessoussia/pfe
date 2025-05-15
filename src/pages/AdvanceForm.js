import React, { useState } from "react";
import { supabase } from "../supabase";

const AdvanceForm = ({ driver, onClose }) => {
  const [formData, setFormData] = useState({
    amount: "",
    advance_date: new Date().toISOString().split("T")[0],
    description: "",
    payment_method: "",
    numero_de_virement: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validate amount
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Veuillez entrer un montant valide.");
      setSubmitting(false);
      return;
    }

    // Validate payment method
    if (!formData.payment_method) {
      setError("La méthode de paiement est requise.");
      setSubmitting(false);
      return;
    }

    // Validate advance_date
    if (!formData.advance_date || isNaN(new Date(formData.advance_date))) {
      setError("Veuillez entrer une date valide.");
      setSubmitting(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from("driver_advances").insert([
        {
          driver_id: driver.id,
          amount: parseFloat(formData.amount),
          advance_date: formData.advance_date,
          description: formData.description || null,
          payment_method: formData.payment_method,
          numero_de_virement: formData.payment_method === "virement_bancaire" ? formData.numero_de_virement || null : null,
        },
      ]);

      if (insertError) throw insertError;

      setSuccess("Avance enregistrée avec succès !");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error recording advance:", err);
      setError(`Échec de l'enregistrement de l'avance: ${err.message || "Veuillez réessayer."}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Enregistrer Avance pour {driver.name}</h3>
          <button className="close-modal-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="form-group">
            <label htmlFor="amount">Montant (TND) *</label>
            <input
              type="number"
              id="amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              step="0.01"
              min="0"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="advance_date">Date *</label>
            <input
              type="date"
              id="advance_date"
              value={formData.advance_date}
              onChange={(e) => setFormData({ ...formData, advance_date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="payment_method">Méthode de Paiement *</label>
            <select
              id="payment_method"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value, numero_de_virement: "" })}
              required
            >
              <option value="">Sélectionner une méthode</option>
              <option value="espèce">Espèce</option>
              <option value="virement_bancaire">Par virement bancaire</option>
            </select>
          </div>
          {formData.payment_method === "virement_bancaire" && (
            <div className="form-group">
              <label htmlFor="numero_de_virement">Numéro de Virement</label>
              <input
                type="text"
                id="numero_de_virement"
                value={formData.numero_de_virement}
                onChange={(e) => setFormData({ ...formData, numero_de_virement: e.target.value })}
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={submitting}>
              Annuler
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvanceForm;