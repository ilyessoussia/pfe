import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import TrailerForm from "./TrailerForm";
import "./TrailerDetails.css";

const TrailerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trailer, setTrailer] = useState(null);
  const [scheduledMaintenance, setScheduledMaintenance] = useState([]);
  const [completedMaintenance, setCompletedMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: "",
    raw_date: "",
    technicien: "",
    cout: "",
    status: "scheduled",
  });
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  useEffect(() => {
    const fetchTrailerData = async () => {
      try {
        setLoading(true);

        // Fetch trailer
        const { data: trailerData, error: trailerError } = await supabase
          .from('trailers')
          .select('*')
          .eq('id', id)
          .single();

        if (trailerError || !trailerData) {
          setError("Cette remorque n'existe pas dans la base de données.");
          setLoading(false);
          return;
        }

        setTrailer({
          id: trailerData.id,
          vin: trailerData.vin || "Non spécifié",
          immatriculation: trailerData.immatriculation || "Non spécifié",
          dpmc: trailerData.dpmc ? new Date(trailerData.dpmc).toLocaleDateString('fr-FR') : "Non spécifiée",
          ptac: trailerData.ptac ? `${trailerData.ptac} kg` : "Non spécifié",
          axle_reference: trailerData.axle_reference || "Non spécifié",
          last_insurance_date: trailerData.last_insurance_date ? new Date(trailerData.last_insurance_date).toLocaleDateString('fr-FR') : "Non spécifiée",
          insurance_expiry_date: trailerData.insurance_expiry_date ? new Date(trailerData.insurance_expiry_date).toLocaleDateString('fr-FR') : "Non spécifiée",
          last_technical_inspection: trailerData.last_technical_inspection ? new Date(trailerData.last_technical_inspection).toLocaleDateString('fr-FR') : "Non spécifiée",
          next_technical_inspection: trailerData.next_technical_inspection ? new Date(trailerData.next_technical_inspection).toLocaleDateString('fr-FR') : "Non spécifiée",
          description: trailerData.description || "Non spécifié",
          raw: trailerData,
        });

        // Fetch maintenance history
        const { data: maintenanceData, error: maintenanceError } = await supabase
          .from('trailer_maintenance_records')
          .select('*')
          .eq('trailer_id', id)
          .order('raw_date', { ascending: false });

        if (maintenanceError) throw maintenanceError;

        const maintenanceList = maintenanceData.map(record => ({
          id: record.id,
          date: new Date(record.raw_date).toLocaleDateString('fr-FR'),
          rawDate: record.raw_date,
          type: record.type,
          technicien: record.technicien || "Non spécifié",
          cout: record.cout ? `${record.cout} TND` : "Non spécifié",
          status: record.status || "scheduled",
        }));

        console.log("Fetched trailer maintenances:", maintenanceList); // Debug log

        setScheduledMaintenance(maintenanceList.filter(m => m.status === "scheduled"));
        setCompletedMaintenance(maintenanceList.filter(m => m.status === "completed"));
      } catch (err) {
        console.error("Error fetching trailer details:", err);
        setError("Erreur lors du chargement des données de la remorque.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrailerData();
  }, [id]);

  const validateMaintenanceForm = () => {
    const errors = [];
    if (!maintenanceForm.raw_date) errors.push("Date est requise");
    if (!maintenanceForm.type) errors.push("Type de maintenance est requis");
    if (!maintenanceForm.technicien) errors.push("Technicien est requis");
    if (maintenanceForm.cout && parseFloat(maintenanceForm.cout) <= 0) errors.push("Coût doit être un nombre positif");
    return errors.length > 0 ? errors.join("; ") : null;
  };

  const handleMaintenanceInputChange = (e) => {
    const { name, value } = e.target;
    setMaintenanceForm(prev => ({ ...prev, [name]: value }));
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validationError = validateMaintenanceForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      const newMaintenance = {
        trailer_id: id,
        raw_date: maintenanceForm.raw_date,
        type: maintenanceForm.type,
        technicien: maintenanceForm.technicien || null,
        cout: maintenanceForm.cout ? parseFloat(maintenanceForm.cout) : null,
        status: maintenanceForm.status, // Use form status
      };

      console.log("Inserting maintenance:", newMaintenance); // Debug log

      const { data, error } = await supabase
        .from('trailer_maintenance_records')
        .insert([newMaintenance])
        .select();

      if (error) throw error;

      console.log("Inserted maintenance:", data); // Debug log

      setFormSuccess("Maintenance planifiée avec succès!");
      setMaintenanceForm({
        type: "",
        raw_date: "",
        technicien: "",
        cout: "",
        status: "scheduled",
      });

      // Refresh maintenance history
      const { data: maintenanceData, error: fetchError } = await supabase
        .from('trailer_maintenance_records')
        .select('*')
        .eq('trailer_id', id)
        .order('raw_date', { ascending: false });

      if (fetchError) throw fetchError;

      const maintenanceList = maintenanceData.map(record => ({
        id: record.id,
        date: new Date(record.raw_date).toLocaleDateString('fr-FR'),
        rawDate: record.raw_date,
        type: record.type,
        technicien: record.technicien || "Non spécifié",
        cout: record.cout ? `${record.cout} TND` : "Non spécifié",
        status: record.status || "scheduled",
      }));

      console.log("Refreshed trailer maintenances:", maintenanceList); // Debug log

      setScheduledMaintenance(maintenanceList.filter(m => m.status === "scheduled"));
      setCompletedMaintenance(maintenanceList.filter(m => m.status === "completed"));
    } catch (error) {
      console.error("Error planning maintenance:", error);
      setFormError("Erreur lors de la planification de la maintenance.");
    }
  };

  const handleCompleteMaintenance = async (maintenance) => {
    try {
      const { error } = await supabase
        .from('trailer_maintenance_records')
        .update({
          status: "completed",
          created_at: new Date().toISOString(), // Update created_at as a proxy for completed_at
        })
        .eq('id', maintenance.id);

      if (error) throw error;

      const updatedMaintenance = {
        ...maintenance,
        status: "completed",
      };

      setScheduledMaintenance(prev => prev.filter(m => m.id !== maintenance.id));
      setCompletedMaintenance(prev => [updatedMaintenance, ...prev]);
      setShowConfirmComplete(null);
    } catch (error) {
      console.error("Error completing maintenance:", error);
      setError("Erreur lors de la finalisation de la maintenance.");
    }
  };

  if (loading) {
    return (
      <div className="trailer-details-container">
        <aside className="sidebar">
          <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
          <nav>
            <ul>
              <li>
                <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
              </li>
              <li><Link to="/cash-tracking">💵 Gestion de Caisse</Link></li>
              <li>
                <Link to="/parc">🔧 Gestion des Pièces</Link>
              </li>
              <li>
                <Link to="/fleet/stock-carburant">⛽ Stock Carburant</Link>
              </li>
              <li>
                <Link to="/stock">📦 Gestion de Stock</Link>
              </li>
              <li>
                <Link to="/schedule">🗓️ Gestion des Programmes</Link>
              </li>
              <li>
                <Link to="/maintenance">🛠️ Maintenance</Link>
              </li>
              <li className="active">
                <Link to="/trailers">🚛 Gestion des Remorques</Link>
              </li>
              <li>
                <Link to="/incidents">🚨 Gestion des Incidents</Link>
              </li>
              <li>
                <Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link>
              </li>
            </ul>
          </nav>
          <div className="sidebar-footer">
            <p>Version 1.2.0</p>
            <p>© 2025</p>
          </div>
        </aside>
        <main className="trailer-content">
          <p>Chargement des données de la remorque...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trailer-details-container">
        <aside className="sidebar">
          <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
          <nav>
            <ul>
              <li>
                <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
              </li>
              <li><Link to="/cash-tracking">💵 Gestion de Caisse</Link></li>
              <li>
                <Link to="/parc">🔧 Gestion des Pièces</Link>
              </li>
              <li>
                <Link to="/fleet/stock-carburant">⛽ Stock Carburant</Link>
              </li>
              <li>
                <Link to="/stock">📦 Gestion de Stock</Link>
              </li>
              <li>
                <Link to="/schedule">🗓️ Gestion des Programmes</Link>
              </li>
              <li>
                <Link to="/maintenance">🛠️ Maintenance</Link>
              </li>
              <li className="active">
                <Link to="/trailers">🚛 Gestion des Remorques</Link>
              </li>
              <li>
                <Link to="/incidents">🚨 Gestion des Incidents</Link>
              </li>
              <li>
                <Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link>
              </li>
            </ul>
          </nav>
          <div className="sidebar-footer">
            <p>Version 1.2.0</p>
            <p>© 2025</p>
          </div>
        </aside>
        <main className="trailer-content">
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/trailers")} className="back-btn">Retour au tableau de bord</button>
        </main>
      </div>
    );
  }

  return (
    <div className="trailer-details-container">
      <aside className="sidebar">
        <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
            </li>
            <li><Link to="/cash-tracking">💵 Gestion de Caisse</Link></li>
            <li>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li>
              <Link to="/fleet/stock-carburant">⛽ Stock Carburant</Link>
            </li>
            <li>
              <Link to="/stock">📦 Gestion de Stock</Link>
            </li>
            <li>
              <Link to="/schedule">🗓️ Gestion des Programmes</Link>
            </li>
            <li>
              <Link to="/maintenance">🛠️ Maintenance</Link>
            </li>
            <li className="active">
              <Link to="/trailers">🚛 Gestion des Remorques</Link>
            </li>
            <li>
              <Link to="/incidents">🚨 Gestion des Incidents</Link>
            </li>
            <li>
              <Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025</p>
        </div>
      </aside>

      <main className="trailer-content">
        <header>
          <Link to="/trailers" className="back-btn">⬅ Retour</Link>
          <h1>{trailer.immatriculation}</h1>
          <button className="edit-btn" onClick={() => setShowForm(true)}>
            ✏️ Modifier
          </button>
        </header>

        {showForm && (
          <TrailerForm
            trailer={trailer.raw}
            onClose={() => {
              setShowForm(false);
              // Refresh trailer data
              supabase
                .from('trailers')
                .select('*')
                .eq('id', id)
                .single()
                .then(({ data, error }) => {
                  if (!error && data) {
                    setTrailer({
                      id: data.id,
                      vin: data.vin || "Non spécifié",
                      immatriculation: data.immatriculation || "Non spécifié",
                      dpmc: data.dpmc ? new Date(data.dpmc).toLocaleDateString('fr-FR') : "Non spécifiée",
                      ptac: data.ptac ? `${data.ptac} kg` : "Non spécifié",
                      axle_reference: data.axle_reference || "Non spécifié",
                      last_insurance_date: data.last_insurance_date ? new Date(data.last_insurance_date).toLocaleDateString('fr-FR') : "Non spécifiée",
                      insurance_expiry_date: data.insurance_expiry_date ? new Date(data.insurance_expiry_date).toLocaleDateString('fr-FR') : "Non spécifiée",
                      last_technical_inspection: data.last_technical_inspection ? new Date(data.last_technical_inspection).toLocaleDateString('fr-FR') : "Non spécifiée",
                      next_technical_inspection: data.next_technical_inspection ? new Date(data.next_technical_inspection).toLocaleDateString('fr-FR') : "Non spécifiée",
                      description: data.description || "Non spécifié",
                      raw: data,
                    });
                  }
                });
            }}
          />
        )}

        <section className="trailer-info">
          <h2>Informations de la Remorque</h2>
          <div className="info-grid">
            <p><strong>VIN:</strong> {trailer.vin}</p>
            <p><strong>Immatriculation:</strong> {trailer.immatriculation}</p>
            <p><strong>DPMC:</strong> {trailer.dpmc}</p>
            <p><strong>PTAC:</strong> {trailer.ptac}</p>
            <p><strong>Référence d’essieux:</strong> {trailer.axle_reference}</p>
            <p><strong>Dernière Date d'Assurance:</strong> {trailer.last_insurance_date}</p>
            <p><strong>Date d'Expiration de l'Assurance:</strong> {trailer.insurance_expiry_date}</p>
            <p><strong>Dernière Date de Contrôle Technique:</strong> {trailer.last_technical_inspection}</p>
            <p><strong>Prochaine Date de Contrôle Technique:</strong> {trailer.next_technical_inspection}</p>
            <p><strong>Description:</strong> {trailer.description}</p>
          </div>
        </section>

        <section className="maintenance-section">
          <h2>Planification de la Maintenance</h2>
          <form onSubmit={handleMaintenanceSubmit} className="maintenance-form">
            {formError && <div className="error-message">{formError}</div>}
            {formSuccess && <div className="success-message">{formSuccess}</div>}
            <div className="form-group">
              <label>Type:</label>
              <input
                type="text"
                name="type"
                value={maintenanceForm.type}
                onChange={handleMaintenanceInputChange}
                required
                placeholder="ex: Inspection annuelle"
              />
            </div>
            <div className="form-group">
              <label>Date:</label>
              <input
                type="date"
                name="raw_date"
                value={maintenanceForm.raw_date}
                onChange={handleMaintenanceInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Technicien:</label>
              <input
                type="text"
                name="technicien"
                value={maintenanceForm.technicien}
                onChange={handleMaintenanceInputChange}
                required
                placeholder="ex: John Doe"
              />
            </div>
            <div className="form-group">
              <label>Coût (TND):</label>
              <input
                type="number"
                name="cout"
                value={maintenanceForm.cout}
                onChange={handleMaintenanceInputChange}
                min="0"
                step="0.01"
                placeholder="ex: 500"
              />
            </div>
            <div className="form-group">
              <label>Statut:</label>
              <select
                name="status"
                value={maintenanceForm.status}
                onChange={handleMaintenanceInputChange}
              >
                <option value="scheduled">Planifié</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn">Planifier</button>
            </div>
          </form>

          <h2>Maintenances Programmées</h2>
          {scheduledMaintenance.length > 0 ? (
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Technicien</th>
                  <th>Coût</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledMaintenance.map(record => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>{record.type}</td>
                    <td>{record.technicien}</td>
                    <td>{record.cout}</td>
                    <td>{record.status}</td>
                    <td>
                      <button
                        className="complete-btn"
                        onClick={() => setShowConfirmComplete(record.id)}
                        aria-label={`Marquer ${record.type} comme terminé`}
                      >
                        Marquer comme Terminé
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Aucune maintenance programmée.</p>
          )}

          <h2>Historique de Maintenance</h2>
          {completedMaintenance.length > 0 ? (
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Technicien</th>
                  <th>Coût</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {completedMaintenance.map(record => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>{record.type}</td>
                    <td>{record.technicien}</td>
                    <td>{record.cout}</td>
                    <td>{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Aucune maintenance terminée.</p>
          )}
        </section>
      </main>

      {showConfirmComplete && (
        <div className="maintenance-modal-overlay" role="dialog" aria-labelledby="confirm-title">
          <div className="maintenance-modal">
            <div className="modal-header">
              <h3 id="confirm-title">Confirmer la finalisation</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowConfirmComplete(null)}
                aria-label="Fermer la fenêtre de confirmation"
              >
                ×
              </button>
            </div>
            <p>Êtes-vous sûr de vouloir marquer cette maintenance comme terminée ?</p>
            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowConfirmComplete(null)}
                aria-label="Annuler la finalisation"
              >
                Annuler
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={() => handleCompleteMaintenance(scheduledMaintenance.find(m => m.id === showConfirmComplete))}
                aria-label="Confirmer la finalisation"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrailerDetails;