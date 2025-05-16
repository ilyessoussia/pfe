import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import "./StockCarburant.css";

const StockCarburant = () => {
  const [tankLevel, setTankLevel] = useState(null);
  const [tankCapacity] = useState(35000.0);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [newRestock, setNewRestock] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [restockError, setRestockError] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchTankLevel = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_tank')
        .select('current_level')
        .single();
      if (error) {
        console.error("Supabase fetch tank level error:", error);
        throw error;
      }
      console.log("Fetched tank level:", data.current_level);
      setTankLevel(parseFloat(data.current_level));
    } catch (err) {
      console.error("Error fetching tank level:", err);
      setFetchError(`Erreur lors du chargement du niveau du réservoir: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchTankLevel();

    const subscription = supabase
      .channel('fuel_tank_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fuel_tank' },
        (payload) => {
          console.log("Tank level updated:", payload.new.current_level);
          setTankLevel(parseFloat(payload.new.current_level));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const handleOpenRestockModal = () => {
    setShowRestockModal(true);
    setRestockError("");
    setNewRestock({
      amount: "",
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleCloseRestockModal = () => {
    setShowRestockModal(false);
  };

  const handleRestockInputChange = (e) => {
    const { name, value } = e.target;
    setNewRestock({
      ...newRestock,
      [name]: value,
    });
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!newRestock.amount) {
      setRestockError("Le montant est obligatoire");
      return;
    }
    const amount = parseFloat(newRestock.amount);
    const inputDate = new Date(newRestock.date);
    if (isNaN(amount)) {
      setRestockError("Le montant doit être un nombre");
      return;
    }
    if (amount <= 0) {
      setRestockError("Le montant doit être supérieur à zéro");
      return;
    }
    if (inputDate > new Date()) {
      setRestockError("La date ne peut pas être dans le futur");
      return;
    }
    if (tankLevel !== null && (tankLevel + amount) > tankCapacity) {
      setRestockError(`Le réservoir dépasserait sa capacité de ${tankCapacity} L`);
      return;
    }
    try {
      setRestockLoading(true);

      const { data: tankData, error: tankFetchError } = await supabase
        .from('fuel_tank')
        .select('id, current_level')
        .single();
      if (tankFetchError) {
        console.error("Error fetching tank:", tankFetchError);
        throw tankFetchError;
      }

      const newTankLevel = tankData.current_level + amount;
      const { error: tankUpdateError } = await supabase
        .from('fuel_tank')
        .update({ current_level: newTankLevel, updated_at: new Date().toISOString() })
        .eq('id', tankData.id);
      if (tankUpdateError) {
        console.error("Supabase update tank error:", tankUpdateError);
        throw tankUpdateError;
      }

      const { error: transactionError } = await supabase
        .from('fuel_tank_transactions')
        .insert([{
          tank_id: tankData.id,
          amount,
          type: 'restock',
          truck_id: null,
          created_at: new Date().toISOString(),
        }]);
      if (transactionError) {
        console.error("Supabase insert transaction error:", transactionError);
        throw transactionError;
      }

      setTankLevel(newTankLevel);
      setShowRestockModal(false);
      alert("Réservoir réapprovisionné avec succès !");
    } catch (err) {
      console.error("Error restocking tank:", err);
      setRestockError(`Erreur lors du réapprovisionnement: ${err.message}`);
    } finally {
      setRestockLoading(false);
    }
  };

  return (
    <div className="stock-carburant-container">
      <aside className="sidebar">
        <h2 className="stock-carburant-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
            </li>
            <li><Link to="/cash-tracking">💵 Gestion de Caisse</Link></li>
            <li>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li className="active">
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
        <div className="stock-carburant-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>
      <main className="stock-carburant-content">
        <header className="stock-carburant-header">
          <h1>⛽ Stock Carburant</h1>
        </header>
        {fetchError && <div className="stock-carburant-error-message">{fetchError}</div>}
        <section className="tank-section">
          <div className="tank-status">
            <div className="tank-visual" style={{ '--tank-level': tankLevel !== null ? (tankLevel / tankCapacity) * 100 : 0 }}>
              <div className="tank-liquid"></div>
            </div>
            <div className="tank-info">
              <h2>Niveau du Réservoir</h2>
              <p>Capacité: {tankCapacity.toFixed(2)} L</p>
              <p>
                Niveau actuel: {tankLevel !== null ? `${tankLevel.toFixed(2)} L` : "Chargement..."}
                {tankLevel !== null && (
                  <span> ({((tankLevel / tankCapacity) * 100).toFixed(1)}%)</span>
                )}
              </p>
              {tankLevel !== null && tankLevel < 5000 && (
                <p className="low-fuel-warning">⚠️ Niveau de carburant faible !</p>
              )}
              <button className="restock-tank-btn" onClick={handleOpenRestockModal}>
                <span className="plus-icon">+</span> Réapprovisionner Réservoir
              </button>
            </div>
          </div>
        </section>
        {showRestockModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Réapprovisionner Réservoir</h3>
                <button className="close-modal" onClick={handleCloseRestockModal}>
                  ×
                </button>
              </div>
              <form onSubmit={handleRestockSubmit} className="restock-form">
                {restockError && <div className="error-message">{restockError}</div>}
                <div className="form-group">
                  <label htmlFor="restockDate">Date</label>
                  <input
                    type="date"
                    id="restockDate"
                    name="date"
                    value={newRestock.date}
                    onChange={handleRestockInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="amount">
                    Quantité ajoutée (L)
                    {tankLevel !== null && (
                      <span className="hint">
                        (Capacité restante: {(tankCapacity - tankLevel).toFixed(2)} L)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={newRestock.amount}
                    onChange={handleRestockInputChange}
                    placeholder="ex: 10000"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={handleCloseRestockModal}
                    disabled={restockLoading}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="save-btn" disabled={restockLoading}>
                    {restockLoading ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockCarburant;