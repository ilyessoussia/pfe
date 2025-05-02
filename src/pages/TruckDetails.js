import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase"; // Adjust path to your supabase.js
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
  const [editSection, setEditSection] = useState(null);
  const [editedTruck, setEditedTruck] = useState(null);

  const fetchFuelData = useCallback(async () => {
    try {
      console.log("Fetching fuel data for truck ID:", id);
      
      const { data: fuelData, error: fuelError } = await supabase
        .from('fuel_records')
        .select('*')
        .eq('truck_id', id)
        .order('date', { ascending: false }); // Newest first
      
      if (fuelError) {
        throw fuelError;
      }
      
      console.log(`Found ${fuelData.length} fuel records`);
      
      if (!fuelData.length) {
        console.log("No fuel records found for this truck");
        setFuelHistory([]);
        return;
      }
      
      const formattedFuelData = fuelData.map(record => ({
        id: record.id,
        truckId: record.truck_id,
        date: new Date(record.date).toLocaleDateString('fr-FR'),
        kilometers: parseFloat(record.kilometers) || 0,
        liters: parseFloat(record.liters) || 0,
        consumption: parseFloat(record.consumption) || 0,
        cost: parseFloat(record.cost) || 0,
        fuelPrice: parseFloat(record.fuel_price) || 0,
      }));
      
      console.log("Processed fuel data:", formattedFuelData);
      setFuelHistory(formattedFuelData);
    } catch (fuelError) {
      console.error("Error fetching fuel history:", fuelError);
      setFuelHistory([]);
    }
  }, [id]);

  useEffect(() => {
    const fetchTruckData = async () => {
      try {
        setLoading(true);
        console.log("Fetching truck data for ID:", id);
        
        const { data: truckData, error: truckError } = await supabase
          .from('trucks')
          .select('*')
          .eq('id', id)
          .single();
        
        if (truckError || !truckData) {
          setError("Ce camion n'existe pas dans la base de données.");
          setLoading(false);
          return;
        }
        
        console.log("Truck data:", truckData);
        
        setTruck({
          id: truckData.id,
          numeroSerie: truckData.numero_serie,
          immatriculation: truckData.immatriculation,
          modele: truckData.modele,
          anneeFabrication: truckData.annee_fabrication,
          dateAcquisition: truckData.date_acquisition,
          typeCarburant: truckData.type_carburant,
          status: truckData.status,
          equipements: truckData.equipements,
          accessoires: truckData.accessoires,
          chauffeur: truckData.chauffeur,
          telephoneChauffeur: truckData.telephone_chauffeur,
          residenceChauffeur: truckData.residence_chauffeur,
          kilometrage: truckData.kilometrage,
        });
        
        setEditedTruck({
          id: truckData.id,
          numeroSerie: truckData.numero_serie,
          immatriculation: truckData.immatriculation,
          modele: truckData.modele,
          anneeFabrication: truckData.annee_fabrication,
          dateAcquisition: truckData.date_acquisition,
          typeCarburant: truckData.type_carburant,
          status: truckData.status,
          equipements: truckData.equipements,
          accessoires: truckData.accessoires,
          chauffeur: truckData.chauffeur,
          telephoneChauffeur: truckData.telephone_chauffeur,
          residenceChauffeur: truckData.residence_chauffeur,
          kilometrage: truckData.kilometrage,
        });
        
        await fetchFuelData();
        
        try {
          const { data: maintenanceData, error: maintenanceError } = await supabase
            .from('maintenance_records')
            .select('*')
            .eq('truck_id', id)
            .order('date', { ascending: false });
          
          if (maintenanceError) {
            throw maintenanceError;
          }
          
          const formattedMaintenanceData = maintenanceData.map(record => ({
            id: record.id,
            truckId: record.truck_id,
            date: new Date(record.date).toLocaleDateString('fr-FR'),
            type: record.type,
            kilometrage: record.kilometrage,
            technicien: record.technicien,
            cout: record.cout,
            status: record.status,
          }));
          
          setMaintenanceHistory(formattedMaintenanceData);
        } catch (maintenanceError) {
          console.error("Error fetching maintenance history:", maintenanceError);
          setMaintenanceHistory([
            {
              date: "12/02/2025",
              type: "Vidange d'huile",
              kilometrage: 51230,
              technicien: "Pierre Dupont",
              cout: 120.50,
              status: "completed",
            },
            {
              date: "03/01/2025",
              type: "Changement de freins",
              kilometrage: 49105,
              technicien: "Michel Lambert",
              cout: 345.75,
              status: "completed",
            },
            {
              date: "15/12/2024",
              type: "Contrôle général",
              kilometrage: 47890,
              technicien: "Sophie Martin",
              cout: 85.00,
              status: "completed",
            },
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

  const refreshFuelData = () => {
    console.log("Refreshing fuel data");
    fetchFuelData();
  };

  const handleEditClick = (section) => {
    setIsEditing(true);
    setEditSection(section);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedTruck(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveChanges = async () => {
    try {
      const { error } = await supabase
        .from('trucks')
        .update({
          numero_serie: editedTruck.numeroSerie,
          immatriculation: editedTruck.immatriculation,
          modele: editedTruck.modele,
          annee_fabrication: parseInt(editedTruck.anneeFabrication),
          date_acquisition: editedTruck.dateAcquisition,
          type_carburant: editedTruck.typeCarburant,
          status: editedTruck.status,
          equipements: editedTruck.equipements || null,
          accessoires: editedTruck.accessoires || null,
          chauffeur: editedTruck.chauffeur || null,
          telephone_chauffeur: editedTruck.telephoneChauffeur || null,
          residence_chauffeur: editedTruck.residenceChauffeur || null,
          kilometrage: parseFloat(editedTruck.kilometrage) || null,
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setTruck(editedTruck);
      setIsEditing(false);
      setEditSection(null);
      
      alert("Modifications enregistrées avec succès!");
    } catch (error) {
      console.error("Error updating truck:", error);
      alert("Erreur lors de l'enregistrement des modifications.");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditSection(null);
    setEditedTruck(truck);
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
                        type="number" 
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
                        type="date" 
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