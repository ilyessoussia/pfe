import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./TrailerDashboard.css";
import TrailerForm from "./TrailerForm";
import { supabase } from "../supabase";

const TrailerDashboard = () => {
  const [trailers, setTrailers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const fetchTrailers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trailers')
        .select('id, vin, immatriculation, ptac, insurance_expiry_date, next_technical_inspection, is_active')
        .order('immatriculation', { ascending: true });

      if (error) throw error;

      const formattedTrailers = data.map(trailer => ({
        id: trailer.id,
        vin: trailer.vin || "Non spécifié",
        immatriculation: trailer.immatriculation || "Non spécifié",
        ptac: trailer.ptac ? `${trailer.ptac} kg` : "Non spécifié",
        insurance_expiry_date: trailer.insurance_expiry_date ? new Date(trailer.insurance_expiry_date).toLocaleDateString('fr-FR') : "Non spécifiée",
        next_technical_inspection: trailer.next_technical_inspection ? new Date(trailer.next_technical_inspection).toLocaleDateString('fr-FR') : "Non spécifiée",
        is_active: trailer.is_active,
      }));

      setTrailers(formattedTrailers);
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredTrailers = trailers.filter(trailer =>
    trailer.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trailer.vin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (trailerId) => {
    try {
      const { error } = await supabase
        .from('trailers')
        .delete()
        .eq('id', trailerId);

      if (error) throw error;

      setShowDeleteConfirm(null);
      setSuccess("Remorque supprimée avec succès !");
      fetchTrailers();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error deleting trailer:", err);
      setError("Échec de la suppression de la remorque.");
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
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
            <h1>🚛 Gestion des Remorques</h1>
            <p className="last-updated">Mise à jour: {lastUpdated}</p>
          </div>
          <div className="header-actions">
            <input
              type="text"
              placeholder="Rechercher par VIN ou Immatriculation"
              value={searchTerm}
              onChange={handleSearch}
              className="search-bar"
            />
            <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
              {loading ? "🔄" : "Actualiser🔄"}
            </button>
            <button className="add-trailer" onClick={() => setShowForm(!showForm)}>
              Ajouter une remorque +
            </button>
          </div>
        </header>

        {showForm && (
          <TrailerForm
            trailer={null}
            onClose={() => {
              setShowForm(false);
              handleRefresh();
            }}
          />
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-content delete-confirm">
              <h3>Confirmer la suppression</h3>
              <p>Êtes-vous sûr de vouloir supprimer la remorque {trailers.find(t => t.id === showDeleteConfirm)?.immatriculation} ?</p>
              <div className="form-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Annuler
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(showDeleteConfirm)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="trailer-section">
          {loading ? (
            <div className="loading">Chargement...</div>
          ) : filteredTrailers.length > 0 ? (
            <div className="trailer-boxes">
              {filteredTrailers.map(trailer => (
                <div key={trailer.id} className="trailer-box-wrapper">
                  <Link
                    to={`/trailers/${trailer.id}`}
                    className="trailer-box"
                  >
                    <h3>🚚 {trailer.immatriculation}</h3>
                    <div className="trailer-details">
                      <p><strong>VIN:</strong> {trailer.vin}</p>
                      <p><strong>PTAC:</strong> {trailer.ptac}</p>
                      <p><strong>Expiration Assurance:</strong> {trailer.insurance_expiry_date}</p>
                      <p><strong>Prochain Contrôle:</strong> {trailer.next_technical_inspection}</p>
                      <p><strong>Statut:</strong> {trailer.is_active ? "Actif" : "Inactif"}</p>
                    </div>
                  </Link>
                  <button
                    className="delete-icon"
                    onClick={() => setShowDeleteConfirm(trailer.id)}
                    aria-label={`Supprimer la remorque ${trailer.immatriculation}`}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-trailers">Aucune remorque trouvée.</div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TrailerDashboard;