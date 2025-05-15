import React, { useState } from "react";
import { supabase } from "../supabase";

const PaymentForm = ({ driver, month, onClose }) => {
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "",
    description: "",
    numero_de_virement: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return "Le montant payé doit être supérieur à 0.";
    }
    if (!formData.payment_method) {
      return "La méthode de paiement est requise.";
    }
    if (!formData.payment_date || isNaN(new Date(formData.payment_date))) {
      return "Veuillez entrer une date valide.";
    }
    return null;
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
      const paymentData = {
        driver_id: driver.id,
        payment_date: formData.payment_date,
        salary_paid: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        description: formData.description || null,
        numero_de_virement: formData.payment_method === "virement_bancaire" ? formData.numero_de_virement || null : null,
        status: "paid",
      };

      const { data: existingPayment, error: fetchError } = await supabase
        .from("driver_payments")
        .select("*")
        .eq("driver_id", driver.id)
        .eq("payment_date", formData.payment_date)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingPayment) {
        const { error: updateError } = await supabase
          .from("driver_payments")
          .update({
            salary_paid: existingPayment.salary_paid + parseFloat(formData.amount),
            payment_method: formData.payment_method,
            description: formData.description || null,
            numero_de_virement: formData.payment_method === "virement_bancaire" ? formData.numero_de_virement || null : null,
            status: "paid",
          })
          .eq("id", existingPayment.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("driver_payments")
          .insert([paymentData]);
        if (insertError) throw insertError;
      }

      setSuccess("Paiement enregistré !");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error saving payment:", err);
      setError(`Échec de l'enregistrement du paiement: ${err.message || "Veuillez réessayer."}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Ajouter Paiement pour {driver.name}</h3>
          <button className="close-modal-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="form-group">
            <label htmlFor="amount">Montant Payé (TND) *</label>
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
            <label htmlFor="payment_date">Date de Paiement *</label>
            <input
              type="date"
              id="payment_date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
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

export default PaymentForm;