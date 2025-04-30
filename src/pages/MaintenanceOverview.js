import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./MaintenanceOverview.css";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

const MaintenanceOverview = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("scheduled");

  // Fetch trucks and maintenances from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch trucks
        const trucksCollection = collection(db, "trucks");
        const trucksSnapshot = await getDocs(trucksCollection);
        const trucksData = trucksSnapshot.docs.map((doc) => ({
          id: doc.id,
          immatriculation: doc.data().immatriculation || doc.id,
        }));
        setTrucks(trucksData);

        // Fetch maintenances
        const maintenancesCollection = collection(db, "maintenances");
        const maintenancesSnapshot = await getDocs(maintenancesCollection);
        const maintenancesData = maintenancesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMaintenances(maintenancesData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Échec du chargement des données de maintenance.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle marking maintenance as completed
  const handleCompleteMaintenance = async (maintenance) => {
    try {
      const maintenanceRef = doc(db, "maintenances", maintenance.id);
      await updateDoc(maintenanceRef, {
        status: "completed",
        completedAt: new Date(),
      });
      setMaintenances((prev) =>
        prev.map((m) =>
          m.id === maintenance.id ? { ...m, status: "completed" } : m
        )
      );
    } catch (err) {
      console.error("Error completing maintenance:", err);
      setError("Erreur lors de la finalisation de la maintenance.");
    }
  };

  // Filter maintenances based on status
  const filteredMaintenances =
    filter === "all"
      ? maintenances
      : maintenances.filter((m) => m.status === filter);

  return (
    <div className="maintenance-overview-container">
      {/* Sidebar */}
      <aside className="maintenance-overview-sidebar">
        <h2 className="maintenance-overview-fleet-title">Système de Gestion & Contrôle </h2>
        <nav>
          <ul>
            <li>
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
            <li className="active">
              <Link to="/maintenance">🛠️ Maintenance</Link>
            </li>
          </ul>
        </nav>
        <div className="maintenance-overview-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="maintenance-overview-content">
        <header className="maintenance-overview-header">
          <h1>🛠️ Aperçu de la Maintenance</h1>
        </header>

        {error && <div className="maintenance-overview-error-message">{error}</div>}

        {/* Filter Buttons */}
        <section className="maintenance-overview-filter-section">
          <h2>Maintenances</h2>
          <div className="maintenance-overview-filter-buttons">
            {["all", "scheduled", "completed"].map((status) => (
              <button
                key={status}
                className={filter === status ? "active" : ""}
                onClick={() => setFilter(status)}
              >
                {status === "all"
                  ? "Toutes"
                  : status === "scheduled"
                  ? "Planifiées"
                  : "Terminées"}
              </button>
            ))}
          </div>
        </section>

        {/* Maintenance List */}
        <section className="maintenance-overview-list-section">
          {loading ? (
            <div className="maintenance-overview-loading">Chargement des données...</div>
          ) : filteredMaintenances.length > 0 ? (
            <div className="maintenance-overview-items">
              {filteredMaintenances.map((maintenance) => {
                const truck = trucks.find((t) => t.id === maintenance.truckId);
                return (
                  <div
                    key={maintenance.id}
                    className={`maintenance-overview-item ${
                      maintenance.status === "scheduled"
                        ? "status-scheduled"
                        : "status-completed"
                    }`}
                  >
                    <h3>{maintenance.type}</h3>
                    <p><strong>Camion:</strong> {truck?.immatriculation || "Inconnu"}</p>
                    <p><strong>Date:</strong> {maintenance.date}</p>
                    <p><strong>Kilométrage:</strong> {maintenance.kilometrage}</p>
                    <p><strong>Technicien:</strong> {maintenance.technicien}</p>
                    <p><strong>Coût:</strong> {maintenance.cout?.toFixed(2) || 0} €</p>
                    <p><strong>Statut:</strong> {maintenance.status === "scheduled" ? "Planifiée" : "Terminée"}</p>
                    {maintenance.status === "scheduled" && (
                      <button
                        className="maintenance-overview-complete-btn"
                        onClick={() => handleCompleteMaintenance(maintenance)}
                      >
                        Marquer comme Terminé
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="maintenance-overview-no-maintenances">
              Aucune maintenance {filter === "all" ? "" : filter === "scheduled" ? "planifiée" : "terminée"} trouvée.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MaintenanceOverview;