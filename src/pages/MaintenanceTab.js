import React, { useState, useEffect } from "react";
import "./MaintenanceTab.css";
import { supabase } from "../supabase"; // Adjust path to your supabase.js
import { useParams } from "react-router-dom";

const MaintenanceTab = ({ maintenanceHistory: initialMaintenanceHistory = [] }) => {
  const { id } = useParams();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    type: "",
    kilometrage: "",
    technicien: "",
    cout: "",
    status: "scheduled",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState(initialMaintenanceHistory);
  const [loading, setLoading] = useState(true);
  const [scheduledMaintenance, setScheduledMaintenance] = useState([]);
  const [completedMaintenance, setCompletedMaintenance] = useState([]);

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        if (!id) {
          console.error("No truck ID available");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('maintenance_records')
          .select('*')
          .eq('truck_id', id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const maintenanceList = data.map(record => ({
          id: record.id,
          truckId: record.truck_id,
          date: new Date(record.date).toLocaleDateString('fr-FR'),
          type: record.type,
          kilometrage: record.kilometrage.toString(),
          technicien: record.technicien,
          cout: record.cout,
          status: record.status,
          createdAt: record.created_at,
          completedAt: record.completed_at,
        }));

        setMaintenanceData(maintenanceList);
      } catch (error) {
        console.error("Error fetching maintenance data:", error);
        setError("Erreur lors du chargement des données de maintenance");
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceData();
  }, [id]);

  useEffect(() => {
    if (maintenanceData && maintenanceData.length > 0) {
      const scheduled = maintenanceData.filter((m) => m.status === "scheduled");
      const completed = maintenanceData.filter(
        (m) => m.status === "completed" || m.status === "overdue"
      );

      setScheduledMaintenance(scheduled);
      setCompletedMaintenance(completed);
    }
  }, [maintenanceData]);

  useEffect(() => {
    setError(null);
    setSuccess(false);
  }, [showModal]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "cout" ? parseFloat(value) || "" : value,
    });
  };

  const upcomingMaintenance =
    scheduledMaintenance.length > 0
      ? scheduledMaintenance.sort((a, b) => {
          const [aDay, aMonth, aYear] = a.date.split("/").map(Number);
          const [bDay, bMonth, bYear] = b.date.split("/").map(Number);
          return new Date(aYear, aMonth - 1, aDay) - new Date(bYear, bMonth - 1, bDay);
        })[0]
      : null;

  const calculateDaysRemaining = () => {
    if (!upcomingMaintenance || !upcomingMaintenance.date) return "N/A";

    const [day, month, year] = upcomingMaintenance.date.split("/").map(Number);
    const maintenanceDate = new Date(year, month - 1, day);
    const today = new Date();

    const diffTime = maintenanceDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? `${diffDays} jours` : "0 jours";
  };

  const handleCompleteMaintenance = async (maintenance) => {
    try {
      if (!maintenance.id) {
        throw new Error("ID de maintenance non disponible");
      }

      const { error } = await supabase
        .from('maintenance_records')
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq('id', maintenance.id);

      if (error) {
        throw error;
      }

      setMaintenanceData((prev) =>
        prev.map((item) =>
          item.id === maintenance.id
            ? { ...item, status: "completed", completedAt: new Date() }
            : item
        )
      );
    } catch (error) {
      console.error("Error completing maintenance: ", error);
      alert(
        "Erreur lors de la finalisation de la maintenance: " +
          (error.message || "Une erreur s'est produite")
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.date || !formData.type || !formData.kilometrage || !formData.technicien || !formData.cout) {
        throw new Error("Veuillez remplir tous les champs obligatoires");
      }

      const kilometrage = parseFloat(formData.kilometrage.replace(/[^0-9.]/g, '')) || 0;

      if (!id) {
        throw new Error("ID du camion non disponible");
      }

      const { data, error } = await supabase
        .from('maintenance_records')
        .insert([{
          truck_id: id,
          date: formData.date,
          type: formData.type,
          kilometrage: kilometrage,
          technicien: formData.technicien,
          cout: parseFloat(formData.cout) || 0,
          status: formData.status,
        }]);

      if (error) {
        throw error;
      }

      const newMaintenance = {
        id: data[0].id,
        truckId: id,
        date: new Date(formData.date).toLocaleDateString('fr-FR'),
        type: formData.type,
        kilometrage: kilometrage.toString(),
        technicien: formData.technicien,
        cout: parseFloat(formData.cout) || 0,
        status: formData.status,
        createdAt: new Date(),
      };

      setMaintenanceData((prev) => [newMaintenance, ...prev]);
      setSuccess(true);

      setTimeout(() => {
        setShowModal(false);
        setFormData({
          date: "",
          type: "",
          kilometrage: "",
          technicien: "",
          cout: "",
          status: "scheduled",
        });
      }, 1500);
    } catch (error) {
      console.error("Error adding maintenance: ", error);
      setError(error.message || "Une erreur s'est produite lors de l'ajout de la maintenance");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    if (dateString.includes("/")) return dateString;
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  return (
    <div className="maintenance-tab">
      <div className="maintenance-header">
        <h3>Maintenance</h3>
        <p>Historique et planification des interventions de maintenance</p>
        <button className="add-maintenance-btn" onClick={() => setShowModal(true)}>
          <span className="plus-icon">+</span> Programmer une Maintenance
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <p>Chargement des données de maintenance...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>Erreur: {error}</p>
          <button onClick={() => window.location.reload()}>Réessayer</button>
        </div>
      ) : (
        <>
          <div className="maintenance-stats">
            <div className="stat-card">
              <div className="stat-icon">🔧</div>
              <div className="stat-info">
                <h4>Dernier Entretien</h4>
                <p className="stat-value">
                  {completedMaintenance.length > 0
                    ? formatDateForDisplay(
                        completedMaintenance
                          .sort((a, b) =>
                            new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
                          )[0]?.date
                      ) || "N/A"
                    : "N/A"}
                </p>
                <p className="stat-label">
                  {completedMaintenance.length > 0
                    ? completedMaintenance
                        .sort((a, b) =>
                          new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
                        )[0]?.type || "Aucun entretien enregistré"
                    : "Aucun entretien enregistré"}
                </p>
              </div>
            </div>

            <div className="stat-card upcoming">
              <div className="stat-icon">⏰</div>
              <div className="stat-info">
                <h4>Prochain Entretien</h4>
                <p className="stat-value">
                  {upcomingMaintenance ? formatDateForDisplay(upcomingMaintenance.date) : "Aucun"}
                </p>
                <p className="stat-label">
                  {upcomingMaintenance?.type || "Aucun entretien programmé"}
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-info">
                <h4>Temps Restant</h4>
                <p className="stat-value">{calculateDaysRemaining()}</p>
                <p className="stat-label">jusqu'au prochain entretien</p>
              </div>
            </div>
          </div>

          <div className="scheduled-maintenance-section">
            <h3>Maintenances Programmées</h3>
            {scheduledMaintenance.length > 0 ? (
              <div className="scheduled-maintenance-cards">
                {scheduledMaintenance.map((maintenance, index) => (
                  <div className="scheduled-maintenance-card" key={index}>
                    <div className="maintenance-card-header">
                      <h4>{maintenance.type}</h4>
                      <span className="maintenance-date">
                        {formatDateForDisplay(maintenance.date)}
                      </span>
                    </div>
                    <div className="maintenance-card-details">
                      <p>
                        <strong>Kilométrage:</strong> {maintenance.kilometrage}
                      </p>
                      <p>
                        <strong>Technicien:</strong> {maintenance.technicien}
                      </p>
                      <p>
                        <strong>Coût estimé:</strong>{" "}
                        {maintenance.cout?.toFixed(2) || 0} €
                      </p>
                    </div>
                    <div className="maintenance-card-actions">
                      <button
                        className="execute-maintenance-btn"
                        onClick={() => handleCompleteMaintenance(maintenance)}
                      >
                        Marquer comme Terminé
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-scheduled-maintenance">
                <p>Aucune maintenance programmée</p>
                <button
                  className="add-maintenance-btn small"
                  onClick={() => setShowModal(true)}
                >
                  Programmer Maintenance
                </button>
              </div>
            )}
          </div>

          <div className="maintenance-history">
            <h3>Historique des Maintenances</h3>
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Kilométrage</th>
                  <th>Technicien</th>
                  <th>Coût</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {completedMaintenance.length > 0 ? (
                  completedMaintenance
                    .sort((a, b) => {
                      const [aDay, aMonth, aYear] = a.date.split("/").map(Number);
                      const [bDay, bMonth, bYear] = b.date.split("/").map(Number);
                      return (
                        new Date(bYear, bMonth - 1, bDay) -
                        new Date(aYear, aMonth - 1, aDay)
                      );
                    })
                    .map((maintenance, index) => (
                      <tr key={index}>
                        <td>{formatDateForDisplay(maintenance.date)}</td>
                        <td>{maintenance.type}</td>
                        <td>{maintenance.kilometrage}</td>
                        <td>{maintenance.technicien}</td>
                        <td>{maintenance.cout?.toFixed(2) || 0} DT</td>
                        <td>
                          <span className="status completed">Terminé</span>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      Aucun historique de maintenance disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="maintenance-schedule">
            <h3>Calendrier d'Entretien Recommandé</h3>
            <div className="schedule-items">
              <div className="schedule-item">
                <div className="schedule-icon oil">🛢️</div>
                <div className="schedule-info">
                  <h4>Vidange d'huile</h4>
                  <p>Tous les 10,000 km ou 3 mois</p>
                  <button
                    className="quick-schedule-btn"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: "Vidange d'huile",
                        cout: "150",
                      });
                      setShowModal(true);
                    }}
                  >
                    Programmer
                  </button>
                </div>
              </div>

              <div className="schedule-item">
                <div className="schedule-icon tire">🛞</div>
                <div className="schedule-info">
                  <h4>Rotation des pneus</h4>
                  <p>Tous les 15,000 km</p>
                  <button
                    className="quick-schedule-btn"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: "Rotation des pneus",
                        cout: "60",
                      });
                      setShowModal(true);
                    }}
                  >
                    Programmer
                  </button>
                </div>
              </div>

              <div className="schedule-item">
                <div className="schedule-icon check">🔍</div>
                <div className="schedule-info">
                  <h4>Contrôle Technique</h4>
                  <p>Annuel - Exigé par la loi</p>
                  <button
                    className="quick-schedule-btn"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: "Contrôle Technique",
                        cout: "95",
                      });
                      setShowModal(true);
                    }}
                  >
                    Programmer
                  </button>
                </div>
              </div>

              <div className="schedule-item">
                <div className="schedule-icon filter">🔄</div>
                <div className="schedule-info">
                  <h4>Remplacement des filtres</h4>
                  <p>Tous les 20,000 km</p>
                  <button
                    className="quick-schedule-btn"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: "Filtres",
                        cout: "120",
                      });
                      setShowModal(true);
                    }}
                  >
                    Programmer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="maintenance-modal-overlay">
          <div className="maintenance-modal">
            <div className="modal-header">
              <h3>Programmer une Maintenance</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              {success && (
                <div className="success-message">Maintenance ajoutée avec succès !</div>
              )}
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="type">Type de maintenance</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Sélectionner</option>
                  <option value="Vidange d'huile">Vidange d'huile</option>
                  <option value="Rotation des pneus">Rotation des pneus</option>
                  <option value="Remplacement des pneus">Remplacement des pneus</option>
                  <option value="Filtres">Remplacement des filtres</option>
                  <option value="Contrôle Technique">Contrôle Technique</option>
                  <option value="Révision générale">Révision générale</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="kilometrage">Kilométrage estimé</label>
                <input
                  type="text"
                  id="kilometrage"
                  name="kilometrage"
                  value={formData.kilometrage}
                  onChange={handleInputChange}
                  placeholder="ex: 45000"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="technicien">Technicien / Centre Auto</label>
                <input
                  type="text"
                  id="technicien"
                  name="technicien"
                  value={formData.technicien}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="cout">Coût estimé (DT)</label>
                <input
                  type="number"
                  id="cout"
                  name="cout"
                  value={formData.cout}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? "Envoi en cours..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTab;