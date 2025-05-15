import React, { useState, useEffect, useCallback } from 'react';
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import './Parc.css';

const Parc = () => {
  const [parts, setParts] = useState([]);
  const [activeTab, setActiveTab] = useState('view');
  const [formData, setFormData] = useState({
    name: '',
    category: 'truck',
    quantity: 1,
    price: '',
    truckType: '',
    partNumber: '',
    location: '',
    description: '',
  });
  const [editingPartId, setEditingPartId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());
  const [showUseModal, setShowUseModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [useFormData, setUseFormData] = useState({
    truckId: '',
    trailerId: '',
    quantity: 1,
  });
  const [restockFormData, setRestockFormData] = useState({
    quantity: 1,
  });
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trucks
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('id, immatriculation')
        .order('immatriculation', { ascending: true });

      if (trucksError) throw trucksError;
      setTrucks(trucksData);

      // Fetch trailers
      const { data: trailersData, error: trailersError } = await supabase
        .from('trailers')
        .select('id, immatriculation')
        .order('immatriculation', { ascending: true });

      if (trailersError) throw trailersError;
      setTrailers(trailersData);

      // Fetch parts
      const { data: partsData, error: partsError } = await supabase
        .from('spare_parts')
        .select('*')
        .order('created_at', { ascending: false });

      if (partsError) throw partsError;
      setParts(partsData);

      // Fetch usage history
      const { data: historyData, error: historyError } = await supabase
        .from('part_usage_history')
        .select(`
          id,
          part_id,
          truck_id,
          trailer_id,
          quantity_used,
          used_at,
          spare_parts(name),
          trucks(immatriculation),
          trailers(immatriculation)
        `)
        .order('used_at', { ascending: false });

      if (historyError) throw historyError;
      setUsageHistory(historyData);

      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError("Échec du chargement des données d'inventaire, des camions, des remorques ou de l'historique.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'quantity' || name === 'price' ? parseFloat(value) || '' : value
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: name === 'quantity' || name === 'price' ? parseFloat(value) || '' : value
    });
  };

  const handleUseInputChange = (e) => {
    const { name, value } = e.target;
    setUseFormData({
      ...useFormData,
      [name]: name === 'quantity' ? parseInt(value) || '' : value
    });
  };

  const handleRestockInputChange = (e) => {
    const { name, value } = e.target;
    setRestockFormData({
      ...restockFormData,
      [name]: name === 'quantity' ? parseInt(value) || '' : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const category = activeTab === 'add-truck' ? 'truck' : 'general';

      const newPart = {
        name: formData.name,
        category: category,
        quantity: parseInt(formData.quantity) || 1,
        price: parseFloat(formData.price) || 0,
        truck_type: formData.truckType || null,
        part_number: formData.partNumber || null,
        location: formData.location || null,
        description: formData.description || null,
      };

      const { error } = await supabase
        .from('spare_parts')
        .insert([newPart]);

      if (error) throw error;

      setFormData({
        name: '',
        category: category,
        quantity: 1,
        price: '',
        truckType: '',
        partNumber: '',
        location: '',
        description: '',
      });

      setSuccessMessage('Pièce ajoutée avec succès!');
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchData();
    } catch (err) {
      console.error("Erreur lors de l'ajout de la pièce:", err);
      setError("Échec de l'ajout de la pièce. Vérifiez que tous les champs sont remplis correctement.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (part) => {
    setEditingPartId(part.id);
    setEditFormData({
      name: part.name,
      category: part.category,
      quantity: part.quantity,
      price: part.price,
      truckType: part.truck_type || '',
      partNumber: part.part_number || '',
      location: part.location || '',
      description: part.description || '',
    });
    setActiveTab(part.category === 'truck' ? 'edit-truck' : 'edit-general');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const updatedPart = {
        name: editFormData.name,
        category: editFormData.category,
        quantity: parseInt(editFormData.quantity) || 1,
        price: parseFloat(editFormData.price) || 0,
        truck_type: editFormData.truckType || null,
        part_number: editFormData.partNumber || null,
        location: editFormData.location || null,
        description: editFormData.description || null,
      };

      const { error } = await supabase
        .from('spare_parts')
        .update(updatedPart)
        .eq('id', editingPartId);

      if (error) throw error;

      setSuccessMessage('Pièce modifiée avec succès!');
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchData();

      setEditingPartId(null);
      setEditFormData(null);
      setActiveTab('view');
    } catch (err) {
      console.error("Erreur lors de la modification de la pièce:", err);
      setError("Échec de la modification de la pièce. Vérifiez que tous les champs sont remplis correctement.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUse = (part) => {
    setSelectedPart(part);
    setUseFormData({
      truckId: '',
      trailerId: '',
      quantity: 1,
    });
    setShowUseModal(true);
  };

  const handleUseSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const quantityUsed = parseInt(useFormData.quantity);
      if (quantityUsed <= 0 || quantityUsed > selectedPart.quantity) {
        throw new Error("Quantité utilisée invalide ou supérieure au stock disponible.");
      }
      if (!useFormData.truckId && !useFormData.trailerId) {
        throw new Error("Veuillez sélectionner un camion ou une remorque.");
      }
      if (useFormData.truckId && useFormData.trailerId) {
        throw new Error("Veuillez sélectionner soit un camion, soit une remorque, mais pas les deux.");
      }

      // Update inventory quantity
      const newQuantity = selectedPart.quantity - quantityUsed;
      const { error: updateError } = await supabase
        .from('spare_parts')
        .update({ quantity: newQuantity })
        .eq('id', selectedPart.id);

      if (updateError) throw updateError;

      // Log usage in history
      const usageLog = {
        part_id: selectedPart.id,
        truck_id: useFormData.truckId || null,
        trailer_id: useFormData.trailerId || null,
        quantity_used: quantityUsed,
        used_at: new Date().toISOString(),
      };

      const { error: logError } = await supabase
        .from('part_usage_history')
        .insert([usageLog]);

      if (logError) throw logError;

      setSuccessMessage(`Utilisation de ${quantityUsed} pièce(s) enregistrée avec succès!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchData();
      setShowUseModal(false);
      setSelectedPart(null);
      setUseFormData({
        truckId: '',
        trailerId: '',
        quantity: 1,
      });
    } catch (err) {
      console.error("Erreur lors de l'utilisation de la pièce:", err);
      setError(err.message || "Échec de l'enregistrement de l'utilisation. Vérifiez les données saisies.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestock = (part) => {
    setSelectedPart(part);
    setRestockFormData({
      quantity: 1,
    });
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const quantityAdded = parseInt(restockFormData.quantity);
      if (quantityAdded <= 0) {
        throw new Error("La quantité à ajouter doit être supérieure à zéro.");
      }

      // Update inventory quantity
      const newQuantity = selectedPart.quantity + quantityAdded;
      const { error: updateError } = await supabase
        .from('spare_parts')
        .update({ quantity: newQuantity })
        .eq('id', selectedPart.id);

      if (updateError) throw updateError;

      setSuccessMessage(`Ajout de ${quantityAdded} pièce(s) au stock enregistré avec succès!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchData();
      setShowRestockModal(false);
      setSelectedPart(null);
      setRestockFormData({
        quantity: 1,
      });
    } catch (err) {
      console.error("Erreur lors de l'ajout au stock:", err);
      setError(err.message || "Échec de l'enregistrement de l'ajout au stock. Vérifiez les données saisies.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParts = parts
    .filter(part => filterType === 'all' || part.category === filterType)
    .filter(part => {
      if (!searchQuery) return true;
      return part.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="fleet-management-container">
      <aside className="sidebar">
        <h2 className="fleet-management-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
            </li>
            <li className="active">
              <Link to="/parc">🔧 Gestion des Pièces</Link>
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
          </ul>
        </nav>
        <div className="fleet-management-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>

      <main className="fleet-management-content">
        <header className="fleet-management-header">
          <div>
            <h1>🔧 Gestion des Pièces</h1>
            <p className="fleet-management-last-updated">
              Dernière mise à jour: {lastUpdated}
            </p>
          </div>
          <div className="fleet-management-header-actions">
            <button className="fleet-management-refresh-btn" onClick={fetchData} disabled={loading}>
              {loading ? "🔄 Chargement..." : "🔄 Actualiser"}
            </button>
          </div>
        </header>

        <div className="fleet-management-tabs">
          <button 
            className={`fleet-management-tab ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('view');
              setEditingPartId(null);
              setEditFormData(null);
            }}
          >
            Consulter l'Inventaire
          </button>
          <button 
            className={`fleet-management-tab ${activeTab === 'add-truck' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('add-truck');
              setEditingPartId(null);
              setEditFormData(null);
            }}
          >
            Ajouter des Pièces de Camion
          </button>
          <button 
            className={`fleet-management-tab ${activeTab === 'add-general' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('add-general');
              setEditingPartId(null);
              setEditFormData(null);
            }}
          >
            Ajouter des Pièces Générales
          </button>
          <button 
            className={`fleet-management-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              setEditingPartId(null);
              setEditFormData(null);
            }}
          >
            Historique d'Utilisation
          </button>
        </div>

        {successMessage && (
          <div className="fleet-management-alert fleet-management-success-alert">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="fleet-management-alert fleet-management-error-alert">
            {error}
          </div>
        )}

        {activeTab === 'view' && (
          <div className="fleet-management-inventory-section">
            <div className="fleet-management-filter-controls">
              <h2>Inventaire</h2>
              <div className="fleet-management-filter-options">
                <label className="fleet-management-label">Rechercher: </label>
                <input
                  type="text"
                  placeholder="Rechercher par nom..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="fleet-management-search-bar"
                />
                <label className="fleet-management-label">Filtrer par: </label> 
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Toutes les Pièces</option>
                  <option value="truck">Pièces de Camion</option>
                  <option value="general">Pièces Générales</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="fleet-management-loading">Chargement des données d'inventaire...</div>
            ) : (
              <div className="fleet-management-parts-table-container">
                <table className="fleet-management-parts-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Catégorie</th>
                      <th>Quantité</th>
                      <th>Prix</th>
                      <th>Numéro de Pièce</th>
                      <th>Emplacement</th>
                      {filterType === 'truck' || filterType === 'all' ? <th>Type de Camion</th> : null}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.length > 0 ? (
                      filteredParts.map((part) => (
                        <tr key={part.id}>
                          <td>{part.name}</td>
                          <td>{part.category === 'truck' ? 'Pièce de Camion' : 'Pièce Générale'}</td>
                          <td>{part.quantity}</td>
                          <td>{parseFloat(part.price).toFixed(2)} DT</td>
                          <td>{part.part_number || '-'}</td>
                          <td>{part.location || '-'}</td>
                          {(filterType === 'truck' || filterType === 'all') && 
                            <td>{part.category === 'truck' ? part.truck_type : '-'}</td>
                          }
                          <td>
                            <button 
                              className="fleet-management-edit-btn"
                              onClick={() => handleEdit(part)}
                            >
                              ✏️ Modifier
                            </button>
                            <button 
                              className="fleet-management-use-btn"
                              onClick={() => handleUse(part)}
                              disabled={part.quantity === 0}
                            >
                              🛠️ Utiliser
                            </button>
                            <button 
                              className="fleet-management-restock-btn"
                              onClick={() => handleRestock(part)}
                            >
                              📦 Restocker
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={filterType === 'all' ? 8 : 7} className="fleet-management-no-data">
                          {loading ? 'Chargement...' : 'Aucune pièce trouvée dans l\'inventaire. Utilisez les onglets ci-dessus pour ajouter des pièces.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="fleet-management-inventory-section">
            <h2>Historique d'Utilisation des Pièces</h2>
            {loading ? (
              <div className="fleet-management-loading">Chargement de l'historique...</div>
            ) : usageHistory.length > 0 ? (
              <div className="fleet-management-parts-table-container">
                <table className="fleet-management-parts-table">
                  <thead>
                    <tr>
                      <th>Pièce</th>
                      <th>Véhicule</th>
                      <th>Quantité Utilisée</th>
                      <th>Date d'Utilisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.spare_parts?.name || 'Pièce inconnue'}</td>
                        <td>
                          {entry.trucks?.immatriculation 
                            ? `Camion: ${entry.trucks.immatriculation}`
                            : entry.trailers?.immatriculation
                              ? `Remorque: ${entry.trailers.immatriculation}`
                              : 'Véhicule inconnu'}
                        </td>
                        <td>{entry.quantity_used}</td>
                        <td>{new Date(entry.used_at).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="fleet-management-no-data">
                Aucun historique d'utilisation trouvé.
              </div>
            )}
          </div>
        )}

        {(activeTab === 'add-truck' || activeTab === 'add-general') && (
          <div className="fleet-management-add-part-section">
            <h2>{activeTab === 'add-truck' ? 'Ajouter une Pièce de Camion' : 'Ajouter une Pièce Générale'}</h2>
            <form onSubmit={handleSubmit} className="fleet-management-part-form">
              <div className="fleet-management-form-group">
                <label htmlFor="name">Nom de la Pièce*</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="fleet-management-form-row">
                <div className="fleet-management-form-group">
                  <label htmlFor="quantity">Quantité*</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="fleet-management-form-group">
                  <label htmlFor="price">Prix (DT)*</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="fleet-management-form-row">
                <div className="fleet-management-form-group">
                  <label htmlFor="partNumber">Numéro de Pièce</label>
                  <input
                    type="text"
                    id="partNumber"
                    name="partNumber"
                    value={formData.partNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="fleet-management-form-group">
                  <label htmlFor="location">Emplacement de Stockage</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {activeTab === 'add-truck' && (
                <div className="fleet-management-form-group">
                  <label htmlFor="truckType">Type/Modèle de Camion*</label>
                  <input
                    type="text"
                    id="truckType"
                    name="truckType"
                    value={formData.truckType}
                    onChange={handleInputChange}
                    required={activeTab === 'add-truck'}
                  />
                </div>
              )}

              <div className="fleet-management-form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>

              <div className="fleet-management-form-actions">
                <button type="submit" className="fleet-management-btn-submit" disabled={submitting}>
                  {submitting ? 'Ajout en cours...' : 'Ajouter à l\'Inventaire'}
                </button>
                <button 
                  type="button" 
                  className="fleet-management-btn-cancel"
                  onClick={() => {
                    setFormData({
                      name: '',
                      category: activeTab === 'add-truck' ? 'truck' : 'general',
                      quantity: 1,
                      price: '',
                      truckType: '',
                      partNumber: '',
                      location: '',
                      description: '',
                    });
                  }}
                  disabled={submitting}
                >
                  Effacer le Formulaire
                </button>
              </div>
            </form>
          </div>
        )}

        {(activeTab === 'edit-truck' || activeTab === 'edit-general') && editFormData && (
          <div className="fleet-management-add-part-section">
            <h2>{activeTab === 'edit-truck' ? 'Modifier une Pièce de Camion' : 'Modifier une Pièce Générale'}</h2>
            <form onSubmit={handleEditSubmit} className="fleet-management-part-form">
              <div className="fleet-management-form-group">
                <label htmlFor="edit-name">Nom de la Pièce*</label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="fleet-management-form-row">
                <div className="fleet-management-form-group">
                  <label htmlFor="edit-quantity">Quantité*</label>
                  <input
                    type="number"
                    id="edit-quantity"
                    name="quantity"
                    min="1"
                    value={editFormData.quantity}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>

                <div className="fleet-management-form-group">
                  <label htmlFor="edit-price">Prix (DT)*</label>
                  <input
                    type="number"
                    id="edit-price"
                    name="price"
                    step="0.01"
                    min="0"
                    value={editFormData.price}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
              </div>

              <div className="fleet-management-form-row">
                <div className="fleet-management-form-group">
                  <label htmlFor="edit-partNumber">Numéro de Pièce</label>
                  <input
                    type="text"
                    id="edit-partNumber"
                    name="partNumber"
                    value={editFormData.partNumber}
                    onChange={handleEditInputChange}
                  />
                </div>

                <div className="fleet-management-form-group">
                  <label htmlFor="edit-location">Emplacement de Stockage</label>
                  <input
                    type="text"
                    id="edit-location"
                    name="location"
                    value={editFormData.location}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>

              {activeTab === 'edit-truck' && (
                <div className="fleet-management-form-group">
                  <label htmlFor="edit-truckType">Type/Modèle de Camion*</label>
                  <input
                    type="text"
                    id="edit-truckType"
                    name="truckType"
                    value={editFormData.truckType}
                    onChange={handleEditInputChange}
                    required={activeTab === 'edit-truck'}
                  />
                </div>
              )}

              <div className="fleet-management-form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  rows="3"
                />
              </div>

              <div className="fleet-management-form-actions">
                <button type="submit" className="fleet-management-btn-submit" disabled={submitting}>
                  {submitting ? 'Mise à jour...' : 'Mettre à jour la Pièce'}
                </button>
                <button 
                  type="button" 
                  className="fleet-management-btn-cancel"
                  onClick={() => {
                    setEditingPartId(null);
                    setEditFormData(null);
                    setActiveTab('view');
                  }}
                  disabled={submitting}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {showUseModal && selectedPart && (
          <div className="fleet-management-modal">
            <div className="fleet-management-modal-content">
              <h2>Utiliser la Pièce: {selectedPart.name}</h2>
              <form onSubmit={handleUseSubmit} className="fleet-management-part-form">
                <div className="fleet-management-form-group">
                  <label htmlFor="truckId">Choisir un Camion</label>
                  <select
                    id="truckId"
                    name="truckId"
                    value={useFormData.truckId}
                    onChange={handleUseInputChange}
                  >
                    <option value="">Aucun camion</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.immatriculation}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fleet-management-form-group">
                  <label htmlFor="trailerId">Choisir une Remorque</label>
                  <select
                    id="trailerId"
                    name="trailerId"
                    value={useFormData.trailerId}
                    onChange={handleUseInputChange}
                  >
                    <option value="">Aucune remorque</option>
                    {trailers.map((trailer) => (
                      <option key={trailer.id} value={trailer.id}>
                        {trailer.immatriculation}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fleet-management-form-group">
                  <label htmlFor="quantity">Quantité à Utiliser* (Max: {selectedPart.quantity})</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    max={selectedPart.quantity}
                    value={useFormData.quantity}
                    onChange={handleUseInputChange}
                    required
                  />
                </div>
                <div className="fleet-management-form-actions">
                  <button type="submit" className="fleet-management-btn-submit" disabled={submitting}>
                    {submitting ? 'Enregistrement...' : 'Confirmer l\'Utilisation'}
                  </button>
                  <button
                    type="button"
                    className="fleet-management-btn-cancel"
                    onClick={() => setShowUseModal(false)}
                    disabled={submitting}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRestockModal && selectedPart && (
          <div className="fleet-management-modal">
            <div className="fleet-management-modal-content">
              <h2>Restocker la Pièce: {selectedPart.name}</h2>
              <form onSubmit={handleRestockSubmit} className="fleet-management-part-form">
                <div className="fleet-management-form-group">
                  <label htmlFor="quantity">Quantité à Ajouter*</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    value={restockFormData.quantity}
                    onChange={handleRestockInputChange}
                    required
                  />
                </div>
                <div className="fleet-management-form-actions">
                  <button type="submit" className="fleet-management-btn-submit" disabled={submitting}>
                    {submitting ? 'Enregistrement...' : 'Confirmer le Restockage'}
                  </button>
                  <button
                    type="button"
                    className="fleet-management-btn-cancel"
                    onClick={() => setShowRestockModal(false)}
                    disabled={submitting}
                  >
                    Annuler
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

export default Parc;