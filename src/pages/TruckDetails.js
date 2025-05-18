import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "./TruckDetails.css";
import FuelTab from "./FuelTab";
import FuelHistoryTab from "./FuelHistoryTab";
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
  const [trailers, setTrailers] = useState([]);

  const fetchFuelData = useCallback(async () => {
    try {
      console.log("Fetching fuel data for truck ID:", id);
      
      const { data: fuelData, error: fuelError } = await supabase
        .from('fuel_history')
        .select('*')
        .eq('truck_id', id)
        .order('raw_date', { ascending: false });
      
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
        kilometers: parseFloat(record.kilometers) || 0,
        liters: parseFloat(record.liters) || 0,
        fuelPrice: parseFloat(record.fuel_price) || 0,
        cost: parseFloat(record.cost) || 0,
        rawDate: record.raw_date,
        timestamp: new Date(record.raw_date).getTime(),
        distanceTraveled: parseFloat(record.distance_traveled) || 0,
        consumption: parseFloat(record.consumption) || 0,
        costPerKm: parseFloat(record.cost_per_km) || 0,
        litersPer100km: parseFloat(record.liters_per_100km) || 0,
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
        
        // Fetch truck
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
        
        // Fetch trailer assignment
        let trailer = null;
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('truck_trailer_assignments')
          .select(`
            trailer_id,
            trailers (
              id,
              vin,
              immatriculation,
              dpmc,
              ptac,
              axle_reference,
              last_insurance_date,
              insurance_expiry_date,
              last_technical_inspection,
              next_technical_inspection,
              description
            )
          `)
          .eq('truck_id', id)
          .single();
        
        if (assignmentError && assignmentError.code !== 'PGRST116') {
          console.error("Error fetching trailer assignment:", assignmentError);
        } else if (assignmentData) {
          trailer = {
            id: assignmentData.trailers.id,
            vin: assignmentData.trailers.vin || "Non spécifié",
            immatriculation: assignmentData.trailers.immatriculation || "Non spécifié",
            dpmc: assignmentData.trailers.dpmc || "Non spécifiée",
            ptac: assignmentData.trailers.ptac ? `${assignmentData.trailers.ptac} kg` : "Non spécifié",
            axle_reference: assignmentData.trailers.axle_reference || "Non spécifié",
            last_insurance_date: assignmentData.trailers.last_insurance_date || "Non spécifiée",
            insurance_expiry_date: assignmentData.trailers.insurance_expiry_date || "Non spécifiée",
            last_technical_inspection: assignmentData.trailers.last_technical_inspection || "Non spécifiée",
            next_technical_inspection: assignmentData.trailers.next_technical_inspection || "Non spécifiée",
            description: assignmentData.trailers.description || "Non spécifié",
          };
        }
        
        console.log("Trailer data:", trailer);
        
        // Fetch all trailers
        const { data: trailersData, error: trailersError } = await supabase
          .from('trailers')
          .select('id, vin, immatriculation, dpmc, ptac, axle_reference, last_insurance_date, insurance_expiry_date, last_technical_inspection, next_technical_inspection, description')
          .order('immatriculation', { ascending: true });
        
        if (trailersError) throw trailersError;
        setTrailers(trailersData);
        
        setTruck({
          id: truckData.id,
          numeroSerie: truckData.numero_serie,
          immatriculation: truckData.immatriculation,
          modele: truckData.modele,
          anneeFabrication: truckData.annee_fabrication,
          typeCarburant: truckData.type_carburant,
          status: truckData.status,
          equipements: truckData.equipements,
          accessoires: truckData.accessoires,
          chauffeur: truckData.chauffeur,
          telephoneChauffeur: truckData.telephone_chauffeur,
          residenceChauffeur: truckData.residence_chauffeur,
          kilometrage: truckData.kilometrage,
          lastInsuranceDate: truckData.last_insurance_date,
          insuranceExpirationDate: truckData.insurance_expiration_date,
          lastTechnicalInspectionDate: truckData.last_technical_inspection_date,
          nextTechnicalInspectionDate: truckData.next_technical_inspection_date,
          trailer: trailer,
        });
        
        setEditedTruck({
          id: truckData.id,
          numeroSerie: truckData.numero_serie,
          immatriculation: truckData.immatriculation,
          modele: truckData.modele,
          anneeFabrication: truckData.annee_fabrication,
          typeCarburant: truckData.type_carburant,
          status: truckData.status,
          equipements: truckData.equipements,
          accessoires: truckData.accessoires,
          chauffeur: truckData.chauffeur,
          telephoneChauffeur: truckData.telephone_chauffeur,
          residenceChauffeur: truckData.residence_chauffeur,
          kilometrage: truckData.kilometrage,
          lastInsuranceDate: truckData.last_insurance_date,
          insuranceExpirationDate: truckData.insurance_expiration_date,
          lastTechnicalInspectionDate: truckData.last_technical_inspection_date,
          nextTechnicalInspectionDate: truckData.next_technical_inspection_date,
          trailerId: trailer ? trailer.id : "",
        });
        
        await fetchFuelData();
        
        try {
          const { data: maintenanceData, error: maintenanceError } = await supabase
            .from('maintenance_records')
            .select('*')
            .eq('truck_id', id)
            .order('raw_date', { ascending: false });
          
          if (maintenanceError) {
            throw maintenanceError;
          }
          
          const formattedMaintenanceData = maintenanceData.map(record => ({
            id: record.id,
            truckId: record.truck_id,
            date: new Date(record.raw_date).toLocaleDateString('fr-FR'),
            type: record.type,
            kilometrage: record.kilometrage,
            technicien: record.technicien,
            cout: record.cout,
            status: record.status,
          }));
          
          setMaintenanceHistory(formattedMaintenanceData);
        } catch (maintenanceError) {
          console.error("Error fetching maintenance history:", maintenanceError);
          setMaintenanceHistory([]);
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
      // Update truck details
      const { error: truckError } = await supabase
        .from('trucks')
        .update({
          numero_serie: editedTruck.numeroSerie || null,
          immatriculation: editedTruck.immatriculation,
          modele: editedTruck.modele,
          annee_fabrication: editedTruck.anneeFabrication ? parseInt(editedTruck.anneeFabrication) : null,
          type_carburant: editedTruck.typeCarburant,
          status: editedTruck.status,
          equipements: editedTruck.equipements || null,
          accessoires: editedTruck.accessoires || null,
          chauffeur: editedTruck.chauffeur || null,
          telephone_chauffeur: editedTruck.telephoneChauffeur || null,
          residence_chauffeur: editedTruck.residenceChauffeur || null,
          kilometrage: parseFloat(editedTruck.kilometrage) || null,
          last_insurance_date: editedTruck.lastInsuranceDate || null,
          insurance_expiration_date: editedTruck.insuranceExpirationDate || null,
          last_technical_inspection_date: editedTruck.lastTechnicalInspectionDate || null,
          next_technical_inspection_date: editedTruck.nextTechnicalInspectionDate || null,
        })
        .eq('id', id);
      
      if (truckError) {
        throw truckError;
      }
      
      // Update trailer assignment
      if (editSection === "trailer") {
        const { data: existingAssignment, error: fetchError } = await supabase
          .from('truck_trailer_assignments')
          .select('id')
          .eq('truck_id', id)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        
        if (editedTruck.trailerId) {
          // Insert or update assignment
          if (existingAssignment) {
            const { error: updateError } = await supabase
              .from('truck_trailer_assignments')
              .update({ trailer_id: editedTruck.trailerId, assigned_at: new Date().toISOString() })
              .eq('truck_id', id);
            
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('truck_trailer_assignments')
              .insert([{ truck_id: id, trailer_id: editedTruck.trailerId }]);
            
            if (insertError) throw insertError;
          }
        } else if (existingAssignment) {
          // Delete assignment if trailerId is empty
          const { error: deleteError } = await supabase
            .from('truck_trailer_assignments')
            .delete()
            .eq('truck_id', id);
          
          if (deleteError) throw deleteError;
        }
      }
      
      // Fetch updated trailer data
      let updatedTrailer = null;
      if (editedTruck.trailerId) {
        const { data: trailerData, error: trailerError } = await supabase
          .from('trailers')
          .select('id, vin, immatriculation, dpmc, ptac, axle_reference, last_insurance_date, insurance_expiry_date, last_technical_inspection, next_technical_inspection, description')
          .eq('id', editedTruck.trailerId)
          .single();
        
        if (trailerError) throw trailerError;
        
        updatedTrailer = {
          id: trailerData.id,
          vin: trailerData.vin || "Non spécifié",
          immatriculation: trailerData.immatriculation || "Non spécifié",
          dpmc: trailerData.dpmc || "Non spécifiée",
          ptac: trailerData.ptac ? `${trailerData.ptac} kg` : "Non spécifié",
          axle_reference: trailerData.axle_reference || "Non spécifié",
          last_insurance_date: trailerData.last_insurance_date || "Non spécifiée",
          insurance_expiry_date: trailerData.insurance_expiry_date || "Non spécifiée",
          last_technical_inspection: trailerData.last_technical_inspection || "Non spécifiée",
          next_technical_inspection: trailerData.next_technical_inspection || "Non spécifiée",
          description: trailerData.description || "Non spécifié",
        };
      }
      
      setTruck({
        ...editedTruck,
        trailer: updatedTrailer,
      });
      setIsEditing(false);
      setEditSection(null);
      
      alert("Modifications enregistrées avec succès!");
    } catch (error) {
      console.error("Error updating truck or trailer:", error);
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
              <li><Link to="/fleet/dashboard">📊 Gestion de Flotte</Link></li>
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
              <li><Link to="/fleet/dashboard">📊 Gestion de Flotte</Link></li>
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
            <li><Link to="/fleet/dashboard">📊 Gestion de Flotte</Link></li>
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
            className={`tab ${activeTab === "historique" ? "active" : ""}`}
            onClick={() => setActiveTab("historique")}
          >
            Historique des pleins
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
                    <div className="form-group">
                      <label>Modèle:</label>
                      <input 
                        type="text" 
                        name="modele" 
                        value={editedTruck?.modele || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Année:</label>
                      <input 
                        type="number" 
                        name="anneeFabrication" 
                        value={editedTruck?.anneeFabrication || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>VIN:</label>
                      <input 
                        type="text" 
                        name="numeroSerie" 
                        value={editedTruck?.numeroSerie || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Kilométrage Actuel:</label>
                      <input 
                        type="number" 
                        name="kilometrage" 
                        value={editedTruck?.kilometrage || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Type de Carburant:</label>
                      <input 
                        type="text" 
                        name="typeCarburant" 
                        value={editedTruck?.typeCarburant || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>État:</label>
                      <select 
                        name="status" 
                        value={editedTruck?.status || "active"} 
                        onChange={handleInputChange}
                      >
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Dernière Date d'Assurance:</label>
                      <input 
                        type="date" 
                        name="lastInsuranceDate" 
                        value={editedTruck?.lastInsuranceDate || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Date d'Expiration de l'Assurance:</label>
                      <input 
                        type="date" 
                        name="insuranceExpirationDate" 
                        value={editedTruck?.insuranceExpirationDate || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Dernière Date de Contrôle Technique:</label>
                      <input 
                        type="date" 
                        name="lastTechnicalInspectionDate" 
                        value={editedTruck?.lastTechnicalInspectionDate || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Prochaine Date de Contrôle Technique:</label>
                      <input 
                        type="date" 
                        name="nextTechnicalInspectionDate" 
                        value={editedTruck?.nextTechnicalInspectionDate || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Équipements:</label>
                      <input 
                        type="text" 
                        name="equipements" 
                        value={editedTruck?.equipements || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
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
                    <p><strong>Dernière Date d'Assurance:</strong> {truck.lastInsuranceDate || "Non spécifiée"}</p>
                    <p><strong>Date d'Expiration de l'Assurance:</strong> {truck.insuranceExpirationDate || "Non spécifiée"}</p>
                    <p><strong>Dernière Date de Contrôle Technique:</strong> {truck.lastTechnicalInspectionDate || "Non spécifiée"}</p>
                    <p><strong>Prochaine Date de Contrôle Technique:</strong> {truck.nextTechnicalInspectionDate || "Non spécifiée"}</p>
                    <p><strong>Équipements:</strong> {truck.equipements || "Non spécifiés"}</p>
                    <p><strong>Accessoires:</strong> {truck.accessoires || "Non spécifiés"}</p>
                  </>
                )}
              </div>

              <div className="trailer-info">
                <div className="section-header">
                  <h3>🚚 Détails de la Remorque</h3>
                  {!isEditing && (
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditClick("trailer")}
                    >
                      ✏️ Modifier
                    </button>
                  )}
                </div>
                
                {isEditing && editSection === "trailer" ? (
                  <form className="edit-form">
                    <div className="form-group">
                      <label>Remorque Assignée:</label>
                      <select
                        name="trailerId"
                        value={editedTruck?.trailerId || ""}
                        onChange={handleInputChange}
                      >
                        <option value="">Aucune remorque</option>
                        {trailers.map(trailer => (
                          <option key={trailer.id} value={trailer.id}>
                            {trailer.immatriculation} (VIN: {trailer.vin})
                          </option>
                        ))}
                      </select>
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
                    {truck.trailer ? (
                      <>
                        <p><strong>VIN:</strong> {truck.trailer.vin}</p>
                        <p><strong>Immatriculation:</strong> {truck.trailer.immatriculation}</p>
                        <p><strong>DPMC (Date de Première Mise en Circulation):</strong> {truck.trailer.dpmc}</p>
                        <p><strong>PTAC (kg):</strong> {truck.trailer.ptac}</p>
                        <p><strong>Référence d’essieux:</strong> {truck.trailer.axle_reference}</p>
                        <p><strong>Dernière Date d'Assurance:</strong> {truck.trailer.last_insurance_date}</p>
                        <p><strong>Date d'Expiration de l'Assurance:</strong> {truck.trailer.insurance_expiry_date}</p>
                        <p><strong>Dernière Date de Contrôle Technique:</strong> {truck.trailer.last_technical_inspection}</p>
                        <p><strong>Prochaine Date de Contrôle Technique:</strong> {truck.trailer.next_technical_inspection}</p>
                        <p><strong>Description:</strong> {truck.trailer.description}</p>
                      </>
                    ) : (
                      <p>Aucune remorque assignée.</p>
                    )}
                  </>
                )}
              </div>
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
                    <div className="form-group">
                      <label>Nom:</label>
                      <input 
                        type="text" 
                        name="chauffeur" 
                        value={editedTruck?.chauffeur || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Téléphone:</label>
                      <input 
                        type="text" 
                        name="telephoneChauffeur" 
                        value={editedTruck?.telephoneChauffeur || ""} 
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
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
            </section>
          </div>
          
        )}

        {activeTab === "carburant" && (
          <FuelTab fuelHistory={fuelHistory} onFuelAdded={refreshFuelData} />
        )}

        {activeTab === "historique" && (
          <FuelHistoryTab fuelHistory={fuelHistory} onFuelAdded={refreshFuelData} />
        )}

        {activeTab === "maintenance" && (
          <MaintenanceTab maintenanceHistory={maintenanceHistory} />
        )}
      </main>
    </div>
  );
};

export default TruckDetails;