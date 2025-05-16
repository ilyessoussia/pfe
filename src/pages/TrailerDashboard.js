import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./FleetDashboard.css"; // Reuse FleetDashboard.css
import TrailerForm from "./TrailerForm";
import { supabase } from "../supabase";

const TrailerDashboard = () => {
  const [trailers, setTrailers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());
  const [fleetStats, setFleetStats] = useState({ totalTrailers: 0 });

  const fetchTrailers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trailers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTrailers = data.map(trailer => ({
        id: trailer.id,
        vin: trailer.vin,
        immatriculation: trailer.immatriculation,
        dpmc: trailer.dpmc ? new Date(trailer.dpmc).toLocaleDateString('fr-FR') : "N/A",
        ptac: trailer.ptac ? `${trailer.ptac} kg` : "N/A",
        axle_reference: trailer.axle_reference,
        last_insurance_date: trailer.last_insurance_date ? new Date(trailer.last_insurance_date).toLocaleDateString('fr-FR') : "N/A",
        insurance_expiry_date: trailer.insurance_expiry_date ? new Date(trailer.insurance_expiry_date).toLocaleDateString('fr-FR') : "N/A",
        last_technical_inspection: trailer.last_technical_inspection ? new Date(trailer.last_technical_inspection).toLocaleDateString('fr-FR') : "N/A",
        next_technical_inspection: trailer.next_technical_inspection ? new Date(trailer.next_technical_inspection).toLocaleDateString('fr-FR') : "N/A",
        description: trailer.description || "Aucune description",
        raw: trailer // Store raw data for editing
      }));

      setTrailers(formattedTrailers);
      setFleetStats({ totalTrailers: formattedTrailers.length });
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Error fetching trailers:", err);
      setError("Échec du chargement des données des remorques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrailers();
  }, []);

  const handleRefresh = () => {
    fetchTrailers();
  };

  const handleEdit = (trailer) => {
    setEditingTrailer(trailer.raw);
    setShowForm(true);
  };

  const filteredTrailers = trailers.filter(trailer =>
    !searchQuery || trailer.immatriculation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
            </li>
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
            <li className="active">
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
            <h1>Gestion des Remorques</h1>
            <p className="last-updated">Mise à jour: {lastUpdated}</p>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
              {loading ? "🔄" : "Actualiser🔄"}
            </button>
            <button className="add-truck" onClick={() => {
              setEditingTrailer(null);
              setShowForm(!showForm);
            }}>
              Ajouter une remorque +
            </button>
          </div>
        </header>

        {showForm && (
          <TrailerForm
            trailer={editingTrailer}
            onClose={() => {
              setShowForm(false);
              setEditingTrailer(null);
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
                  <h2>Remorques</h2>
                  <p className="total-trucks">{fleetStats.totalTrailers} remorques</p>
                </div>
                <div className="filter-controls">
                  <input
                    type="text"
                    placeholder="Rechercher par matricule..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="search-bar"
                  />
                </div>
              </div>

              <div className="truck-cards">
                {loading ? (
                  <div className="loading">Chargement...</div>
                ) : filteredTrailers.length > 0 ? (
                  filteredTrailers.map(trailer => (
                    <div key={trailer.id} className="truck-card">
                      <div className="truck-header">
                        <h2>{trailer.immatriculation || trailer.id}</h2>
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(trailer)}
                          aria-label={`Modifier la remorque ${trailer.immatriculation}`}
                        >
                          ✏️ Modifier
                        </button>
                      </div>
                      <div className="truck-details">
                        <div className="detail-row">
                          <span className="detail-label">🔢 VIN</span>
                          <span className="detail-value">{trailer.vin}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">📅 DPMC</span>
                          <span className="detail-value">{trailer.dpmc}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">⚖️ PTAC</span>
                          <span className="detail-value">{trailer.ptac}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">🛞 Référence d’essieux</span>
                          <span className="detail-value">{trailer.axle_reference}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">🛡️ Dernière Assurance</span>
                          <span className="detail-value">{trailer.last_insurance_date}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">📅 Expiration Assurance</span>
                          <span className="detail-value">{trailer.insurance_expiry_date}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">🔍 Dernier Contrôle Technique</span>
                          <span className="detail-value">{trailer.last_technical_inspection}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">🕒 Prochain Contrôle Technique</span>
                          <span className="detail-value">{trailer.next_technical_inspection}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">📝 Description</span>
                          <span className="detail-value">{trailer.description}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-trucks">
                    {searchQuery ? "Aucune remorque trouvée." : "Aucune remorque."}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TrailerDashboard;