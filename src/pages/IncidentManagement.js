import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./IncidentManagement.css";
import { supabase } from "../supabase";

const IncidentManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [trucks, setTrucks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newIncident, setNewIncident] = useState({
    incidentDate: new Date().toISOString().split('T')[0],
    truckId: "",
    location: "",
    type: "Accident",
    severity: "Mineur",
    description: "",
    reportedToInsurance: false,
  });
  const [filters, setFilters] = useState({
    truckId: "",
    severity: "all",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const incidentsPerPage = 5;
  const [expandedIncidents, setExpandedIncidents] = useState({});

  // Fetch trucks and incidents
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch trucks
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('id, immatriculation')
        .order('immatriculation', { ascending: true });

      if (trucksError) throw trucksError;
      setTrucks(trucksData);

      // Fetch incidents
      const { data: incidentsData, error: incidentsError } = await supabase
        .from('incidents')
        .select('*, trucks(immatriculation)')
        .order('incident_date', { ascending: false });

      if (incidentsError) throw incidentsError;
      setIncidents(incidentsData);
      applyFilters(incidentsData, filters);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Échec du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFilters = (data, currentFilters) => {
    let filtered = data;
    if (currentFilters.truckId) {
      filtered = filtered.filter(incident => incident.truck_id === currentFilters.truckId);
    }
    if (currentFilters.severity !== "all") {
      filtered = filtered.filter(incident => incident.severity === currentFilters.severity);
    }
    setFilteredIncidents(filtered);
    setCurrentPage(0); // Reset to first page when filters change
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    applyFilters(incidents, newFilters);
  };

  const handleSeverityFilter = (severity) => {
    const newFilters = { ...filters, severity };
    setFilters(newFilters);
    applyFilters(incidents, newFilters);
  };

  const handleClearFilters = () => {
    const newFilters = { truckId: "", severity: "all" };
    setFilters(newFilters);
    applyFilters(incidents, newFilters);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewIncident({
      ...newIncident,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!newIncident.incidentDate || !newIncident.truckId || !newIncident.location || !newIncident.description) {
      setError("Tous les champs obligatoires doivent être remplis.");
      return;
    }

    const incidentDate = new Date(newIncident.incidentDate);
    if (incidentDate > new Date()) {
      setError("La date de l'incident ne peut pas être dans le futur.");
      return;
    }

    try {
      setLoading(true);
      const incidentRecord = {
        truck_id: newIncident.truckId,
        incident_date: newIncident.incidentDate,
        location: newIncident.location,
        type: newIncident.type,
        severity: newIncident.severity,
        description: newIncident.description,
        reported_to_insurance: newIncident.reportedToInsurance,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('incidents')
        .insert([incidentRecord]);

      if (insertError) throw insertError;

      // Refresh data
      await fetchData();
      setShowForm(false);
      setNewIncident({
        incidentDate: new Date().toISOString().split('T')[0],
        truckId: "",
        location: "",
        type: "Accident",
        severity: "Mineur",
        description: "",
        reportedToInsurance: false,
      });
      setError("");
      alert("Incident déclaré avec succès !");
    } catch (err) {
      console.error("Error saving incident:", err);
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setShowForm(true);
    setError("");
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setError("");
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const toggleIncidentDetails = (incidentId) => {
    setExpandedIncidents((prev) => ({
      ...prev,
      [incidentId]: !prev[incidentId],
    }));
  };

  const getSeverityCounts = () => {
    return {
      Mineur: incidents.filter(i => i.severity === "Mineur").length,
      Modéré: incidents.filter(i => i.severity === "Modéré").length,
      Majeur: incidents.filter(i => i.severity === "Majeur").length,
    };
  };

  const severityCounts = getSeverityCounts();
  const totalPages = Math.ceil(filteredIncidents.length / incidentsPerPage);
  const paginatedIncidents = filteredIncidents.slice(
    currentPage * incidentsPerPage,
    (currentPage + 1) * incidentsPerPage
  );

  return (
    <div className="incident-management-container">
      <aside className="sidebar">
        <h2 className="incident-management-fleet-title">Système de Gestion & Contrôle</h2>
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
            <li>
              <Link to="/maintenance">🛠️ Maintenance</Link>
            </li>
            <li>
              <Link to="/trailers">🚛 Gestion des Remorques</Link>
              </li>
            <li className="active">
              <Link to="/incidents">🚨 Gestion des Incidents</Link>
            </li>
            <li>
              <Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link>
            </li>
          </ul>
        </nav>
        <div className="incident-management-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>

      <main className="incident-management-content">
        <header className="incident-management-header">
          <h1>🚨 Gestion des Incidents</h1>
          <button className="add-incident-btn" onClick={handleOpenForm} disabled={loading}>
            Déclarer un Nouvel Incident
          </button>
        </header>

        {error && <div className="incident-management-error-message">{error}</div>}

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Déclarer un Nouvel Incident</h3>
                <button className="close-modal" onClick={handleCloseForm}>
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="incident-form">
                <p>Enregistrez les détails de l'incident impliquant un véhicule de la flotte.</p>

                <div className="form-group">
                  <label htmlFor="incidentDate">Date de l'incident</label>
                  <input
                    type="date"
                    id="incidentDate"
                    name="incidentDate"
                    value={newIncident.incidentDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="truckId">Véhicule</label>
                  <select
                    id="truckId"
                    name="truckId"
                    value={newIncident.truckId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sélectionnez un véhicule</option>
                    {trucks.map(truck => (
                      <option key={truck.id} value={truck.id}>
                        {truck.immatriculation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Lieu</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={newIncident.location}
                    onChange={handleInputChange}
                    placeholder="Adresse ou lieu de l'incident"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="type">Type d'incident</label>
                  <select
                    id="type"
                    name="type"
                    value={newIncident.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Accident">Accident</option>
                    <option value="Panne">Panne</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="severity">Gravité</label>
                  <select
                    id="severity"
                    name="severity"
                    value={newIncident.severity}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Mineur">Mineur</option>
                    <option value="Modéré">Modéré</option>
                    <option value="Majeur">Majeur</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={newIncident.description}
                    onChange={handleInputChange}
                    placeholder="Détails de l'incident..."
                    required
                  />
                </div>

                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="reportedToInsurance"
                      checked={newIncident.reportedToInsurance}
                      onChange={handleInputChange}
                    />
                    Déclaré auprès de l'assurance
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={handleCloseForm}
                    disabled={loading}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="save-btn" disabled={loading}>
                    {loading ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <section className="incident-management-filter-section">
          <h2>Filtres</h2>
          <div className="incident-management-filter-controls">
            <div className="form-group">
              <label htmlFor="truckFilter">Véhicule</label>
              <select
                id="truckFilter"
                name="truckId"
                value={filters.truckId}
                onChange={handleFilterChange}
              >
                <option value="">Tous les véhicules</option>
                {trucks.map(truck => (
                  <option key={truck.id} value={truck.id}>
                    {truck.immatriculation}
                  </option>
                ))}
              </select>
            </div>
            <div className="severity-filter">
              <label>Sévérité</label>
              <div className="severity-buttons">
                {["all", "Mineur", "Modéré", "Majeur"].map(severity => (
                  <button
                    key={severity}
                    className={filters.severity === severity ? "active" : ""}
                    onClick={() => handleSeverityFilter(severity)}
                  >
                    {severity === "all" ? "Tous" : severity}
                  </button>
                ))}
              </div>
            </div>
            <button className="clear-filters-btn" onClick={handleClearFilters}>
              Effacer les filtres
            </button>
          </div>
        </section>

        <section className="incident-management-stats-section">
          <h2>Statistiques</h2>
          <div className="incident-stats">
            <div
              className="stat-item severity-mineur"
              onClick={() => handleSeverityFilter("Mineur")}
            >
              <span className="stat-count">{severityCounts.Mineur}</span>
              <span>Mineur</span>
            </div>
            <div
              className="stat-item severity-modéré"
              onClick={() => handleSeverityFilter("Modéré")}
            >
              <span className="stat-count">{severityCounts.Modéré}</span>
              <span>Modéré</span>
            </div>
            <div
              className="stat-item severity-majeur"
              onClick={() => handleSeverityFilter("Majeur")}
            >
              <span className="stat-count">{severityCounts.Majeur}</span>
              <span>Majeur</span>
            </div>
          </div>
        </section>

        <section className="incident-management-list-section">
          <h2>Historique des Incidents</h2>
          {loading ? (
            <div className="incident-management-loading">Chargement des données...</div>
          ) : filteredIncidents.length > 0 ? (
            <>
              <div className="incident-management-items">
                {paginatedIncidents.map(incident => (
                  <div
                    key={incident.id}
                    className={`incident-management-item severity-${incident.severity.toLowerCase()} ${expandedIncidents[incident.id] ? 'expanded' : ''}`}
                    onClick={() => toggleIncidentDetails(incident.id)}
                  >
                    <h3>{incident.trucks?.immatriculation || "Véhicule inconnu"}</h3>
                    <div className="incident-meta">
                      <span className="incident-type">{incident.type}</span>
                      <span className="incident-date">
                        {new Date(incident.incident_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {expandedIncidents[incident.id] && (
                      <div className="incident-details">
                        <p><strong>Lieu:</strong> {incident.location}</p>
                        <p><strong>Gravité:</strong> {incident.severity}</p>
                        <p><strong>Description:</strong> {incident.description}</p>
                        <p><strong>Assurance:</strong> {incident.reported_to_insurance ? "Oui" : "Non"}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="incident-management-pagination">
                  <div className="pagination-slider">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        className={currentPage === index ? "active" : ""}
                        onClick={() => handlePageChange(index)}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="incident-management-no-incidents">
              Aucun incident trouvé.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default IncidentManagement;