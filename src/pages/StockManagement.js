import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./StockManagement.css";
import { supabase } from "../supabase";
import Chart from "chart.js/auto";

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: "",
    usine: "",
    poids: "",
    type: "",
    résistance: "",
    image: null,
  });
  const [sellFormData, setSellFormData] = useState({
    quantity_sold: "",
    client_name: "",
  });
  const [restockFormData, setRestockFormData] = useState({
    quantity_to_add: "",
  });
  const [sellingProduct, setSellingProduct] = useState(null);
  const [restockingProduct, setRestockingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSellForm, setShowSellForm] = useState(false);
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [activeTab, setActiveTab] = useState("inventory");
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Fetch products and sales history, set up real-time subscriptions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch products
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (productError) throw productError;
        setProducts(productData);

        // Fetch sales history
        const { data: salesData, error: salesError } = await supabase
          .from("sales_history")
          .select("*")
          .order("date", { ascending: false });

        if (salesError) throw salesError;
        setSalesHistory(
          salesData.map((sale) => ({
            ...sale,
            date: new Date(sale.date).toLocaleString(),
          }))
        );
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Échec du chargement des données: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscriptions
    const productSubscription = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setProducts((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setProducts((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setProducts((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    const salesSubscription = supabase
      .channel("sales_history_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_history" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSalesHistory((prev) => [
              {
                ...payload.new,
                date: new Date(payload.new.date).toLocaleString(),
              },
              ...prev,
            ]);
          } else if (payload.eventType === "UPDATE") {
            setSalesHistory((prev) =>
              prev.map((item) =>
                item.id === payload.new.id
                  ? { ...payload.new, date: new Date(payload.new.date).toLocaleString() }
                  : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setSalesHistory((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productSubscription);
      supabase.removeChannel(salesSubscription);
    };
  }, []);

  // Handle chart rendering
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
              ticks: { color: "#e5e5e5" },
              grid: { color: "rgba(255, 255, 255, 0.1)" },
            },
            x: {
              title: {
                display: true,
                text: "Matériau",
                color: "#e5e5e5",
              },
              ticks: { color: "#e5e5e5" },
              grid: { color: "rgba(255, 255, 255, 0.1)" },
            },
          },
          plugins: {
            legend: {
              labels: { color: "#e5e5e5" },
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

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setProductFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner une image valide (PNG, JPEG, etc.).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5 Mo.");
        return;
      }
      setProductFormData((prev) => ({ ...prev, image: file }));
    }
  };

  const handleSellInputChange = (e) => {
    const { name, value } = e.target;
    setSellFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRestockInputChange = (e) => {
    const { name, value } = e.target;
    setRestockFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (
      !productFormData.name ||
      !productFormData.usine ||
      !productFormData.poids ||
      !productFormData.type ||
      !productFormData.résistance
    ) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setError(null);
      let imageUrl = productFormData.image_url || null;

      // Handle image upload
      if (productFormData.image) {
        const fileExt = productFormData.image.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, productFormData.image);

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          throw new Error(`Échec du téléchargement de l'image: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        if (!urlData.publicUrl) {
          throw new Error("Impossible de récupérer l'URL publique de l'image.");
        }
        imageUrl = urlData.publicUrl;
      }

      // Insert new product
      const { error } = await supabase
        .from("products")
        .insert([
          {
            name: productFormData.name,
            usine: productFormData.usine,
            poids: productFormData.poids,
            type: productFormData.type,
            résistance: productFormData.résistance,
            image_url: imageUrl,
            quantité: 0, // Initial quantity is 0
          },
        ]);

      if (error) {
        console.error("Insert error:", error);
        throw new Error(`Échec de l'ajout du produit: ${error.message}`);
      }

      setProductFormData({
        name: "",
        usine: "",
        poids: "",
        type: "",
        résistance: "",
        image: null,
      });
      setShowProductForm(false);
    } catch (err) {
      console.error("Error saving product:", err);
      setError(`Erreur lors de l'enregistrement du produit: ${err.message}`);
    }
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    const quantitySold = parseFloat(sellFormData.quantity_sold);
    if (
      isNaN(quantitySold) ||
      quantitySold <= 0 ||
      quantitySold > sellingProduct.quantité
    ) {
      setError(
        "La quantité vendue doit être un nombre positif et ne peut pas dépasser la quantité en stock."
      );
      return;
    }

    try {
      setError(null);

      // Record sale in sales_history
      const sale = {
        material: sellingProduct.name,
        quantity_sold: quantitySold,
        unit: sellingProduct.poids.includes("kg") ? "kg" : "units",
        client_name: sellFormData.client_name,
        date: new Date().toISOString(),
      };

      const { error: saleError } = await supabase
        .from("sales_history")
        .insert([sale]);

      if (saleError) {
        console.error("Sale error:", saleError);
        throw new Error(`Échec de l'enregistrement de la vente: ${saleError.message}`);
      }

      // Update product quantity
      const newQuantity = sellingProduct.quantité - quantitySold;
      const { error: updateError } = await supabase
        .from("products")
        .update({ quantité: newQuantity })
        .eq("id", sellingProduct.id);

      if (updateError) {
        console.error("Update quantity error:", updateError);
        throw new Error(`Échec de la mise à jour de la quantité: ${updateError.message}`);
      }

      setSellFormData({ quantity_sold: "", client_name: "" });
      setShowSellForm(false);
      setSellingProduct(null);
    } catch (err) {
      console.error("Error processing sale:", err);
      setError(`Erreur lors du traitement de la vente: ${err.message}`);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    const quantityToAdd = parseFloat(restockFormData.quantity_to_add);
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
      setError("La quantité à ajouter doit être un nombre positif.");
      return;
    }

    try {
      setError(null);

      // Update product quantity
      const newQuantity = restockingProduct.quantité + quantityToAdd;
      const { error: updateError } = await supabase
        .from("products")
        .update({ quantité: newQuantity })
        .eq("id", restockingProduct.id);

      if (updateError) {
        console.error("Update quantity error:", updateError);
        throw new Error(`Échec de la mise à jour de la quantité: ${updateError.message}`);
      }

      setRestockFormData({ quantity_to_add: "" });
      setShowRestockForm(false);
      setRestockingProduct(null);
    } catch (err) {
      console.error("Error restocking product:", err);
      setError(`Erreur lors du réapprovisionnement: ${err.message}`);
    }
  };

  const handleSell = (product) => {
    setSellingProduct(product);
    setSellFormData({ quantity_sold: "", client_name: "" });
    setShowSellForm(true);
  };

  const handleRestock = (product) => {
    setRestockingProduct(product);
    setRestockFormData({ quantity_to_add: "" });
    setShowRestockForm(true);
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
        const valueA = (a[key] || "").toString().toLowerCase();
        const valueB = (b[key] || "").toString().toLowerCase();
        return direction === "asc"
          ? valueA < valueB
            ? -1
            : valueA > valueB
            ? 1
            : 0
          : valueA > valueB
          ? -1
          : valueA < valueB
          ? 1
          : 0;
      }
    });

    setSalesHistory(sortedData);
    setSortConfig({ key, direction });
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="stock-management-container">
      <aside className="sidebar">
        <h2 className="stock-management-fleet-title">Système de Gestion & Contrôle</h2>
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
            <li className="active">
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
              onClick={() => setShowProductForm(true)}
            >
              Ajouter un Produit
            </button>
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
                  placeholder="Rechercher par nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="stock-management-search-bar"
                />
              </div>
            </div>
            {loading ? (
              <div className="stock-management-loading">Chargement des données...</div>
            ) : filteredProducts.length > 0 ? (
              <div className="stock-management-table-container">
                <table className="stock-management-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Usine</th>
                      <th>Poids</th>
                      <th>Type</th>
                      <th>Résistance</th>
                      <th>Quantité</th>
                      <th>Image</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.usine}</td>
                        <td>{product.poids}</td>
                        <td>{product.type}</td>
                        <td>{product.résistance}</td>
                        <td>{product.quantité}</td>
                        <td>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              style={{ width: "50px", height: "50px", objectFit: "contain" }}
                            />
                          ) : (
                            "Aucune image"
                          )}
                        </td>
                        <td>
                          <button
                            className="stock-management-restock-btn"
                            onClick={() => handleRestock(product)}
                          >
                            📦 Réapprovisionner
                          </button>
                          <button
                            className="stock-management-sell-btn"
                            onClick={() => handleSell(product)}
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
                  ? "Aucun produit trouvé pour cette recherche."
                  : "Aucun produit trouvé."}
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
                      <th onClick={() => handleSort("client_name")} className="sortable">
                        Client
                        {sortConfig.key === "client_name" && (
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
                        <td>{sale.client_name || "N/A"}</td>
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

        {showProductForm && (
          <div className="modal-overlay">
            <div className="stock-management-modal-content">
              <button
                className="stock-management-modal-close"
                onClick={() => {
                  setShowProductForm(false);
                  setProductFormData({
                    name: "",
                    usine: "",
                    poids: "",
                    type: "",
                    résistance: "",
                    image: null,
                  });
                }}
              >
                ✕
              </button>
              <section className="stock-management-form-section">
                <h2>Ajouter un Produit</h2>
                <form onSubmit={handleProductSubmit} className="stock-management-form">
                  <div className="stock-management-form-group">
                    <label htmlFor="name">Nom</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={productFormData.name}
                      onChange={handleProductInputChange}
                      placeholder="ex: Sacs de Ciment"
                      required
                    />
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="usine">Usine</label>
                    <input
                      type="text"
                      id="usine"
                      name="usine"
                      value={productFormData.usine}
                      onChange={handleProductInputChange}
                      placeholder="ex: CimentTunisie"
                      required
                    />
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="poids">Poids</label>
                    <input
                      type="text"
                      id="poids"
                      name="poids"
                      value={productFormData.poids}
                      onChange={handleProductInputChange}
                      placeholder="ex: 50kg"
                      required
                    />
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="type">Type</label>
                    <input
                      type="text"
                      id="type"
                      name="type"
                      value={productFormData.type}
                      onChange={handleProductInputChange}
                      placeholder="ex: Ciment Portland"
                      required
                    />
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="résistance">Résistance</label>
                    <input
                      type="text"
                      id="résistance"
                      name="résistance"
                      value={productFormData.résistance}
                      onChange={handleProductInputChange}
                      placeholder="ex: Très haute"
                      required
                    />
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="image">Image</label>
                    <input
                      type="file"
                      id="image"
                      name="image"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {productFormData.image_url && (
                      <img
                        src={productFormData.image_url}
                        alt="Preview"
                        style={{ width: "100px", height: "100px", objectFit: "contain", marginTop: "10px" }}
                      />
                    )}
                  </div>
                  <div className="stock-management-form-actions">
                    <button type="submit" className="stock-management-save-btn">
                      Ajouter
                    </button>
                    <button
                      type="button"
                      className="stock-management-cancel-btn"
                      onClick={() => {
                        setShowProductForm(false);
                        setProductFormData({
                          name: "",
                          usine: "",
                          poids: "",
                          type: "",
                          résistance: "",
                          image: null,
                        });
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}

        {showSellForm && sellingProduct && (
          <div className="modal-overlay">
            <div className="stock-management-modal-content">
              <button
                className="stock-management-modal-close"
                onClick={() => {
                  setShowSellForm(false);
                  setSellFormData({ quantity_sold: "", client_name: "" });
                  setSellingProduct(null);
                }}
              >
                ✕
              </button>
              <section className="stock-management-form-section">
                <h2>Vendre {sellingProduct.name}</h2>
                <form onSubmit={handleSellSubmit} className="stock-management-form">
                  <div className="stock-management-form-group">
                    <label htmlFor="quantity_sold">Quantité Vendue</label>
                    <input
                      type="number"
                      id="quantity_sold"
                      name="quantity_sold"
                      value={sellFormData.quantity_sold}
                      onChange={handleSellInputChange}
                      placeholder="ex: 10"
                      min="1"
                      max={sellingProduct.quantité}
                      required
                    />
                    <small>Quantité en stock: {sellingProduct.quantité}</small>
                  </div>
                  <div className="stock-management-form-group">
                    <label htmlFor="client_name">Nom du Client</label>
                    <input
                      type="text"
                      id="client_name"
                      name="client_name"
                      value={sellFormData.client_name}
                      onChange={handleSellInputChange}
                      placeholder="ex: Entreprise XYZ"
                    />
                  </div>
                  <div className="stock-management-form-actions">
                    <button type="submit" className="stock-management-save-btn">
                      Enregistrer la Vente
                    </button>
                    <button
                      type="button"
                      className="stock-management-cancel-btn"
                      onClick={() => {
                        setShowSellForm(false);
                        setSellFormData({ quantity_sold: "", client_name: "" });
                        setSellingProduct(null);
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}

        {showRestockForm && restockingProduct && (
          <div className="modal-overlay">
            <div className="stock-management-modal-content">
              <button
                className="stock-management-modal-close"
                onClick={() => {
                  setShowRestockForm(false);
                  setRestockFormData({ quantity_to_add: "" });
                  setRestockingProduct(null);
                }}
              >
                ✕
              </button>
              <section className="stock-management-form-section">
                <h2>Réapprovisionner {restockingProduct.name}</h2>
                <form onSubmit={handleRestockSubmit} className="stock-management-form">
                  <div className="stock-management-form-group">
                    <label htmlFor="quantity_to_add">Quantité à Ajouter</label>
                    <input
                      type="number"
                      id="quantity_to_add"
                      name="quantity_to_add"
                      value={restockFormData.quantity_to_add}
                      onChange={handleRestockInputChange}
                      placeholder="ex: 50"
                      min="1"
                      required
                    />
                    <small>Quantité actuelle: {restockingProduct.quantité}</small>
                  </div>
                  <div className="stock-management-form-actions">
                    <button type="submit" className="stock-management-save-btn">
                      Réapprovisionner
                    </button>
                    <button
                      type="button"
                      className="stock-management-cancel-btn"
                      onClick={() => {
                        setShowRestockForm(false);
                        setRestockFormData({ quantity_to_add: "" });
                        setRestockingProduct(null);
                      }}
                    >
                      Annuler
                    </button>
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