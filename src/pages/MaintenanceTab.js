import React, { useState, useEffect, useCallback } from "react";
import "./MaintenanceTab.css";
import { supabase } from "../supabase";
import { useParams } from "react-router-dom";

const MaintenanceTab = ({ maintenanceHistory: initialMaintenanceHistory = [], onMaintenanceUpdated }) => {
  const { id } = useParams();
  const [showModal, setShowModal] = useState(false);
  const [editMaintenanceId, setEditMaintenanceId] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    type: "",
    kilometrage: "",
    technicien: "",
    cout: "",
    status: "scheduled",
    nextOilChange: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState(initialMaintenanceHistory);
  const [loading, setLoading] = useState(true);
  const [scheduledMaintenance, setScheduledMaintenance] = useState([]);
  const [completedMaintenance, setCompletedMaintenance] = useState([]);
  const [technicianSuggestions, setTechnicianSuggestions] = useState([]);
  const [showConfirmComplete, setShowConfirmComplete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const today = new Date().toISOString().split("T")[0];

  const fetchMaintenanceData = useCallback(async () => {
    try {
      if (!id) {
        throw new Error("No truck ID available");
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
        rawDate: record.date,
        type: record.type,
        kilometrage: record.kilometrage.toString(),
        technicien: record.technicien,
        cout: record.cout,
        status: record.status,
        createdAt: record.created_at,
        completedAt: record.completed_at,
        nextOilChange: record.next_oil_change?.toString(),
      }));

      setMaintenanceData(maintenanceList);
      setLoading(false);
      if (onMaintenanceUpdated) {
        onMaintenanceUpdated(maintenanceList);
      }
    } catch (error) {
      console.error("Error fetching maintenance data:", error);
      setError("Erreur lors du chargement des données de maintenance");
      setLoading(false);
    }
  }, [id, onMaintenanceUpdated]);

  const fetchTechnicianSuggestions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('technicien')
        .not('technicien', 'is', null);

      if (error) {
        throw error;
      }

      const uniqueTechnicians = [...new Set(data.map(record => record.technicien))];
      setTechnicianSuggestions(uniqueTechnicians);
    } catch (error) {
      console.error("Error fetching technician suggestions:", error);
    }
  }, []);

  useEffect(() => {
    fetchMaintenanceData();
    fetchTechnicianSuggestions();
  }, [fetchMaintenanceData, fetchTechnicianSuggestions]);

  useEffect(() => {
    if (maintenanceData && maintenanceData.length > 0) {
      const scheduled = maintenanceData.filter(m => m.status === "scheduled");
      const completed = maintenanceData.filter(m => m.status === "completed" || m.status === "overdue");
      setScheduledMaintenance(scheduled);
      setCompletedMaintenance(completed);
    } else {
      setScheduledMaintenance([]);
      setCompletedMaintenance([]);
    }
  }, [maintenanceData]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [showModal]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: name === "cout" || name === "kilometrage" || name === "nextOilChange" 
          ? (value === "" ? "" : parseFloat(value) || "") 
          : value,
      };

      // Auto-calculate nextOilChange when type is either oil change option
      if (name === "kilometrage" && value && (prev.type === "Vidange Huile Complet" || prev.type === "Vidange Huile Simple")) {
        const km = parseFloat(value);
        if (!isNaN(km)) {
          newFormData.nextOilChange = (km + 10000).toString();
        }
      } else if (name === "type" && (value === "Vidange Huile Complet" || value === "Vidange Huile Simple")) {
        const km = parseFloat(prev.kilometrage);
        if (!isNaN(km)) {
          newFormData.nextOilChange = (km + 10000).toString();
        }
      } else if (name === "type" && value !== "Vidange Huile Complet" && value !== "Vidange Huile Simple") {
        newFormData.nextOilChange = "";
      }

      return newFormData;
    });
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.date) errors.push("Date est requise");
    else if (new Date(formData.date) < new Date(today)) errors.push("La date ne peut pas être dans le passé");
    if (!formData.type) errors.push("Type de maintenance est requis");
    if (!formData.kilometrage || formData.kilometrage <= 0) errors.push("Kilométrage doit être un nombre positif");
    if (!formData.technicien) errors.push("Technicien est requis");
    if (!formData.cout || formData.cout <= 0) errors.push("Coût doit être un nombre positif");
    return errors.length > 0 ? errors.join("; ") : null;
  };

  const upcomingMaintenance = scheduledMaintenance.length > 0
    ? scheduledMaintenance.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))[0]
    : null;

  const calculateDaysRemaining = () => {
    if (!upcomingMaintenance || !upcomingMaintenance.rawDate) return "N/A";
    const maintenanceDate = new Date(upcomingMaintenance.rawDate);
    const today = new Date();
    const diffTime = maintenanceDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} jours` : "Aujourd'hui";
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

      setMaintenanceData(prev =>
        prev.map(item =>
          item.id === maintenance.id
            ? { ...item, status: "completed", completedAt: new Date() }
            : item
        )
      );
      setShowConfirmComplete(null);
    } catch (error) {
      console.error("Error completing maintenance:", error);
      setError(`Erreur lors de la finalisation de la maintenance: ${error.message}`);
    }
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
      const kilometrage = parseFloat(formData.kilometrage) || 0;
      const updateData = {
        truck_id: id,
        date: formData.date,
        type: formData.type,
        kilometrage: kilometrage,
        technicien: formData.technicien,
        cout: parseFloat(formData.cout) || 0,
        status: formData.status,
        next_oil_change: (formData.type === "Vidange Huile Complet" || formData.type === "Vidange Huile Simple") 
          ? parseFloat(formData.nextOilChange) || null 
          : null,
      };

      let data;
      let error;

      if (editMaintenanceId) {
        ({ data, error } = await supabase
          .from('maintenance_records')
          .update(updateData)
          .eq('id', editMaintenanceId)
          .select());
      } else {
        ({ data, error } = await supabase
          .from('maintenance_records')
          .insert([updateData])
          .select());
      }

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const updatedMaintenance = {
          id: data[0].id,
          truckId: id,
          date: new Date(formData.date).toLocaleDateString('fr-FR'),
          rawDate: formData.date,
          type: formData.type,
          kilometrage: kilometrage.toString(),
          technicien: formData.technicien,
          cout: parseFloat(formData.cout) || 0,
          status: formData.status,
          createdAt: editMaintenanceId ? data[0].created_at : new Date(),
          completedAt: data[0].completed_at,
          nextOilChange: updateData.next_oil_change?.toString(),
        };

        setMaintenanceData(prev => {
          if (editMaintenanceId) {
            return prev.map(item => (item.id === editMaintenanceId ? updatedMaintenance : item));
          }
          return [updatedMaintenance, ...prev];
        });
      }

      setSuccess(editMaintenanceId ? "Maintenance mise à jour avec succès !" : "Maintenance ajoutée avec succès !");
      setTimeout(() => {
        setShowModal(false);
        setEditMaintenanceId(null);
        setFormData({
          date: "",
          type: "",
          kilometrage: "",
          technicien: "",
          cout: "",
          status: "scheduled",
          nextOilChange: "",
        });
        fetchTechnicianSuggestions();
      }, 3000);
    } catch (error) {
      console.error(`Error ${editMaintenanceId ? "updating" : "adding"} maintenance:`, error);
      setError(`Erreur: ${error.message || "Une erreur s'est produite"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMaintenance = (maintenance) => {
    setEditMaintenanceId(maintenance.id);
    setFormData({
      date: maintenance.rawDate,
      type: maintenance.type,
      kilometrage: maintenance.kilometrage,
      technicien: maintenance.technicien,
      cout: maintenance.cout.toString(),
      status: maintenance.status,
      nextOilChange: maintenance.nextOilChange || "",
    });
    setShowModal(true);
  };

  const handleDeleteMaintenance = async (maintenanceId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette maintenance ?")) return;

    try {
      const { error } = await supabase
        .from('maintenance_records')
        .delete()
        .eq('id', maintenanceId);

      if (error) {
        throw error;
      }

      setMaintenanceData(prev => prev.filter(item => item.id !== maintenanceId));
      setSuccess("Maintenance supprimée avec succès !");
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      setError(`Erreur lors de la suppression: ${error.message}`);
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

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = completedMaintenance.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(completedMaintenance.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="maintenance-tab">
      <div className="maintenance-header">
        <h3>Maintenance</h3>
        <p>Historique et planification des interventions de maintenance</p>
        <button
          className="add-maintenance-btn"
          onClick={() => {
            setEditMaintenanceId(null);
            setFormData({
              date: "",
              type: "",
              kilometrage: "",
              technicien: "",
              cout: "",
              status: "scheduled",
              nextOilChange: "",
            });
            setShowModal(true);
          }}
          aria-label="Programmer une nouvelle maintenance"
        >
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
          <button onClick={fetchMaintenanceData} aria-label="Réessayer le chargement des données">Réessayer</button>
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
                          .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))[0]?.date
                      ) || "N/A"
                    : "N/A"}
                </p>
                <p className="stat-label">
                  {completedMaintenance.length > 0
                    ? completedMaintenance
                        .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))[0]?.type || "Aucun entretien enregistré"
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
                      <span className="maintenance-date">{formatDateForDisplay(maintenance.date)}</span>
                    </div>
                    <div className="maintenance-card-details">
                      <p><strong>Kilométrage:</strong> {maintenance.kilometrage} km</p>
                      <p><strong>Technicien:</strong> {maintenance.technicien}</p>
                      <p><strong>Coût estimé:</strong> {maintenance.cout?.toFixed(2) || 0} DT</p>
                      {maintenance.nextOilChange && (
                        <p><strong>Prochaine Vidange Huile:</strong> {maintenance.nextOilChange} km</p>
                      )}
                    </div>
                    <div className="maintenance-card-actions">
                      <button
                        className="execute-maintenance-btn"
                        onClick={() => setShowConfirmComplete(maintenance.id)}
                        aria-label={`Marquer ${maintenance.type} comme terminé`}
                      >
                        Marquer comme Terminé
                      </button>
                      <button
                        className="edit-maintenance-btn"
                        onClick={() => handleEditMaintenance(maintenance)}
                        aria-label={`Modifier ${maintenance.type}`}
                      >
                        Modifier
                      </button>
                      <button
                        className="delete-maintenance-btn"
                        onClick={() => handleDeleteMaintenance(maintenance.id)}
                        aria-label={`Supprimer ${maintenance.type}`}
                      >
                        Supprimer
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
                  aria-label="Programmer une nouvelle maintenance"
                >
                  Programmer Maintenance
                </button>
              </div>
            )}
          </div>

          <div className="maintenance-schedule">
            <h3>Calendrier d'Entretien Recommandé</h3>
            <div className="schedule-items">
              <div className="schedule-item">
                <div className="schedule-icon oil">🛢️</div>
                <div className="schedule-info">
                  <h4>Vidange Huile Complet</h4>
                  <p>Tous les 10,000 km ou 3 mois</p>
                  <button
                    className="quick-schedule-btn"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: "Vidange Huile Complet",
                        cout: "",
                      });
                      setShowModal(true);
                    }}
                    aria-label="Programmer une vidange huile complet"
                  >
                    Programmer
                  </button>
                </div>
              </div>
              <div className="schedule-item">
                <div className="schedule-icon oil">🛢️</div>
                <div className="schedule-info">
                  <h4>Vidange Huile Simple</h4>
                  <p>Tous les 10,000 km ou 3 mois</p>
                  <button
                    className="quick-schedule-btn"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: "Vidange Huile Simple",
                        cout: "",
                      });
                      setShowModal(true);
                    }}
                    aria-label="Programmer une vidange huile simple"
                  >
                    Programmer
                  </button>
                </div>
              </div>
              <div className="schedule-item">
                <div className="schedule-icon tire">🚗</div>
                <div className="schedule-info">
                  <h4>Rotation des pneus</h4>
                  <p>Tous les 15,000 km</p>
                  <button
                    className="quick-schedule-btn"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        type: "Rotation des pneus",
                        cout: "",
                      });
                      setShowModal(true);
                    }}
                    aria-label="Programmer une rotation des pneus"
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
                        cout: "",
                      });
                      setShowModal(true);
                    }}
                    aria-label="Programmer un contrôle technique"
                  >
                    Programmer
                  </button>
                </div>
              </div>
            </div>
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
                  <th>Prochaine Vidange</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords
                    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
                    .map((maintenance, index) => (
                      <tr key={index}>
                        <td>{formatDateForDisplay(maintenance.date)}</td>
                        <td>{maintenance.type}</td>
                        <td>{maintenance.kilometrage} km</td>
                        <td>{maintenance.technicien}</td>
                        <td>{maintenance.cout?.toFixed(2) || 0} DT</td>
                        <td>{maintenance.nextOilChange ? `${maintenance.nextOilChange} km` : "N/A"}</td>
                        <td>
                          <span className="status completed">Terminé</span>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      Aucun historique de maintenance disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => paginate(i + 1)}
                    className={currentPage === i + 1 ? "active" : ""}
                    aria-label={`Page ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="maintenance-modal-overlay" role="dialog" aria-labelledby="modal-title">
          <div className="maintenance-modal">
            <div className="modal-header">
              <h3 id="modal-title">{editMaintenanceId ? "Modifier la Maintenance" : "Programmer une Maintenance"}</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => {
                  setShowModal(false);
                  setEditMaintenanceId(null);
                }}
                aria-label="Fermer la fenêtre modale"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={today}
                  required
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="type">Type de maintenance *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                >
                  <option value="">Sélectionner</option>
                  <option value="Vidange Huile Complet">Vidange Huile Complet</option>
                  <option value="Vidange Huile Simple">Vidange Huile Simple</option>
                  <option value="Rotation des pneus">Rotation des pneus</option>
                  <option value="Remplacement des pneus">Remplacement des pneus</option>
                  <option value="Remplacement des filtres">Remplacement des filtres</option>
                  <option value="Contrôle Technique">Contrôle Technique</option>
                  <option value="Révision générale">Révision générale</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="kilometrage">Kilométrage Actuel (km) *</label>
                <input
                  type="number"
                  id="kilometrage"
                  name="kilometrage"
                  value={formData.kilometrage}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  required
                  aria-required="true"
                  placeholder="ex: 45000"
                />
              </div>
              {(formData.type === "Vidange Huile Complet" || formData.type === "Vidange Huile Simple") && (
                <div className="form-group">
                  <label htmlFor="nextOilChange">Prochaine Vidange Huile (km)</label>
                  <input
                    type="number"
                    id="nextOilChange"
                    name="nextOilChange"
                    value={formData.nextOilChange}
                    onChange={handleInputChange}
                    min="0"
                    step="1"
                    placeholder="ex: 55000"
                  />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="technicien">Technicien / Centre Auto *</label>
                <input
                  type="text"
                  id="technicien"
                  name="technicien"
                  value={formData.technicien}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                  list="technician-suggestions"
                  placeholder="ex: Auto Service Tunis"
                />
                <datalist id="technician-suggestions">
                  {technicianSuggestions.map((tech, index) => (
                    <option key={index} value={tech} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label htmlFor="cout">Coût estimé (DT) *</label>
                <input
                  type="number"
                  id="cout"
                  name="cout"
                  value={formData.cout}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                  aria-required="true"
                  placeholder="ex: 150.00"
                />
              </div>
              <div className="form-group">
                <label htmlFor="status">Statut *</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                >
                  <option value="scheduled">Programmé</option>
                  <option value="completed">Terminé</option>
                  <option value="overdue">En retard</option>
                </select>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    setEditMaintenanceId(null);
                  }}
                  disabled={submitting}
                  aria-label="Annuler la saisie"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                  aria-label={editMaintenanceId ? "Mettre à jour la maintenance" : "Enregistrer la maintenance"}
                >
                  {submitting ? "Envoi en cours..." : editMaintenanceId ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default MaintenanceTab;