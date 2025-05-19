import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import "./StockCarburant.css";

const StockCarburant = () => {
  const [tankLevel, setTankLevel] = useState(0);
  const [tankCapacity] = useState(35000.0);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [newRestock, setNewRestock] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [restockError, setRestockError] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState("");
  const [recentFuelActivities, setRecentFuelActivities] = useState([]);
  const [showFuelActivities, setShowFuelActivities] = useState(true);

  const fetchTankLevel = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_tank')
        .select('current_level')
        .single();
      if (error) {
        if (error.code === 'PGRST116') {
          console.log("No tank data found, setting level to 0");
          setTankLevel(0);
          return;
        }
        console.error("Supabase fetch tank level error:", error);
        throw error;
      }
      console.log("Fetched tank level:", data.current_level);
      setTankLevel(parseFloat(data.current_level) || 0);
    } catch (err) {
      console.error("Error fetching tank level:", err);
      setFetchError(`Erreur lors du chargement du niveau du réservoir: ${err.message}`);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('fuel_tank_transactions')
        .select('id, created_at, amount, type')
        .eq('type', 'restock')
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Supabase fetch transactions error:", error);
        throw error;
      }
      console.log("Fetched transactions:", data);
      setTransactions(data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactionsError(`Erreur lors du chargement de l'historique: ${err.message}`);
    }
  };

  const fetchFuelActivities = async () => {
    try {
      const { data: fuelData, error: fuelError } = await supabase
        .from('fuel_history')
        .select('truck_id, liters_per_100km, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      if (fuelError) {
        console.error("Supabase fetch fuel history error:", fuelError);
        throw fuelError;
      }
      console.log("Fetched fuel history:", fuelData);

      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('id, immatriculation');
      if (trucksError) {
        console.error("Supabase fetch trucks error:", trucksError);
        throw trucksError;
      }
      console.log("Fetched trucks:", trucksData);

      const truckMap = {};
      trucksData.forEach(truck => {
        truckMap[truck.id] = truck.immatriculation || "Camion";
      });

      const fuelActivities = fuelData.map(fuel => ({
        type: "fuel",
        data: {
          truckId: fuel.truck_id,
          litersPer100km: fuel.liters_per_100km,
        },
        timestamp: new Date(fuel.created_at),
        truck: truckMap[fuel.truck_id] || "Camion",
      }));
      setRecentFuelActivities(fuelActivities);
    } catch (err) {
      console.error("Error fetching fuel activities:", err);
      setFetchError(`Erreur lors du chargement des activités de carburant: ${err.message}`);
    }
  };

  const handleDeleteTransaction = async (id, amount) => {
    try {
      const { data: tankData, error: tankFetchError } = await supabase
        .from('fuel_tank')
        .select('id, current_level')
        .single();
      if (tankFetchError) {
        console.error("Error fetching tank:", tankFetchError);
        throw tankFetchError;
      }

      const newTankLevel = tankData.current_level - amount;
      if (newTankLevel < 0) {
        throw new Error("La suppression rendrait le niveau du réservoir négatif");
      }

      const { error: tankUpdateError } = await supabase
        .from('fuel_tank')
        .update({ current_level: newTankLevel, updated_at: new Date().toISOString() })
        .eq('id', tankData.id);
      if (tankUpdateError) {
        console.error("Supabase update tank error:", tankUpdateError);
        throw tankUpdateError;
      }

      const { error: deleteError } = await supabase
        .from('fuel_tank_transactions')
        .delete()
        .eq('id', id);
      if (deleteError) {
        console.error("Supabase delete transaction error:", deleteError);
        throw deleteError;
      }

      setTransactions(transactions.filter(transaction => transaction.id !== id));
      setTankLevel(newTankLevel);
      alert("Transaction supprimée avec succès !");
    } catch (err) {
      console.error("Error deleting transaction:", err);
      setTransactionsError(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  const handleRefresh = async () => {
    setFetchError("");
    setTransactionsError("");
    await Promise.all([
      fetchTankLevel(),
      fetchTransactions(),
      fetchFuelActivities()
    ]);
  };

  useEffect(() => {
    fetchTankLevel();
    fetchTransactions();
    fetchFuelActivities();

    const tankSubscription = supabase
      .channel('fuel_tank_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fuel_tank' },
        (payload) => {
          console.log("Tank level updated:", payload.new.current_level);
          setTankLevel(parseFloat(payload.new.current_level) || 0);
        }
      )
      .subscribe();

    const transactionSubscription = supabase
      .channel('fuel_tank_transactions_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fuel_tank_transactions' },
        (payload) => {
          if (payload.new.type === 'restock') {
            console.log("New restock transaction:", payload.new);
            setTransactions((prev) => [payload.new, ...prev]);
          } else if (payload.new.type === 'refuel') {
            console.log("New refuel transaction:", payload.new);
            fetchFuelActivities();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tankSubscription);
      supabase.removeChannel(transactionSubscription);
    };
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
    if (tankLevel + amount > tankCapacity) {
      setRestockError(`Le réservoir dépasserait sa capacité de ${tankCapacity} L`);
      return;
    }
    try {
      setRestockLoading(true);

      let tankData;
      const { data: fetchData, error: tankFetchError } = await supabase
        .from('fuel_tank')
        .select('id, current_level')
        .single();
      if (tankFetchError && tankFetchError.code === 'PGRST116') {
        console.log("No tank found, creating new tank with level 0");
        const { data: newTank, error: insertError } = await supabase
          .from('fuel_tank')
          .insert([{ current_level: 0, updated_at: new Date().toISOString() }])
          .select()
          .single();
        if (insertError) {
          console.error("Error creating tank:", insertError);
          throw insertError;
        }
        tankData = newTank;
      } else if (tankFetchError) {
        console.error("Error fetching tank:", tankFetchError);
        throw tankFetchError;
      } else {
        tankData = fetchData;
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <p>© 2025 </p>
        </div>
      </aside>
      <main className="stock-carburant-content">
        <header className="stock-carburant-header">
          <h1>⛽ Stock Carburant</h1>
        </header>
        {fetchError && <div className="stock-carburant-error-message">{fetchError}</div>}
        <div className="dashboard-grid">
          <div className="main-content">
            <section className="tank-section">
              <div className="tank-status">
                <div className="tank-visual" style={{ '--tank-level': (tankLevel / tankCapacity) * 100 }}>
                  <div className="tank-liquid"></div>
                </div>
                <div className="tank-info">
                  <h2>Niveau du Réservoir</h2>
                  <p>Capacité: {tankCapacity.toFixed(2)} L</p>
                  <p>
                    Niveau actuel: {tankLevel.toFixed(2)} L
                    <span> ({((tankLevel / tankCapacity) * 100).toFixed(1)}%)</span>
                  </p>
                  {tankLevel < 5000 && (
                    <p className="low-fuel-warning">⚠️ Niveau de carburant faible !</p>
                  )}
                  <button className="restock-tank-btn" onClick={handleOpenRestockModal}>
                    <span className="plus-icon">+</span> Réapprovisionner Réservoir
                  </button>
                </div>
              </div>
            </section>
            <section className="history-section">
              <h2>Historique des Réapprovisionnements</h2>
              <button className="refresh-btn" onClick={handleRefresh} title="Rafraîchir les données">
                🔄 Rafraîchir
              </button>
              {transactionsError && <div className="stock-carburant-error-message">{transactionsError}</div>}
              {transactions.length === 0 ? (
                <p className="no-history">Aucun réapprovisionnement enregistré.</p>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Quantité (L)</th>
                      <th>Type</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.created_at)}</td>
                        <td>{transaction.amount.toFixed(2)}</td>
                        <td>{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</td>
                        <td>
                          <button
                            className="delete-history-btn"
                            onClick={() => handleDeleteTransaction(transaction.id, transaction.amount)}
                            aria-label={`Supprimer la transaction du ${formatDate(transaction.created_at)}`}
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
          <section className={`recent-fuel-activities ${showFuelActivities ? "expanded" : "collapsed"}`}>
            <div className="fuel-activities-header">
              <h2>Activités de Carburant Récentes</h2>
              <button onClick={() => setShowFuelActivities(!showFuelActivities)}>
                {showFuelActivities ? "↑ Masquer" : "↓ Afficher"}
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
                    <span className="hint">
                      (Capacité restante: {(tankCapacity - tankLevel).toFixed(2)} L)
                    </span>
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