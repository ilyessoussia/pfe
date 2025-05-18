import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./FleetDashboard.css";
import TruckForm from "./TruckForm";
import { supabase } from "../supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import FleetChatbot from "./FleetChatbot";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FleetDashboard = () => {
  const [filter, setFilter] = useState({ status: "all", fuel: "all" });
  const [sort, setSort] = useState("mileage-desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [truckTrailerAssignments, setTruckTrailerAssignments] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [fleetStats, setFleetStats] = useState({ totalTrucks: 0 });
  const [mapView, setMapView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());
  const [latestFuelByTruck, setLatestFuelByTruck] = useState({});
  const [showAlerts, setShowAlerts] = useState(true);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch trucks
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('*')
        .order('created_at', { ascending: false });

      if (trucksError) throw trucksError;

      // Fetch trailers
      const { data: trailersData, error: trailersError } = await supabase
        .from('trailers')
        .select('id, immatriculation')
        .order('immatriculation', { ascending: true });

      if (trailersError) throw trailersError;
      setTrailers(trailersData);

      // Fetch truck-trailer assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('truck_trailer_assignments')
        .select('truck_id, trailer_id, trailers(immatriculation)');

      if (assignmentsError) throw assignmentsError;

      const assignments = {};
      assignmentsData.forEach(assignment => {
        assignments[assignment.truck_id] = {
          trailer_id: assignment.trailer_id,
          trailer_immatriculation: assignment.trailers.immatriculation,
        };
      });
      setTruckTrailerAssignments(assignments);

      // Fetch fuel records
      const { data: fuelData, error: fuelError } = await supabase
        .from('fuel_history')
        .select('*')
        .order('raw_date', { ascending: false });

      if (fuelError) throw fuelError;

      const fuelByTruck = {};
      fuelData.forEach(fuel => {
        if (!fuelByTruck[fuel.truck_id] || new Date(fuel.raw_date) > new Date(fuelByTruck[fuel.truck_id].date)) {
          fuelByTruck[fuel.truck_id] = {
            truckId: fuel.truck_id,
            date: fuel.raw_date,
            kilometers: fuel.kilometers,
            litersPer100km: fuel.liters_per_100km,
          };
        }
      });
      setLatestFuelByTruck(fuelByTruck);

      // Fetch maintenance records
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_records')
        .select('truck_id, next_oil_change, date')
        .order('date', { ascending: false });

      if (maintenanceError) throw maintenanceError;

      const nextOilChangeByTruck = {};
      maintenanceData.forEach(record => {
        if (
          record.next_oil_change &&
          (!nextOilChangeByTruck[record.truck_id] ||
            new Date(record.date) > new Date(nextOilChangeByTruck[record.truck_id].date))
        ) {
          nextOilChangeByTruck[record.truck_id] = {
            nextOilChange: record.next_oil_change,
            date: record.date,
          };
        }
      });

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Fetch spare parts
      const { data: partsData, error: partsError } = await supabase
        .from('spare_parts')
        .select('*');

      if (partsError) throw partsError;

      // Compute fleet stats
      setFleetStats({
        totalTrucks: trucksData.length,
      });

      // Compute alerts
      const alerts = [];
      trucksData.forEach(truck => {
        const fuelEntry = fuelByTruck[truck.id];
        if (fuelEntry && fuelEntry.litersPer100km > 30) {
          alerts.push({
            type: "fuel",
            message: `Consommation élevée pour ${truck.immatriculation}`,
            truckId: truck.id,
            id: `fuel-${truck.id}`,
          });
        }
        const maintenance = maintenanceData.find(
          m => m.truck_id === truck.id && new Date(m.date) < new Date()
        );
        if (maintenance) {
          alerts.push({
            type: "maintenance",
            message: `Maintenance en retard pour ${truck.immatriculation}`,
            truckId: truck.id,
            id: `maintenance-${truck.id}`,
          });
        }
        const nextOilChange = nextOilChangeByTruck[truck.id]?.nextOilChange;
        if (fuelEntry && nextOilChange) {
          const currentMileage = fuelEntry.kilometers;
          if (nextOilChange - currentMileage <= 1000) {
            alerts.push({
              type: "oil_change",
              message: `Vidange huile imminente pour ${truck.immatriculation} (${Math.round(nextOilChange - currentMileage)} km restants)`,
              truckId: truck.id,
              id: `oil_change-${truck.id}`,
            });
          }
        }
      });
      productsData.forEach((product, index) => {
        if (product.quantité < 5) {
          alerts.push({
            type: "stock",
            message: `Stock faible pour ${product.name}`,
            id: `stock-${index}`,
          });
        }
      });
      partsData.forEach((part, index) => {
        if (part.quantity < 5) {
          alerts.push({
            type: "part",
            message: `Stock faible pour ${part.name}`,
            id: `part-${index}`,
          });
        }
      });
      setAlerts(alerts);

      // Format trucks
      const formattedTrucks = trucksData.map(truck => ({
        id: truck.id,
        immatriculation: truck.immatriculation,
        model: truck.modele || "Unknown Model",
        driver: truck.chauffeur || "No Driver Assigned",
        status: truck.status || "active",
        lastFuel: fuelByTruck[truck.id]?.date
          ? new Date(fuelByTruck[truck.id].date).toLocaleDateString('fr-FR')
          : "N/A",
        currentMileage: fuelByTruck[truck.id]?.kilometers
          ? `${fuelByTruck[truck.id].kilometers} km`
          : "N/A",
        nextOilChange: nextOilChangeByTruck[truck.id]?.nextOilChange
          ? `${nextOilChangeByTruck[truck.id].nextOilChange} km`
          : "N/A",
        trailerImmatriculation: assignments[truck.id]?.trailer_immatriculation || null,
      }));

      setTrucks(formattedTrucks);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Échec du chargement des données du tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
    setDismissedAlerts([]);
  };

  const handleCloseAlert = (alertId) => {
    setDismissedAlerts([...dismissedAlerts, alertId]);
  };

  const handleAssignTrailer = (truckId, e) => {
    e.stopPropagation();
    e.preventDefault(); // Additional safeguard to prevent any default behavior
    console.log("Opening trailer modal for truck ID:", truckId); // Debugging
    setSelectedTruckId(truckId);
    setSelectedTrailerId(truckTrailerAssignments[truckId]?.trailer_id || "");
    setShowTrailerModal(true);
  };

  const handleTrailerSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    if (!selectedTrailerId) {
      setModalError("Veuillez sélectionner une remorque.");
      setSubmitting(false);
      return;
    }

    try {
      const { data: existingAssignment, error: fetchError } = await supabase
        .from('truck_trailer_assignments')
        .select('id')
        .eq('truck_id', selectedTruckId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingAssignment) {
        const { error: updateError } = await supabase
          .from('truck_trailer_assignments')
          .update({ trailer_id: selectedTrailerId, assigned_at: new Date().toISOString() })
          .eq('truck_id', selectedTruckId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('truck_trailer_assignments')
          .insert([{ truck_id: selectedTruckId, trailer_id: selectedTrailerId }]);

        if (insertError) throw insertError;
      }

      setModalSuccess("Remorque assignée avec succès !");
      setTimeout(() => {
        setShowTrailerModal(false);
        setSelectedTruckId(null);
        setSelectedTrailerId("");
        setModalSuccess(null);
        fetchData();
      }, 2000);
    } catch (err) {
      console.error("Error assigning trailer:", err);
      setModalError("Échec de l'assignation de la remorque. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTrucks = trucks
    .filter(truck => filter.status === "all" || truck.status === filter.status)
    .filter(truck => {
      if (filter.fuel === "all") return true;
      const fuelEntry = latestFuelByTruck[truck.id];
      if (!fuelEntry) return false;
      const fuelLevel = fuelEntry.litersPer100km || 0;
      return (
        (filter.fuel === "low" && fuelLevel < 10) ||
        (filter.fuel === "medium" && fuelLevel >= 10 && fuelLevel <= 40) ||
        (filter.fuel === "high" && fuelLevel > 40)
      );
    })
    .filter(truck => {
      if (!searchQuery) return true;
      return truck.immatriculation?.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sort === "mileage-desc") {
        const aMileage = parseFloat(a.currentMileage) || 0;
        const bMileage = parseFloat(b.currentMileage) || 0;
        return bMileage - aMileage;
      }
      if (sort === "mileage-asc") {
        const aMileage = parseFloat(a.currentMileage) || 0;
        const bMileage = parseFloat(b.currentMileage) || 0;
        return aMileage - bMileage;
      }
      return 0;
    });

  const getStatusLabel = status => {
    switch (status) {
      case "active":
        return "Actif";
      case "maintenance":
        return "En Maintenance";
      case "inactive":
        return "Inactif";
      default:
        return status;
    }
  };

  const getStatusClass = status => {
    switch (status) {
      case "active":
        return "status-active";
      case "maintenance":
        return "status-maintenance";
      case "inactive":
        return "status-inactive";
      default:
        return "";
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li className="active">
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
            <li>
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

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>📊 Gestion de Flotte</h1>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
              {loading ? "🔄" : "Actualiser🔄"}
            </button>
            <button className="add-truck" onClick={() => setShowForm(!showForm)}>
              Ajouter un camion +
            </button>
          </div>
        </header>

        {showForm && (
          <TruckForm
            onClose={() => {
              setShowForm(false);
              handleRefresh();
            }}
          />
        )}

        {showTrailerModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  {truckTrailerAssignments[selectedTruckId]
                    ? "Modifier la Remorque Assignée"
                    : "Assigner une Remorque"}
                </h3>
                <button
                  className="close-modal-btn"
                  onClick={() => setShowTrailerModal(false)}
                  aria-label="Fermer la fenêtre modale"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleTrailerSubmit}>
                {modalError && <div className="error-message">{modalError}</div>}
                {modalSuccess && <div className="success-message">{modalSuccess}</div>}
                <div className="form-group">
                  <label htmlFor="trailerId">Sélectionner une Remorque *</label>
                  <select
                    id="trailerId"
                    value={selectedTrailerId}
                    onChange={e => setSelectedTrailerId(e.target.value)}
                    required
                  >
                    <option value="">Choisir une remorque</option>
                    {trailers.map(trailer => (
                      <option key={trailer.id} value={trailer.id}>
                        {trailer.immatriculation}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowTrailerModal(false)}
                    disabled={submitting}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Enregistrement..."
                      : truckTrailerAssignments[selectedTruckId]
                        ? "Mettre à jour"
                        : "Assigner"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="dashboard-grid">
          <div className="main-content">
            <section className="truck-section">
              <div className="truck-filter">
                <div>
                  <h2>Camions</h2>
                  <p className="total-trucks">{fleetStats.totalTrucks} camions</p>
                </div>
                <div className="filter-controls">
                  <input
                    type="text"
                    placeholder="Rechercher par matricule..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="search-bar"
                  />
                  <select
                    value={filter.status}
                    onChange={e => setFilter({ ...filter, status: e.target.value })}
                  >
                    <option value="all">Statut</option>
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                  <select
                    value={filter.fuel}
                    onChange={e => setFilter({ ...filter, fuel: e.target.value })}
                  >
                    <option value="all">Carburant</option>
                    <option value="low">Faible</option>
                    <option value="medium">Moyen</option>
                    <option value="high">Élevé</option>
                  </select>
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="mileage-desc">Km ▼</option>
                    <option value="mileage-asc">Km ▲</option>
                  </select>
                  <button onClick={() => setMapView(!mapView)}>
                    {mapView ? "Liste" : "Carte"}
                  </button>
                </div>
              </div>

              {mapView ? (
                <div className="map-section">
                  <MapContainer center={[36.8065, 10.1815]} zoom={6} style={{ height: "700px" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {filteredTrucks.map(truck => (
                      <Marker
                        key={truck.id}
                        position={[36.8065 + Math.random() * 0.1, 10.1815 + Math.random() * 0.1]}
                      >
                        <Popup>
                          <strong>{truck.immatriculation}</strong>
                          {truck.trailerImmatriculation && (
                            <>
                              <br />
                              Remorque: {truck.trailerImmatriculation}
                            </>
                          )}
                          <br />
                          Statut: {getStatusLabel(truck.status)}
                          <br />
                          <Link to={`/fleet/truck/${truck.id}`}>Voir Détails</Link>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <div className="truck-cards">
                  {loading ? (
                    <div className="loading">Chargement...</div>
                  ) : filteredTrucks.length > 0 ? (
                    filteredTrucks.map(truck => (
                      <Link
                        key={truck.id}
                        to={`/fleet/truck/${truck.id}`}
                        className={`truck-card ${getStatusClass(truck.status)}`}
                      >
                        <div className="truck-header">
                          <div>
                            <h2>{truck.immatriculation || truck.id}</h2>
                            {truck.trailerImmatriculation && (
                              <p className="trailer-infos"> {truck.trailerImmatriculation}</p>
                            )}
                          </div>
                          <span className={`status-badge ${getStatusClass(truck.status)}`}>
                            {getStatusLabel(truck.status)}
                          </span>
                        </div>
                        <p className="truck-model">{truck.model}</p>
                        <div className="truck-detailss">
                          <div className="detail-row">
                            <span className="detail-label">👤 Chauffeur</span>
                            <span className="detail-value">{truck.driver}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">⛽ Dernier plein</span>
                            <span className="detail-value">{truck.lastFuel}</span>
                          </div>
                          <div className="detail-row">
                            <span className="ocry">🛣️ Kilométrage</span>
                            <span className="detail-value">{truck.currentMileage}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">🛢️ Prch Vidange</span>
                            <span className="detail-value">{truck.nextOilChange}</span>
                          </div>
                        </div>
                        <button
                          className="assign-trailer-btn"
                          onClick={(e) => handleAssignTrailer(truck.id, e)}
                          type="button" // Explicitly set to prevent form submission
                        >
                          {truck.trailerImmatriculation ? "Modifier Remorque" : "Ajouter Remorque"}
                        </button>
                      </Link>
                    ))
                  ) : (
                    <div className="no-trucks">
                      {filter.status === "all" && !searchQuery
                        ? "Aucun camion."
                        : "Aucun camion trouvé."}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <section className={`alerts-section ${showAlerts ? "expanded" : "collapsed"}`}>
            <div className="alerts-header">
              <h2>⚠️ Alertes ({alerts.filter(alert => !dismissedAlerts.includes(alert.id)).length})</h2>
              <button onClick={() => setShowAlerts(!showAlerts)}>
                {showAlerts ? "X" : "Afficher"}
              </button>
            </div>
            {showAlerts && (
              <div className="alerts-list">
                {alerts.length > 0 ? (
                  alerts
                    .filter(alert => !dismissedAlerts.includes(alert.id))
                    .map((alert, index) => (
                      <div key={alert.id} className={`alert-card alert-${alert.type}`}>
                        <span className="alert-icon">
                          {alert.type === "fuel" ? "⛽" : alert.type === "maintenance" ? "🛠️" : alert.type === "oil_change" ? "🛢️" : "📦"}
                        </span>
                        <p>{alert.message}</p>
                        {alert.truckId && <Link to={`/fleet/truck/${alert.truckId}`}>Détails</Link>}
                        <button
                          className="close-alert"
                          onClick={() => handleCloseAlert(alert.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                ) : (
                  <p>Aucune alerte.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      <FleetChatbot />
    </div>
  );
};

export default FleetDashboard;