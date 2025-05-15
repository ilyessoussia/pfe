import React, { useState } from "react";
import { supabase } from "../supabase";


const DriverForm = ({ trucks, driver, onClose }) => {
  const [name, setName] = useState(driver?.name || "");
  const [truckId, setTruckId] = useState(driver?.truck_id || "");
  const [baseSalary, setBaseSalary] = useState(driver?.base_salary || "");
  const [startDate, setStartDate] = useState(
    driver?.start_date ? new Date(driver.start_date).toISOString().slice(0, 10) : ""
  );
  const [ribBancaire, setRibBancaire] = useState(driver?.rib_bancaire || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const validateForm = () => {
    if (!name.trim()) return "Le nom est requis.";
    if (!baseSalary || baseSalary <= 0) return "Le salaire de base doit être supérieur à 0.";
    if (!startDate) return "La date de début est requise.";
    if (ribBancaire && !/^\d{20}$/.test(ribBancaire)) {
      return "Le RIB bancaire doit contenir exactement 20 chiffres.";
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
      const driverData = {
        name: name.trim(),
        truck_id: truckId || null,
        base_salary: parseFloat(baseSalary),
        start_date: startDate,
        rib_bancaire: ribBancaire || null,
      };

      if (driver) {
        const { error: updateError } = await supabase
          .from("drivers")
          .update(driverData)
          .eq("id", driver.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("drivers").insert([driverData]);
        if (insertError) throw insertError;
      }

      setSuccess(driver ? "Chauffeur mis à jour !" : "Chauffeur ajouté !");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error saving driver:", err);
      setError("Échec de l'enregistrement du chauffeur. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{driver ? "Modifier Chauffeur" : "Ajouter Chauffeur"}</h3>
          <button className="close-modal-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="form-group">
            <label htmlFor="name">Nom *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="truck">Camion</label>
            <select
              id="truck"
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
            >
              <option value="">Aucun</option>
              {trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.immatriculation}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="baseSalary">Salaire de Base (TND) *</label>
            <input
              type="number"
              id="baseSalary"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              step="0.01"
              min="0"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="startDate">Date de Début *</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="ribBancaire">RIB Bancaire (20 chiffres)</label>
            <input
              type="text"
              id="ribBancaire"
              value={ribBancaire}
              onChange={(e) => setRibBancaire(e.target.value)}
              placeholder="12345678901234567890"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={submitting}>
              Annuler
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Enregistrement..." : driver ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverForm;