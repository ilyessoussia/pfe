import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { supabase } from "../supabase"; // Adjust path to your supabase.js
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

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setParts(data);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Erreur lors du chargement des pièces:", err);
      setError("Échec du chargement des données d'inventaire. La table sera créée automatiquement lors de l'ajout de votre première pièce.");
    } finally {
      setLoading(false);
    }
  };

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

      if (error) {
        throw error;
      }

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

      fetchParts();
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

      if (error) {
        throw error;
      }

      setSuccessMessage('Pièce modifiée avec succès!');
      setTimeout(() => setSuccessMessage(''), 3000);

      fetchParts();

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

  const filteredParts = parts
    .filter(part => filterType === 'all' || part.category === filterType)
    .filter(part => {
      if (!searchQuery) return true;
      return part.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="fleet-management-container">
      <aside className="fleet-management-sidebar">
        <h2 className="fleet-management-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Tableau de Bord</Link>
            </li>
            <li className="active">
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li>
              <Link to="/stock">📦 Gestion de Stock</Link>
            </li>
            <li>
              <Link to="/schedule">🗓️ Planifier un Programme</Link>
            </li>
            <li>
              <Link to="/maintenance">🛠️ Maintenance</Link>
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
            <button className="fleet-management-refresh-btn" onClick={fetchParts} disabled={loading}>
              {loading ? "🔄 Chargement..." : "🔄 Actualiser"}
            </button>
            <Link to="/fleet/dashboard" className="fleet-management-back-btn">⬅ Retour au Tableau de Bord</Link>
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
      </main>
    </div>
  );
};

export default Parc;