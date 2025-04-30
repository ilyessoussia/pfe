import React, { useState, useEffect } from "react";
import "./MaintenanceTab.css";
import { db } from "../firebase"; // Import db from your firebase file
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { useParams } from "react-router-dom"; // Import useParams

const MaintenanceTab = ({ maintenanceHistory: initialMaintenanceHistory = [] }) => {
  // Get truck ID from URL params
  const { id } = useParams();
  
  // State for modal visibility
  const [showModal, setShowModal] = useState(false);
  
  // State for form inputs
  const [formData, setFormData] = useState({
    date: "",
    type: "",
    kilometrage: "",
    technicien: "",
    cout: "",
    status: "scheduled"
  });

  // State for form submission status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // State to store maintenance data fetched from Firestore
  const [maintenanceData, setMaintenanceData] = useState(initialMaintenanceHistory);
  const [loading, setLoading] = useState(true);
  
  // State for managing scheduled maintenance items
  const [scheduledMaintenance, setScheduledMaintenance] = useState([]);
  const [completedMaintenance, setCompletedMaintenance] = useState([]);
  
  // Fetch maintenance data from Firestore when component mounts
  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        if (!id) {
          console.error("No truck ID available");
          setLoading(false);
          return;
        }
        
        // Modified query - removed orderBy to avoid needing a composite index
        const maintenanceQuery = query(
          collection(db, "maintenances"),
          where("truckId", "==", id)
        );
        
        const querySnapshot = await getDocs(maintenanceQuery);
        const maintenanceList = [];
        
        querySnapshot.forEach((doc) => {
          maintenanceList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sort the data after fetching (client-side) instead of in the query
        maintenanceList.sort((a, b) => {
          // Check if createdAt exists and is a Timestamp
          if (a.createdAt && b.createdAt) {
            if (typeof a.createdAt.toDate === 'function' && typeof b.createdAt.toDate === 'function') {
              return b.createdAt.toDate() - a.createdAt.toDate(); // newest first
            }
          }
          return 0; // if no valid dates, maintain order
        });
        
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
  
  // Filter maintenance history into scheduled and completed
  useEffect(() => {
    if (maintenanceData && maintenanceData.length > 0) {
      const scheduled = maintenanceData.filter(m => m.status === "scheduled");
      const completed = maintenanceData.filter(m => m.status === "completed" || m.status === "overdue");
      
      setScheduledMaintenance(scheduled);
      setCompletedMaintenance(completed);
    }
  }, [maintenanceData]);

  // Reset success and error messages when modal opens/closes
  useEffect(() => {
    setError(null);
    setSuccess(false);
  }, [showModal]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "cout" ? parseFloat(value) || "" : value
    });
  };

  // Calculate upcoming maintenance
  const upcomingMaintenance = scheduledMaintenance.length > 0 
    ? scheduledMaintenance.sort((a, b) => {
        // Convert DD/MM/YYYY to Date objects for comparison
        const [aDay, aMonth, aYear] = a.date.split('/').map(Number);
        const [bDay, bMonth, bYear] = b.date.split('/').map(Number);
        return new Date(aYear, aMonth - 1, aDay) - new Date(bYear, bMonth - 1, bDay);
      })[0]
    : null;
  
  // Calculate days remaining until next maintenance
  const calculateDaysRemaining = () => {
    if (!upcomingMaintenance || !upcomingMaintenance.date) return "N/A";
    
    // Parse the date (assuming format is DD/MM/YYYY)
    const [day, month, year] = upcomingMaintenance.date.split('/').map(Number);
    const maintenanceDate = new Date(year, month - 1, day); // month is 0-indexed in JS
    const today = new Date();
    
    const diffTime = maintenanceDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? `${diffDays} jours` : "0 jours";
  };

  // Handle marking maintenance as completed
  const handleCompleteMaintenance = async (maintenance) => {
    try {
      if (!maintenance.id) {
        throw new Error("ID de maintenance non disponible");
      }
      
      // Update the document in Firestore
      await updateDoc(doc(db, "maintenances", maintenance.id), {
        status: "completed",
        completedAt: Timestamp.now()
      });
      
      // Update local state by updating the maintenanceData array
      setMaintenanceData(prev => 
        prev.map(item => 
          item.id === maintenance.id 
            ? { ...item, status: "completed", completedAt: Timestamp.now() } 
            : item
        )
      );
      
    } catch (error) {
      console.error("Error completing maintenance: ", error);
      alert("Erreur lors de la finalisation de la maintenance: " + (error.message || "Une erreur s'est produite"));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validate inputs
      if (!formData.date || !formData.type || !formData.kilometrage || !formData.technicien) {
        throw new Error("Veuillez remplir tous les champs obligatoires");
      }
      
      // Format date to DD/MM/YYYY if needed
      let formattedDate = formData.date;
      if (formData.date && formData.date.includes("-")) {
        const [year, month, day] = formData.date.split("-");
        formattedDate = `${day}/${month}/${year}`;
      }
      
      // Verify id is available
      if (!id) {
        throw new Error("ID du camion non disponible");
      }
      
      // Prepare maintenance data
      const maintenanceData = {
        truckId: id,
        date: formattedDate,
        type: formData.type,
        kilometrage: formData.kilometrage,
        technicien: formData.technicien,
        cout: parseFloat(formData.cout) || 0,
        status: formData.status,
        createdAt: Timestamp.now()
      };
      
      // Add document to Firestore
      const docRef = await addDoc(collection(db, "maintenances"), maintenanceData);
      
      console.log("Document written with ID: ", docRef.id);
      
      // Update local state
      const newMaintenance = { ...maintenanceData, id: docRef.id };
      setMaintenanceData(prev => [newMaintenance, ...prev]);
      
      // Set success state
      setSuccess(true);
      
      // Close modal and reset form after a short delay
      setTimeout(() => {
        setShowModal(false);
        setFormData({
          date: "",
          type: "",
          kilometrage: "",
          technicien: "",
          cout: "",
          status: "scheduled"
        });
      }, 1500);
      
    } catch (error) {
      console.error("Error adding maintenance: ", error);
      setError(error.message || "Une erreur s'est produite lors de l'ajout de la maintenance");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for better display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    
    // If it's already in DD/MM/YYYY format, return as is
    if (dateString.includes('/')) return dateString;
    
    // If it's in YYYY-MM-DD format, convert it
    if (dateString.includes('-')) {
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
                    ? completedMaintenance.sort((a, b) => 
                        new Date(b.completedAt?.toDate?.() || 0) - new Date(a.completedAt?.toDate?.() || 0)
                      )[0]?.date || "N/A"
                    : "N/A"
                  }
                </p>
                <p className="stat-label">
                  {completedMaintenance.length > 0 
                    ? completedMaintenance.sort((a, b) => 
                        new Date(b.completedAt?.toDate?.() || 0) - new Date(a.completedAt?.toDate?.() || 0)
                      )[0]?.type || "Aucun entretien enregistré"
                    : "Aucun entretien enregistré"
                  }
                </p>
              </div>
            </div>

            <div className="stat-card upcoming">
              <div className="stat-icon">⏰</div>
              <div className="stat-info">
                <h4>Prochain Entretien</h4>
                <p className="stat-value">
                  {upcomingMaintenance?.date || "Aucun"}
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
          
          {/* Scheduled Maintenance Section */}
          <div className="scheduled-maintenance-section">
            <h3>Maintenances Programmées</h3>
            {scheduledMaintenance.length > 0 ? (
              <div className="scheduled-maintenance-cards">
                {scheduledMaintenance.map((maintenance, index) => (
                  <div className="scheduled-maintenance-card" key={index}>
                    <div className="maintenance-card-header">
                      <h4>{maintenance.type}</h4>
                      <span className="maintenance-date">{maintenance.date}</span>
                    </div>
                    <div className="maintenance-card-details">
                      <p><strong>Kilométrage:</strong> {maintenance.kilometrage}</p>
                      <p><strong>Technicien:</strong> {maintenance.technicien}</p>
                      <p><strong>Coût estimé:</strong> {maintenance.cout?.toFixed(2) || 0} €</p>
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
                <button className="add-maintenance-btn small" onClick={() => setShowModal(true)}>
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
                      // Convert DD/MM/YYYY to Date objects for comparison (most recent first)
                      const [aDay, aMonth, aYear] = a.date.split('/').map(Number);
                      const [bDay, bMonth, bYear] = b.date.split('/').map(Number);
                      return new Date(bYear, bMonth - 1, bDay) - new Date(aYear, aMonth - 1, aDay);
                    })
                    .map((maintenance, index) => (
                      <tr key={index}>
                        <td>{maintenance.date}</td>
                        <td>{maintenance.type}</td>
                        <td>{maintenance.kilometrage}</td>
                        <td>{maintenance.technicien}</td>
                        <td>{maintenance.cout?.toFixed(2) || 0} €</td>
                        <td>
                          <span className="status completed">Terminé</span>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">Aucun historique de maintenance disponible</td>
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
                        cout: "150"
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
                        cout: "60"
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
                        cout: "95"
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
                        cout: "120"
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
      
      {/* Modal for adding maintenance */}
      {showModal && (
        <div className="maintenance-modal-overlay">
          <div className="maintenance-modal">
            <div className="modal-header">
              <h3>Programmer une Maintenance</h3>
              <button type="button" className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              {success && (
                <div className="success-message">
                  Maintenance ajoutée avec succès!
                </div>
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
                  placeholder="ex: 45,000 km" 
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
                <label htmlFor="cout">Coût estimé (€)</label>
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
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={submitting}
                >
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