import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./FleetDashboard.css";
import TruckForm from "./TruckForm";
import { supabase } from "../supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [recentFuelActivities, setRecentFuelActivities] = useState([]);
  const [fleetStats, setFleetStats] = useState({ totalTrucks: 0 });
  const [mapView, setMapView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());
  const [latestFuelByTruck, setLatestFuelByTruck] = useState({});
  const [showAlerts, setShowAlerts] = useState(true);
  const [showFuelActivities, setShowFuelActivities] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch trucks
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('*')
        .order('created_at', { ascending: false });

      if (trucksError) throw trucksError;

      const formattedTrucks = trucksData.map(truck => ({
        id: truck.id,
        immatriculation: truck.immatriculation,
        model: truck.modele || "Unknown Model",
        driver: truck.chauffeur || "No Driver Assigned",
        status: truck.status || "active",
      }));

      // Fetch fuel records from fuel_history, ordered by date descending to get latest first
      const { data: fuelData, error: fuelError } = await supabase
        .from('fuel_history')
        .select('*')
        .order('raw_date', { ascending: false });

      if (fuelError) throw fuelError;

      const fuelByTruck = {};
      fuelData.forEach(fuel => {
        // Only store the most recent fuel entry for each truck
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
        .select('*');

      if (maintenanceError) throw maintenanceError;

      // Fetch stock items
      const { data: stockData, error: stockError } = await supabase
        .from('stock_items')
        .select('*');

      if (stockError) throw stockError;

      // Fetch spare parts
      const { data: partsData, error: partsError } = await supabase
        .from('spare_parts')
        .select('*');

      if (partsError) throw partsError;

      // Compute fleet stats
      setFleetStats({
        totalTrucks: formattedTrucks.length,
      });

      // Compute alerts
      const alerts = [];
      formattedTrucks.forEach(truck => {
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
      });
      stockData.forEach((item, index) => {
        if (item.quantity < 5) {
          alerts.push({
            type: "stock",
            message: `Stock faible pour ${item.material}`,
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

      // Compute recent fuel activities (limit to 8 items)
      const fuelActivities = fuelData
        .slice(0, 8)
        .map(fuel => ({
          type: "fuel",
          data: {
            truckId: fuel.truck_id,
            litersPer100km: fuel.liters_per_100km,
          },
          timestamp: new Date(fuel.created_at),
          truck: formattedTrucks.find(t => t.id === fuel.truck_id)?.immatriculation || "Camion",
        }));
      setRecentFuelActivities(fuelActivities);

      // Update trucks with fuel data
      setTrucks(
        formattedTrucks.map(truck => ({
          ...truck,
          lastFuel: fuelByTruck[truck.id]?.date
            ? new Date(fuelByTruck[truck.id].date).toLocaleDateString('fr-FR')
            : "N/A",
          currentMileage: fuelByTruck[truck.id]?.kilometers
            ? `${fuelByTruck[truck.id].kilometers} km`
            : "N/A",
        }))
      );

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

  const filteredTrucks = trucks
    .filter(truck => filter.status === "all" || truck.status === filter.status)
    .filter(truck => {
      if (filter.fuel === "all") return true;
      const fuelEntry = latestFuelByTruck[truck.id];
      if (!fuelEntry) return false;
      const fuelLevel = fuelEntry.litersPer100km || 0;
      return (
        (filter.fuel === "low" && fuelLevel > 15) ||
        (filter.fuel === "medium" && fuelLevel >= 10 && fuelLevel <= 15) ||
        (filter.fuel === "high" && fuelLevel < 10)
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
        <h2 className="fleet-title">Fleet Manager</h2>
        <nav>
          <ul>
            <li className="active">
              <Link to="/fleet/dashboard">📊 Tableau de Bord</Link>
            </li>
            <li>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li>
              <Link to="/stock">📦 Gestion de Stock</Link>
            </li>
            <li>
              <Link to="/schedule">🗓️ Planifier un Programme</Link>
            </li>
            <li>
              <Link to="/maintenance">🛠️ Maintenance</Link>
            </li>
            <li>
              <Link to="/incidents">🚨 Gestion des Incidents</Link>
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
            <h1>Tableau de Bord</h1>
            <p className="last-updated">Mise à jour: {lastUpdated}</p>
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
                    <option value="maintenance">Maintenance</option>
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
                  <MapContainer center={[36.8065, 10.1815]} zoom={6} style={{ height: "250px" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {filteredTrucks.map(truck => (
                      <Marker
                        key={truck.id}
                        position={[36.8065 + Math.random() * 0.1, 10.1815 + Math.random() * 0.1]}
                      >
                        <Popup>
                          <strong>{truck.immatriculation}</strong>
                          <br />
                          Statut: {getStatusLabel(truck.status)}
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
                          <h2>{truck.immatriculation || truck.id}</h2>
                          <span className={`status-badge ${getStatusClass(truck.status)}`}>
                            {getStatusLabel(truck.status)}
                          </span>
                        </div>
                        <p className="truck-model">{truck.model}</p>
                        <div className="truck-details">
                          <div className="detail-row">
                            <span className="detail-label">👤chaffeur</span>
                            <span className="detail-value">{truck.driver}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">⛽Dernier plein</span>
                            <span className="detail-value">{truck.lastFuel}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">🛣️Kilomètrage </span>
                            <span className="detail-value">{truck.currentMileage}</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="no-trucks">
                      {filter.status === "all" && !searchQuery
                        ? "Aucun camion."
                        : `Aucun camion trouvé.`}
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
                          {alert.type === "fuel" ? "⛽" : alert.type === "maintenance" ? "🛠️" : "📦"}
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

          <section className={`recent-fuel-activities ${showFuelActivities ? "expanded" : "collapsed"}`}>
            <div className="fuel-activities-header">
              <h2>Activités de Carburant Récentes</h2>
              <button onClick={() => setShowFuelActivities(!showFuelActivities)}>
                {showFuelActivities ? "X" : "Afficher"}
              </button>
            </div>
            {showFuelActivities && (
              <div className="fuel-activities-list">
                {recentFuelActivities.length > 0 ? (
                  recentFuelActivities.map((activity, index) => (
                    <div key={index} className="fuel-activity-item">
                      <span className="fuel-icon">⛽</span>
                      <div className="fuel-content">
                        <p>{activity.truck}: {activity.data.litersPer100km.toFixed(2)} L/100km</p>
                        <span className="fuel-date">{activity.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Aucune activité de carburant.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default FleetDashboard;