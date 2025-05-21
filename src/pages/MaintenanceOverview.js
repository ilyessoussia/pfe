import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./MaintenanceOverview.css";
import { supabase } from "../supabase";

const MaintenanceOverview = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState("scheduled");
  const [showConfirmComplete, setShowConfirmComplete] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch trucks
        const { data: trucksData, error: trucksError } = await supabase
          .from('trucks')
          .select('id, immatriculation');

        if (trucksError) throw trucksError;

        setTrucks(trucksData.map(truck => ({
          id: truck.id,
          immatriculation: truck.immatriculation,
        })));

        // Fetch trailers
        const { data: trailersData, error: trailersError } = await supabase
          .from('trailers')
          .select('id, immatriculation');

        if (trailersError) throw trailersError;

        setTrailers(trailersData.map(trailer => ({
          id: trailer.id,
          immatriculation: trailer.immatriculation,
        })));

        // Fetch truck maintenances
        const { data: truckMaintenancesData, error: truckMaintenancesError } = await supabase
          .from('maintenance_records')
          .select('*');

        if (truckMaintenancesError) throw truckMaintenancesError;

        // Fetch trailer maintenances
        const { data: trailerMaintenancesData, error: trailerMaintenancesError } = await supabase
          .from('trailer_maintenance_records')
          .select('*');

        if (trailerMaintenancesError) throw trailerMaintenancesError;

        // Combine maintenances
        const truckMaintenances = truckMaintenancesData.map(maintenance => ({
          id: maintenance.id,
          vehicleId: maintenance.truck_id,
          vehicleType: "Camion",
          type: maintenance.type,
          date: new Date(maintenance.date).toLocaleDateString('fr-FR'),
          kilometrage: maintenance.kilometrage ? maintenance.kilometrage.toString() : "N/A",
          technicien: maintenance.technicien || "Non spécifié",
          cout: maintenance.cout || 0,
          status: maintenance.status,
          completedAt: maintenance.completed_at,
        }));

        const trailerMaintenances = trailerMaintenancesData.map(maintenance => ({
          id: maintenance.id,
          vehicleId: maintenance.trailer_id,
          vehicleType: "Remorque",
          type: maintenance.type,
          date: new Date(maintenance.raw_date).toLocaleDateString('fr-FR'),
          kilometrage: "N/A",
          technicien: maintenance.technicien || "Non spécifié",
          cout: maintenance.cout || 0,
          status: maintenance.status === "planned" ? "scheduled" : maintenance.status,
          completedAt: maintenance.created_at,
        }));

        const combinedMaintenances = [...truckMaintenances, ...trailerMaintenances];
        console.log("Combined maintenances:", combinedMaintenances);
        setMaintenances(combinedMaintenances);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Échec du chargement des données de maintenance.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCompleteMaintenance = async (maintenance) => {
    try {
      console.log("Completing maintenance:", maintenance); // Debug log
      const table = maintenance.vehicleType === "Camion" ? 'maintenance_records' : 'trailer_maintenance_records';
      const updateData = {
        status: "completed",
        [maintenance.vehicleType === "Camion" ? 'completed_at' : 'created_at']: new Date().toISOString(),
      };

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', maintenance.id);

      if (error) throw error;

      setMaintenances((prev) =>
        prev.map((m) =>
          m.id === maintenance.id && m.vehicleType === maintenance.vehicleType
            ? { ...m, status: "completed", completedAt: new Date().toISOString() }
            : m
        )
      );
      setSuccess("Maintenance marquée comme terminée avec succès !");
      setShowConfirmComplete(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error completing maintenance:", error);
      setError("Erreur lors de la finalisation de la maintenance.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const filteredMaintenances =
    filter === "all"
      ? maintenances
      : maintenances.filter((m) => m.status === filter);

  return (
    <div className="maintenance-overview-container">
      <aside className="sidebar">
        <h2 className="maintenance-overview-fleet-title">Système de Gestion & Contrôle</h2>
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
            <li className="active">
              <Link to="/maintenance">🛠️ Maintenance</Link>
            </li>
            <li>
              <Link to="/trailers">🚛 Gestion des Remorques</Link>
            </li>
            <li>
              <Link to="/incidents">🚨 Gestion des Incidents</Link>
            </li>
            <li>
              <Link to="/driver-payments">💰 Gestion des salaires </Link>
            </li>
            <li>
                          <Link to="/chatbot">🤖 Système de Reporting</Link>
                        </li>
          </ul>
        </nav>
        <div className="maintenance-overview-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 </p>
        </div>
      </aside>

      <main className="maintenance-overview-content">
        <header className="maintenance-overview-header">
          <h1>🛠️ Aperçu de la Maintenance</h1>
        </header>

        {error && <div className="maintenance-overview-error-message">{error}</div>}
        {success && <div className="maintenance-overview-success-message">{success}</div>}

        <section className="maintenance-overview-filter-section">
          <h2>Maintenances</h2>
          <div className="maintenance-overview-filter-buttons">
            {[ "scheduled", "completed"].map((status) => (
              <button
                key={status}
                className={filter === status ? "active" : ""}
                onClick={() => setFilter(status)}
              >
                {status === "scheduled"
                  ? "Planifiées"
                  : "Terminées"}
              </button>
            ))}
          </div>
        </section>

        <section className="maintenance-overview-list-section">
          {loading ? (
            <div className="maintenance-overview-loading">Chargement des données...</div>
          ) : filteredMaintenances.length > 0 ? (
            <div className="maintenance-overview-items">
              {filteredMaintenances.map((maintenance) => {
                const vehicle = maintenance.vehicleType === "Camion"
                  ? trucks.find((t) => t.id === maintenance.vehicleId)
                  : trailers.find((t) => t.id === maintenance.vehicleId);
                return (
                  <div
                    key={`${maintenance.vehicleType}-${maintenance.id}`}
                    className={`maintenance-overview-item ${
                      maintenance.status === "scheduled"
                        ? "status-scheduled"
                        : "status-completed"
                    }`}
                  >
                    <h3>{maintenance.type}</h3>
                    <p><strong>Type:</strong> {maintenance.vehicleType}</p>
                    <p><strong>{maintenance.vehicleType}:</strong> {vehicle?.immatriculation || "Inconnu"}</p>
                    <p><strong>Date:</strong> {maintenance.date}</p>
                    <p><strong>Kilométrage:</strong> {maintenance.kilometrage}</p>
                    <p><strong>Technicien:</strong> {maintenance.technicien}</p>
                    <p><strong>Coût:</strong> {maintenance.cout.toFixed(2)} DT</p>
                    <p><strong>Statut:</strong> {maintenance.status === "scheduled" ? "Planifiée" : "Terminée"}</p>
                    {maintenance.status === "scheduled" && (
                      <button
                        className="maintenance-overview-complete-btn"
                        onClick={() => setShowConfirmComplete(maintenance)}
                        aria-label={`Marquer ${maintenance.type} comme terminé`}
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
              <p>Êtes-vous sûr de vouloir marquer cette maintenance ({showConfirmComplete.type}) pour {showConfirmComplete.vehicleType} comme terminée ?</p>
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
                  onClick={() => handleCompleteMaintenance(showConfirmComplete)}
                  aria-label="Confirmer la finalisation"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MaintenanceOverview;