import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./StockManagement.css";
import { supabase } from "../supabase"; // Adjust path to your supabase.js
import Chart from "chart.js/auto";

const StockManagement = () => {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    material: "",
    quantity: "",
    unit: "units",
  });
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [salesHistory, setSalesHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [activeTab, setActiveTab] = useState("inventory");
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch stock items
        const { data: stockData, error: stockError } = await supabase
          .from('stock_items')
          .select('*');

        if (stockError) throw stockError;
        setStockItems(stockData);

        // Fetch sales history
        const { data: salesData, error: salesError } = await supabase
          .from('sales_history')
          .select('*')
          .order('date', { ascending: false });

        if (salesError) throw salesError;
        setSalesHistory(salesData.map(sale => ({
          ...sale,
          date: new Date(sale.date).toLocaleString(),
        })));
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Échec du chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (chartRef.current && activeTab === "statistics") {
      const ctx = chartRef.current.getContext("2d");

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const salesByMaterial = salesHistory.reduce((acc, sale) => {
        acc[sale.material] = (acc[sale.material] || 0) + sale.quantity_sold;
        return acc;
      }, {});

      const labels = Object.keys(salesByMaterial);
      const data = Object.values(salesByMaterial);

      chartInstanceRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Quantité Vendue",
              data: data,
              backgroundColor: "#d4af37",
              borderColor: "#c4a030",
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Quantité",
                color: "#e5e5e5",
              },
              ticks: {
                color: "#e5e5e5",
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)",
              },
            },
            x: {
              title: {
                display: true,
                text: "Matériau",
                color: "#e5e5e5",
              },
              ticks: {
                color: "#e5e5e5",
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)",
              },
            },
          },
          plugins: {
            legend: {
              labels: {
                color: "#e5e5e5",
              },
            },
          },
        },
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [salesHistory, activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.material || !formData.quantity) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError("La quantité doit être un nombre positif.");
      return;
    }

    try {
      setError(null);
      if (editingId) {
        const { error } = await supabase
          .from('stock_items')
          .update({
            material: formData.material,
            quantity: quantity,
            unit: formData.unit,
          })
          .eq('id', editingId);

        if (error) throw error;

        setStockItems((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? { ...item, material: formData.material, quantity, unit: formData.unit }
              : item
          )
        );
        setEditingId(null);
      } else {
        const { data, error } = await supabase
          .from('stock_items')
          .insert([{
            material: formData.material,
            quantity: quantity,
            unit: formData.unit,
          }])
          .select();

        if (error) throw error;

        setStockItems((prev) => [...prev, data[0]]);
      }

      setFormData({ material: "", quantity: "", unit: "units" });
      setShowForm(false);
    } catch (err) {
      console.error("Error saving stock item:", err);
      setError("Erreur lors de l'enregistrement de l'élément de stock.");
    }
  };

  const handleEdit = (item) => {
    setFormData({
      material: item.material,
      quantity: item.quantity,
      unit: item.unit,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSell = async (item) => {
    const quantityToSell = parseFloat(prompt(`Entrez la quantité à vendre pour ${item.material} (${item.unit}):`, "0"));
    if (isNaN(quantityToSell) || quantityToSell <= 0) {
      setError("La quantité à vendre doit être un nombre positif.");
      return;
    }
    if (quantityToSell > item.quantity) {
      setError("La quantité à vendre ne peut pas dépasser la quantité en stock.");
      return;
    }

    try {
      setError(null);
      const newQuantity = item.quantity - quantityToSell;

      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ quantity: newQuantity })
        .eq('id', item.id);

      if (updateError) throw updateError;

      setStockItems((prev) =>
        prev.map((stockItem) =>
          stockItem.id === item.id ? { ...stockItem, quantity: newQuantity } : stockItem
        )
      );

      const sale = {
        material: item.material,
        quantity_sold: quantityToSell,
        unit: item.unit,
        date: new Date().toISOString(),
      };

      const { data: saleData, error: saleError } = await supabase
        .from('sales_history')
        .insert([sale])
        .select();

      if (saleError) throw saleError;

      setSalesHistory((prev) => [
        { ...saleData[0], date: new Date(saleData[0].date).toLocaleString() },
        ...prev,
      ]);
    } catch (err) {
      console.error("Error processing sale:", err);
      setError("Erreur lors du traitement de la vente.");
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sortedData = [...salesHistory].sort((a, b) => {
      if (key === "quantity_sold") {
        return direction === "asc"
          ? a.quantity_sold - b.quantity_sold
          : b.quantity_sold - a.quantity_sold;
      } else {
        const valueA = a[key].toString().toLowerCase();
        const valueB = b[key].toString().toLowerCase();
        if (direction === "asc") {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
      }
    });

    setSalesHistory(sortedData);
    setSortConfig({ key, direction });
  };

  const filteredStockItems = stockItems.filter((item) =>
    item.material.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="stock-management-container">
      <aside className="stock-management-sidebar">
        <h2 className="stock-management-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Tableau de Bord</Link>
            </li>
            <li>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li className="active">
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
        <div className="stock-management-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>

      <main className="stock-management-content">
        <header className="stock-management-header">
          <div>
            <h1>📦 Gestion de Stock</h1>
          </div>
          <div className="stock-management-header-actions">
            <button
              className="stock-management-toggle-form-btn"
              onClick={() => setShowForm(true)}
            >
              Ajouter/Modifier un Élément
            </button>
            <Link to="/fleet/dashboard" className="stock-management-back-btn">
              ⬅ Retour au Tableau de Bord
            </Link>
          </div>
        </header>

        <div className="stock-management-tabs">
          <button
            className={`stock-management-tab ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            Inventaire
          </button>
          <button
            className={`stock-management-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            Historique des Ventes
          </button>
          <button
            className={`stock-management-tab ${activeTab === "statistics" ? "active" : ""}`}
            onClick={() => setActiveTab("statistics")}
          >
            Statistiques des Ventes
          </button>
        </div>

        {error && <div className="stock-management-error-message">{error}</div>}

        {activeTab === "inventory" && (
          <div className="stock-management-inventory-section">
            <div className="stock-management-filter-controls">
              <h2>Inventaire Actuel</h2>
              <div className="stock-management-filter-options">
                <label className="stock-management-label">Rechercher: </label>
                <input
                  type="text"
                  placeholder="Rechercher par matériau..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="stock-management-search-bar"
                />
              </div>
            </div>
            {loading ? (
              <div className="stock-management-loading">Chargement des données...</div>
            ) : filteredStockItems.length > 0 ? (
              <div className="stock-management-table-container">
                <table className="stock-management-table">
                  <thead>
                    <tr>
                      <th>Matériau</th>
                      <th>Quantité</th>
                      <th>Unité</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.material}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>
                          <button
                            className="stock-management-edit-btn"
                            onClick={() => handleEdit(item)}
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            className="stock-management-sell-btn"
                            onClick={() => handleSell(item)}
                          >
                            💸 Vendre
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="stock-management-no-items">
                {searchQuery
                  ? "Aucun élément trouvé pour cette recherche."
                  : "Aucun élément de stock trouvé."}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="stock-management-inventory-section">
            <div className="stock-management-filter-controls">
              <h2>Historique des Ventes</h2>
            </div>
            {salesHistory.length > 0 ? (
              <div className="stock-management-table-container">
                <table className="stock-management-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("material")} className="sortable">
                        Matériau
                        {sortConfig.key === "material" && (
                          <span>{sortConfig.direction === "asc" ? " ↑" : " ↓"}</span>
                        )}
                      </th>
                      <th onClick={() => handleSort("quantity_sold")} className="sortable">
                        Quantité Vendue
                        {sortConfig.key === "quantity_sold" && (
                          <span>{sortConfig.direction === "asc" ? " ↑" : " ↓"}</span>
                        )}
                      </th>
                      <th onClick={() => handleSort("unit")} className="sortable">
                        Unité
                        {sortConfig.key === "unit" && (
                          <span>{sortConfig.direction === "asc" ? " ↑" : " ↓"}</span>
                        )}
                      </th>
                      <th onClick={() => handleSort("date")} className="sortable">
                        Date
                        {sortConfig.key === "date" && (
                          <span>{sortConfig.direction === "asc" ? " ↑" : " ↓"}</span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map((sale) => (
                      <tr key={sale.id}>
                        <td>{sale.material}</td>
                        <td>{sale.quantity_sold}</td>
                        <td>{sale.unit}</td>
                        <td>{sale.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="stock-management-no-items">Aucune vente enregistrée.</div>
            )}
          </div>
        )}

        {activeTab === "statistics" && (
          <div className="stock-management-inventory-section">
            <div className="stock-management-filter-controls">
              <h2>Statistiques des Ventes</h2>
            </div>
            <div className="stock-management-chart-container">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        )}

        {showForm && (
          <div className="stock-management-modal">
            <div className="stock-management-modal-content">
              <button
                className="stock-management-modal-close"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ material: "", quantity: "", unit: "units" });
                  setEditingId(null);
                }}
              >
                ✕
              </button>
              <section className="stock-management-form-section">
                <h2>{editingId ? "Modifier l'Élément" : "Ajouter un Élément de Stock"}</h2>
                <form onSubmit={handleSubmit} className="stock-management-form">
                  <div className="stock-management-form-group">
                    <label htmlFor="material">Matériau</label>
                    <input
                      type="text"
                      id="material"
                      name="material"
                      value={formData.material}
                      onChange={handleInputChange}
                      placeholder="ex: Briques"
                      required
                    />
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="quantity">Quantité</label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      placeholder="ex: 1000"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="unit">Unité</label>
                    <select id="unit" name="unit" value={formData.unit} onChange={handleInputChange}>
                      <option value="units">Unités</option>
                      <option value="kg">Kilogrammes</option>
                      <option value="tons">Tonnes</option>
                      <option value="p">Pièces</option>
                    </select>
                  </div>
                  <div className="stock-management-form-actions">
                    <button type="submit" className="stock-management-save-btn">
                      {editingId ? "Mettre à jour" : "Ajouter"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        className="stock-management-cancel-btn"
                        onClick={() => {
                          setFormData({ material: "", quantity: "", unit: "units" });
                          setEditingId(null);
                        }}
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockManagement;