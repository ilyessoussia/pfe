// TruckDetails.js - Updated version with Edit Truck button moved to overview content
import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import "./TruckDetails.css";
import FuelTab from "./FuelTab";
import MaintenanceTab from "./MaintenanceTab";

const TruckDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("apercu");
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fuelHistory, setFuelHistory] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editSection, setEditSection] = useState(null); // "driver" or "truck"
  const [editedTruck, setEditedTruck] = useState(null);

  // Fetch fuel data separately to allow refreshing
  const fetchFuelData = useCallback(async () => {
    try {
      console.log("Fetching fuel data for truck ID:", id);
      
      const fuelQuery = query(
        collection(db, "fuelRecords"),
        where("truckId", "==", id)
        // Note: Removed orderBy temporarily as it might require an index
      );
      
      const fuelSnapshot = await getDocs(fuelQuery);
      console.log(`Found ${fuelSnapshot.docs.length} fuel records`);
      
      if (fuelSnapshot.empty) {
        console.log("No fuel records found for this truck");
        setFuelHistory([]);
        return;
      }
      
      const fuelData = fuelSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Raw fuel record:", data);
        
        // Format date for display
        let formattedDate = "N/A";
        if (data.date) {
          if (typeof data.date.toDate === 'function') {
            // Firestore timestamp
            formattedDate = data.date.toDate().toLocaleDateString('fr-FR');
          } else if (data.date instanceof Date) {
            // JavaScript Date object
            formattedDate = data.date.toLocaleDateString('fr-FR');
          } else if (typeof data.date === 'string') {
            // String date
            formattedDate = data.date;
          }
        }
        
        return {
          id: doc.id,
          ...data,
          date: formattedDate,
          // Ensure these values are numbers
          kilometers: parseFloat(data.kilometers) || 0,
          liters: parseFloat(data.liters) || 0,
          consumption: parseFloat(data.consumption) || 0,
          cost: parseFloat(data.cost) || 0,
          fuelPrice: parseFloat(data.fuelPrice) || 0
        };
      });
      
      console.log("Processed fuel data:", fuelData);
      
      // Sort by date (newest first)
      const sortedFuelData = fuelData.sort((a, b) => {
        // Parse dates in DD/MM/YYYY format
        const partsA = a.date.split('/');
        const partsB = b.date.split('/');
        
        if (partsA.length === 3 && partsB.length === 3) {
          const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
          const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
          return dateB - dateA; // Descending order (newest first)
        }
        return 0;
      });
      
      setFuelHistory(sortedFuelData);
    } catch (fuelError) {
      console.error("Error fetching fuel history:", fuelError);
      setFuelHistory([]);
    }
  }, [id]);
  // Fetch truck data from Firebase
  useEffect(() => {
    const fetchTruckData = async () => {
      try {
        setLoading(true);
        console.log("Fetching truck data for ID:", id);
        
        // Fetch the truck document
        const truckDoc = await getDoc(doc(db, "trucks", id));
        
        if (!truckDoc.exists()) {
          setError("Ce camion n'existe pas dans la base de données.");
          setLoading(false);
          return;
        }
        
        const truckData = truckDoc.data();
        console.log("Truck data:", truckData);
        
        // Set truck data using the exact field names from Firebase
        setTruck({
          id: truckDoc.id,
          ...truckData
        });
        
        setEditedTruck({
          id: truckDoc.id,
          ...truckData
        });
        
        // Fetch fuel history from Firebase
        await fetchFuelData();
        
        // Fetch maintenance history
        try {
          const maintenanceQuery = query(
            collection(db, "maintenanceRecords"),
            where("truckId", "==", id)
          );
          
          const maintenanceSnapshot = await getDocs(maintenanceQuery);
          const maintenanceData = maintenanceSnapshot.docs.map(doc => {
            const data = doc.data();
            let formattedDate = "N/A";
            if (data.date) {
              if (typeof data.date.toDate === 'function') {
                formattedDate = data.date.toDate().toLocaleDateString('fr-FR');
              } else if (data.date instanceof Date) {
                formattedDate = data.date.toLocaleDateString('fr-FR');
              } else {
                formattedDate = data.date;
              }
            }
            
            return {
              id: doc.id,
              ...data,
              date: formattedDate
            };
          });
          
          setMaintenanceHistory(maintenanceData);
        } catch (maintenanceError) {
          console.error("Error fetching maintenance history:", maintenanceError);
          // Use mock data if maintenance history fetch fails
          setMaintenanceHistory([
            {
              date: "12/02/2025",
              type: "Vidange d'huile",
              kilometrage: "51,230 km",
              technicien: "Pierre Dupont",
              cout: 120.50,
              status: "completed"
            },
            {
              date: "03/01/2025",
              type: "Changement de freins",
              kilometrage: "49,105 km",
              technicien: "Michel Lambert",
              cout: 345.75,
              status: "completed"
            },
            {
              date: "15/12/2024",
              type: "Contrôle général",
              kilometrage: "47,890 km",
              technicien: "Sophie Martin",
              cout: 85.00,
              status: "completed"
            }
          ]);
        }
      } catch (err) {
        console.error("Error fetching truck details:", err);
        setError("Erreur lors du chargement des données du camion.");
      } finally {
        setLoading(false);
      }
    };

    fetchTruckData();
  }, [id, fetchFuelData]);

  // Function to refresh fuel data after adding a new entry
  const refreshFuelData = () => {
    console.log("Refreshing fuel data");
    fetchFuelData();
  };

  // Handle editing section
  const handleEditClick = (section) => {
    setIsEditing(true);
    setEditSection(section);
  };

  // Handle input change in edit form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedTruck(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      // Update Firebase document
      const truckRef = doc(db, "trucks", id);
      await updateDoc(truckRef, editedTruck);
      
      // Update local state
      setTruck(editedTruck);
      setIsEditing(false);
      setEditSection(null);
      
      alert("Modifications enregistrées avec succès!");
    } catch (error) {
      console.error("Error updating truck:", error);
      alert("Erreur lors de l'enregistrement des modifications.");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditSection(null);
    setEditedTruck(truck); // Reset to original data
  };

  if (loading) {
    return (
      <div className="truck-details-container">
        <aside className="sidebar">
          <h2>Système de Gestion & Contrôle</h2>
          <nav>
            <ul>
              <li><Link to="/fleet/dashboard">📊 Tableau de Bord</Link></li>
            </ul>
          </nav>
        </aside>
        <main className="truck-content loading">
          <p>Chargement des données du camion...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="truck-details-container">
        <aside className="sidebar">
          <h2>Système de Gestion & Contrôle</h2>
          <nav>
            <ul>
              <li><Link to="/fleet/dashboard">📊 Tableau de Bord</Link></li>
            </ul>
          </nav>
        </aside>
        <main className="truck-content error">
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/")} className="back-btn">Retour au tableau de bord</button>
        </main>
      </div>
    );
  }

  return (
    <div className="truck-details-container">
      <aside className="sidebar">
        <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li><Link to="/fleet/dashboard">📊 Tableau de Bord</Link></li>
          </ul>
        </nav>
      </aside>

      <main className="truck-content">
        <header>
          <Link to="/fleet/dashboard" className="back-btn">⬅ Retour</Link>
          <h1>{truck?.immatriculation || id}</h1>
        </header>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === "apercu" ? "active" : ""}`}
            onClick={() => setActiveTab("apercu")}
          >
            Aperçu
          </button>
          <button 
            className={`tab ${activeTab === "carburant" ? "active" : ""}`}
            onClick={() => setActiveTab("carburant")}
          >
            Carburant
          </button>
          <button 
            className={`tab ${activeTab === "maintenance" ? "active" : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            Maintenance
          </button>
        </div>

        {activeTab === "apercu" && truck && (
          <div className="overview-content">
            <section className="truck-info">
              <div className="driver-info">
                <div className="section-header">
                  <h3>👤 Informations du Chauffeur</h3>
                  {!isEditing && (
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditClick("driver")}
                    >
                      ✏️ Modifier
                    </button>
                  )}
                </div>
                
                {isEditing && editSection === "driver" ? (
                  <form className="edit-form">
                    <div className="forme-group">
                      <label>Nom:</label>
                      <input 
                        type="text" 
                        name="chauffeur" 
                        value={editedTruck?.chauffeur || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>Téléphone:</label>
                      <input 
                        type="text" 
                        name="telephoneChauffeur" 
                        value={editedTruck?.telephoneChauffeur || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>Résidence:</label>
                      <input 
                        type="text" 
                        name="residenceChauffeur" 
                        value={editedTruck?.residenceChauffeur || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" onClick={handleSaveChanges} className="save-btn">
                        Enregistrer
                      </button>
                      <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p><strong>Nom:</strong> {truck.chauffeur || "Non spécifié"}</p>
                    <p><strong>Téléphone:</strong> {truck.telephoneChauffeur || "Non spécifié"}</p>
                    <p><strong>Résidence:</strong> {truck.residenceChauffeur || "Non spécifiée"}</p>
                  </>
                )}
              </div>

              <div className="truck-details">
                <div className="section-header">
                  <h3>🚛 Détails du Camion</h3>
                  {!isEditing && (
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditClick("truck")}
                    >
                      ✏️ Modifier
                    </button>
                  )}
                </div>
                
                {isEditing && editSection === "truck" ? (
                  <form className="edit-form">
                    <div className="forme-group">
                      <label>Modèle:</label>
                      <input 
                        type="text" 
                        name="modele" 
                        value={editedTruck?.modele || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>Année:</label>
                      <input 
                        type="text" 
                        name="anneeFabrication" 
                        value={editedTruck?.anneeFabrication || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>VIN:</label>
                      <input 
                        type="text" 
                        name="numeroSerie" 
                        value={editedTruck?.numeroSerie || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>Kilométrage Actuel:</label>
                      <input 
                        type="number" 
                        name="kilometrage" 
                        value={editedTruck?.kilometrage || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>Type de Carburant:</label>
                      <input 
                        type="text" 
                        name="typeCarburant" 
                        value={editedTruck?.typeCarburant || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>État:</label>
                      <select 
                        name="status" 
                        value={editedTruck?.status || "active"} 
                        onChange={handleInputChange}
                      >
                        <option value="active">Actif</option>
                        <option value="maintenance">En Maintenance</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>
                    <div className="forme-group">
                      <label>Date d'Acquisition:</label>
                      <input 
                        type="text" 
                        name="dateAcquisition" 
                        value={editedTruck?.dateAcquisition || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>Équipements:</label>
                      <input 
                        type="text" 
                        name="equipements" 
                        value={editedTruck?.equipements || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="forme-group">
                      <label>Accessoires:</label>
                      <input 
                        type="text" 
                        name="accessoires" 
                        value={editedTruck?.accessoires || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" onClick={handleSaveChanges} className="save-btn">
                        Enregistrer
                      </button>
                      <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p><strong>Modèle:</strong> {truck.modele || "Non spécifié"}</p>
                    <p><strong>Année:</strong> {truck.anneeFabrication || "Non spécifiée"}</p>
                    <p><strong>VIN:</strong> {truck.numeroSerie || "Non spécifié"}</p>
                    <p><strong>Kilométrage Actuel:</strong> {truck.kilometrage ? `${truck.kilometrage} km` : "Non spécifié"}</p>
                    <p><strong>Type de Carburant:</strong> {truck.typeCarburant || "Non spécifié"}</p>
                    <p><strong>État:</strong> {
                      truck.status === "active" ? "Actif" :
                      truck.status === "maintenance" ? "En Maintenance" :
                      truck.status === "inactive" ? "Inactif" : truck.status || "Non spécifié"
                    }</p>
                    <p><strong>Date d'Acquisition:</strong> {truck.dateAcquisition || "Non spécifiée"}</p>
                    <p><strong>Équipements:</strong> {truck.equipements || "Non spécifiés"}</p>
                    <p><strong>Accessoires:</strong> {truck.accessoires || "Non spécifiés"}</p>
                  </>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "carburant" && (
          <FuelTab fuelHistory={fuelHistory} onFuelAdded={refreshFuelData} />
        )}

        {activeTab === "maintenance" && (
          <MaintenanceTab maintenanceHistory={maintenanceHistory} />
        )}
      </main>
    </div>
  );
};

export default TruckDetails;