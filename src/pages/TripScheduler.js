import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./TripScheduler.css";
import { supabase } from "../supabase";

const TripScheduler = () => {
  const [trips, setTrips] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [filteredTrucks, setFilteredTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    truckId: "",
    destination: "",
    date: "",
    cargo: "",
    status: "scheduled",
  });
  const [assignFormData, setAssignFormData] = useState({
    tripId: "",
    truckId: "",
  });
  const [editFormData, setEditFormData] = useState({
    id: "",
    truckId: "",
    destination: "",
    date: "",
    cargo: "",
    status: "scheduled",
  });
  const [truckSearch, setTruckSearch] = useState("");
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [showAssignTruckModal, setShowAssignTruckModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [showTruckList, setShowTruckList] = useState(false);
  const truckListRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: trucksData, error: trucksError } = await supabase
          .from('trucks')
          .select('id, immatriculation');
        if (trucksError) throw trucksError;
        const formattedTrucks = trucksData.map(truck => ({
          id: truck.id,
          immatriculation: truck.immatriculation || truck.id,
        }));
        setTrucks(formattedTrucks);
        setFilteredTrucks(formattedTrucks);

        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('*');
        if (tripsError) throw tripsError;
        setTrips(tripsData.map(trip => ({
          id: trip.id,
          truckId: trip.truck_id,
          destination: trip.destination,
          date: new Date(trip.date).toLocaleDateString('fr-FR'),
          rawDate: trip.date,
          cargo: trip.cargo,
          status: trip.status,
          createdAt: new Date(trip.created_at),
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
    if (truckSearch && !selectedTruck) {
      const filtered = trucks.filter((truck) =>
        truck.immatriculation.toLowerCase().includes(truckSearch.toLowerCase())
      );
      setFilteredTrucks(filtered);
      setShowTruckList(true);
    } else {
      setFilteredTrucks([]);
      setShowTruckList(false);
    }
  }, [truckSearch, trucks, selectedTruck]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (truckListRef.current && !truckListRef.current.contains(e.target) && e.target.id !== "truckSearch" && e.target.id !== "truckSearchAssign") {
        setShowTruckList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTruckSelect = (truck, isAssignModal = false, isEditModal = false) => {
    if (isAssignModal) {
      setAssignFormData((prev) => ({ ...prev, truckId: truck.id }));
      setTruckSearch(truck.immatriculation);
      setSelectedTruck(truck);
    } else if (isEditModal) {
      setEditFormData((prev) => ({ ...prev, truckId: truck.id }));
      setTruckSearch(truck.immatriculation);
      setSelectedTruck(truck);
    } else {
      setFormData((prev) => ({ ...prev, truckId: truck.id }));
      setTruckSearch(truck.immatriculation);
      setSelectedTruck(truck);
    }
    setShowTruckList(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.destination) {
      setError("Veuillez indiquer une destination.");
      document.getElementById("destination").focus();
      return;
    }
    if (!formData.date) {
      setError("Veuillez sélectionner une date de voyage.");
      document.getElementById("date").focus();
      return;
    }
    if (!formData.cargo) {
      setError("Veuillez décrire la cargaison.");
      document.getElementById("cargo").focus();
      return;
    }
    const tripDate = new Date(formData.date);
    if (tripDate < new Date().setHours(0, 0, 0, 0)) {
      setError("La date du voyage doit être dans le futur.");
      document.getElementById("date").focus();
      return;
    }
    try {
      const formattedDate = tripDate.toLocaleDateString("fr-FR");
      const { data, error } = await supabase
        .from('trips')
        .insert([{
          truck_id: formData.truckId || null,
          destination: formData.destination,
          date: formData.date,
          cargo: formData.cargo,
          status: formData.status,
        }])
        .select();
      if (error) throw error;
      setTrips((prev) => [
        {
          id: data[0].id,
          truckId: data[0].truck_id,
          destination: data[0].destination,
          date: formattedDate,
          rawDate: data[0].date,
          cargo: data[0].cargo,
          status: data[0].status,
          createdAt: new Date(data[0].created_at),
        },
        ...prev,
      ]);
      setFormData({ truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
      setTruckSearch("");
      setSelectedTruck(null);
      setShowAddTripModal(false);
      setSuccessMessage("Voyage planifié avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error scheduling trip:", err);
      setError("Erreur lors de la planification du voyage.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!editFormData.destination) {
      setError("Veuillez indiquer une destination.");
      document.getElementById("editDestination").focus();
      return;
    }
    if (!editFormData.date) {
      setError("Veuillez sélectionner une date de voyage.");
      document.getElementById("editDate").focus();
      return;
    }
    if (!editFormData.cargo) {
      setError("Veuillez décrire la cargaison.");
      document.getElementById("editCargo").focus();
      return;
    }
    const tripDate = new Date(editFormData.date);
    if (tripDate < new Date().setHours(0, 0, 0, 0)) {
      setError("La date du voyage doit être dans le futur.");
      document.getElementById("editDate").focus();
      return;
    }
    try {
      const formattedDate = tripDate.toLocaleDateString("fr-FR");
      const { error } = await supabase
        .from('trips')
        .update({
          truck_id: editFormData.truckId || null,
          destination: editFormData.destination,
          date: editFormData.date,
          cargo: editFormData.cargo,
          status: editFormData.status,
        })
        .eq('id', editFormData.id);
      if (error) throw error;
      setTrips((prev) =>
        prev.map((t) =>
          t.id === editFormData.id
            ? {
                ...t,
                truckId: editFormData.truckId,
                destination: editFormData.destination,
                date: formattedDate,
                rawDate: editFormData.date,
                cargo: editFormData.cargo,
                status: editFormData.status,
              }
            : t
        )
      );
      setEditFormData({ id: "", truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
      setTruckSearch("");
      setSelectedTruck(null);
      setShowEditTripModal(false);
      setSuccessMessage("Voyage modifié avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error editing trip:", err);
      setError("Erreur lors de la modification du voyage.");
    }
  };

  const handleAssignTruck = async (e) => {
    e.preventDefault();
    setError(null);
    if (!assignFormData.truckId) {
      setError("Veuillez sélectionner un camion.");
      document.getElementById("assignTruckSelect").focus();
      return;
    }
    try {
      const { error } = await supabase
        .from('trips')
        .update({ truck_id: assignFormData.truckId })
        .eq('id', assignFormData.tripId);
      if (error) throw error;
      setTrips((prev) =>
        prev.map((t) =>
          t.id === assignFormData.tripId ? { ...t, truckId: assignFormData.truckId } : t
        )
      );
      setAssignFormData({ tripId: "", truckId: "" });
      setTruckSearch("");
      setSelectedTruck(null);
      setShowAssignTruckModal(false);
      setSuccessMessage("Camion assigné avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error assigning truck:", err);
      setError("Erreur lors de l'assignation du camion.");
    }
  };

  const handleCancel = async (tripId) => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler ce voyage ?")) {
      try {
        const { error } = await supabase
          .from('trips')
          .update({ status: "canceled" })
          .eq('id', tripId);
        if (error) throw error;
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, status: "canceled" } : t))
        );
        setSuccessMessage("Voyage annulé avec succès !");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        console.error("Error canceling trip:", err);
        setError("Erreur lors de l'annulation du voyage.");
      }
    }
  };

  const handleComplete = async (tripId) => {
    if (window.confirm("Êtes-vous sûr de vouloir marquer ce voyage comme terminé ?")) {
      try {
        const { error } = await supabase
          .from('trips')
          .update({ status: "completed" })
          .eq('id', tripId);
        if (error) throw error;
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, status: "completed" } : t))
        );
        setSuccessMessage("Voyage marqué comme terminé avec succès !");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        console.error("Error completing trip:", err);
        setError("Erreur lors de la finalisation du voyage.");
      }
    }
  };

  const openAddTripModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
    setFormData({ truckId: "", destination: "", date: tomorrowFormatted, cargo: "", status: "scheduled" });
    setTruckSearch("");
    setSelectedTruck(null);
    setError(null);
    setShowAddTripModal(true);
  };

  const openAssignTruckModal = (tripId) => {
    setAssignFormData({ tripId, truckId: "" });
    setTruckSearch("");
    setSelectedTruck(null);
    setError(null);
    setShowAssignTruckModal(true);
  };

  const openEditTripModal = (trip) => {
    setEditFormData({
      id: trip.id,
      truckId: trip.truckId || "",
      destination: trip.destination,
      date: trip.rawDate.split('T')[0],
      cargo: trip.cargo,
      status: trip.status,
    });
    const truck = trucks.find(t => t.id === trip.truckId);
    setTruckSearch(truck ? truck.immatriculation : "");
    setSelectedTruck(truck || null);
    setError(null);
    setShowEditTripModal(true);
  };

  const sortedTrips = [...trips].sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
  const filteredTrips = sortedTrips.filter((trip) => {
    if (showPendingOnly && trip.truckId) return false;
    if (filterStatus !== "all" && trip.status !== filterStatus) return false;
    return true;
  });

  const groupedTrips = filteredTrips.reduce((acc, trip) => {
    const date = trip.rawDate.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(trip);
    return acc;
  }, {});

  return (
    <div className="trip-scheduler-container">
      <aside className="sidebar">
        <h2 className="trip-scheduler-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li><Link to="/fleet/dashboard">📊 Gestion de Flotte</Link></li>
            <li><Link to="/parc">🔧 Gestion des Pièces</Link></li>
            <li><Link to="/fleet/stock-carburant">⛽ Stock Carburant</Link></li>
            <li><Link to="/stock">📦 Gestion de Stock</Link></li>
            <li className="active"><Link to="/schedule">🗓️ Gestion des Programmes</Link></li>
            <li><Link to="/maintenance">🛠️ Maintenance</Link></li>
            <li><Link to="/trailers">🚛 Gestion des Remorques</Link></li>
            <li><Link to="/incidents">🚨 Gestion des Incidents</Link></li>
            <li><Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link></li>
          </ul>
        </nav>
        <div className="trip-scheduler-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>

      <main className="trip-scheduler-content">
        <header className="trip-scheduler-header">
          <div>
            <h1>🗓️ Planifier un Programme</h1>
          </div>
          <div className="trip-scheduler-header-actions">
            <button className="trip-scheduler-add-btn" onClick={openAddTripModal}>
              ➕ Planifier un Voyage
            </button>
          </div>
        </header>

        {successMessage && (
          <div className="trip-scheduler-success-message">{successMessage}</div>
        )}
        {error && <div className="trip-scheduler-error-message">{error}</div>}

        <section className="trip-scheduler-list-section">
          <div className="trip-scheduler-filter-controls">
            <h2>Voyages Planifiés</h2>
            <div className="trip-scheduler-filter-options">
              <div className="trip-scheduler-filter-status">
                <label className="trip-scheduler-label">Filtrer par statut: </label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">Tous</option>
                  <option value="scheduled">Planifié</option>
                  <option value="in_progress">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="canceled">Annulé</option>
                </select>
              </div>
              <div className="trip-scheduler-filter-status">
                <label className="trip-scheduler-label">
                  <input
                    type="checkbox"
                    checked={showPendingOnly}
                    onChange={(e) => setShowPendingOnly(e.target.checked)}
                  />
                  Afficher uniquement les voyages sans camion
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="trip-scheduler-loading">Chargement des voyages...</div>
          ) : Object.keys(groupedTrips).length > 0 ? (
            <div className="trip-scheduler-agenda">
              {Object.entries(groupedTrips).map(([date, dateTrips]) => (
                <div key={date} className="trip-scheduler-agenda-day">
                  <h3 className="trip-scheduler-agenda-date">
                    {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="trip-scheduler-items">
                    {dateTrips.map((trip) => {
                      const truck = trucks.find((t) => t.id === trip.truckId);
                      return (
                        <div
                          key={trip.id}
                          className={`trip-scheduler-item trip-scheduler-item-${trip.status}`}
                        >
                          <h3>{truck?.immatriculation || "Non assigné"}</h3>
                          <p><strong>Destination:</strong> {trip.destination}</p>
                          <p><strong>Date:</strong> {trip.date}</p>
                          <p><strong>Cargaison:</strong> {trip.cargo}</p>
                          <p>
                            <strong>Statut:</strong>{" "}
                            {trip.status === "scheduled"
                              ? "Planifié"
                              : trip.status === "in_progress"
                              ? "En cours"
                              : trip.status === "completed"
                              ? "Terminé"
                              : "Annulé"}
                          </p>
                          <div className="trip-scheduler-item-actions">
                            {!trip.truckId && trip.status !== "canceled" && (
                              <button
                                className="trip-scheduler-assign-btn"
                                onClick={() => openAssignTruckModal(trip.id)}
                              >
                                🚚 Assigner un Camion
                              </button>
                            )}
                            {trip.status !== "canceled" && trip.status !== "completed" && (
                              <>
                                <button
                                  className="trip-scheduler-edit-btn"
                                  onClick={() => openEditTripModal(trip)}
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  className="trip-scheduler-cancel-trip-btn"
                                  onClick={() => handleCancel(trip.id)}
                                >
                                  ❌ Annuler
                                </button>
                                <button
                                  className="trip-scheduler-complete-btn"
                                  onClick={() => handleComplete(trip.id)}
                                >
                                  ✅ Terminer
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="trip-scheduler-no-trips">
              Aucun voyage trouvé pour les critères sélectionnés.
            </div>
          )}
        </section>

        {showAddTripModal && (
          <div className="modal-overlay">
            <div className="trip-scheduler-modal-content">
              <button
                className="trip-scheduler-modal-close"
                onClick={() => {
                  setShowAddTripModal(false);
                  setFormData({ truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
                  setTruckSearch("");
                  setSelectedTruck(null);
                  setError(null);
                }}
              >
                ✕
              </button>
              <section className="trip-scheduler-form-section">
                <h2>Planifier un Nouveau Voyage</h2>
                <form onSubmit={handleSubmit} className="trip-scheduler-form">
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="truckSelect">Camion (optionnel)</label>
                    <select
                      id="truckSelect"
                      name="truckId"
                      value={formData.truckId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const truck = trucks.find(t => t.id === selectedId);
                        if (truck) {
                          setFormData(prev => ({ ...prev, truckId: truck.id }));
                          setTruckSearch(truck.immatriculation);
                          setSelectedTruck(truck);
                        } else {
                          setFormData(prev => ({ ...prev, truckId: "" }));
                          setTruckSearch("");
                          setSelectedTruck(null);
                        }
                      }}
                    >
                      <option value="">-- Aucun camion --</option>
                      {trucks.map(truck => (
                        <option key={truck.id} value={truck.id}>
                          {truck.immatriculation}
                        </option>
                      ))}
                    </select>
                    <div style={{ marginTop: '8px' }}>
                      <label htmlFor="truckSearch">Recherche rapide:</label>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <input
                          type="text"
                          id="truckSearch"
                          value={truckSearch}
                          onChange={(e) => {
                            setTruckSearch(e.target.value);
                            if (selectedTruck && e.target.value !== selectedTruck.immatriculation) {
                              setSelectedTruck(null);
                              setFormData(prev => ({ ...prev, truckId: "" }));
                            }
                          }}
                          placeholder="Filtrer par immatriculation..."
                          autoComplete="off"
                          onFocus={() => {
                            if (truckSearch && !selectedTruck) {
                              setShowTruckList(true);
                            }
                          }}
                        />
                        {showTruckList && truckSearch && filteredTrucks.length > 0 && (
                          <div className="trip-scheduler-truck-list" ref={truckListRef}>
                            {filteredTrucks.map((truck) => (
                              <div
                                key={truck.id}
                                className="trip-scheduler-truck-item"
                                onClick={() => handleTruckSelect(truck)}
                              >
                                {truck.immatriculation}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedTruck && (
                      <div className="trip-scheduler-selected-truck">
                        Camion sélectionné: {selectedTruck.immatriculation}
                      </div>
                    )}
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="destination">Destination <span className="required-field">*</span></label>
                    <input
                      type="text"
                      id="destination"
                      name="destination"
                      value={formData.destination}
                      onChange={handleInputChange}
                      placeholder="ex: Tunis"
                      required
                    />
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="date">Date du Voyage <span className="required-field">*</span></label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="cargo">Cargaison <span className="required-field">*</span></label>
                    <input
                      type="text"
                      id="cargo"
                      name="cargo"
                      value={formData.cargo}
                      onChange={handleInputChange}
                      placeholder="ex: Ciment, 5 tonnes"
                      required
                    />
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="status">Statut</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="scheduled">Planifié</option>
                      <option value="in_progress">En cours</option>
                      <option value="completed">Terminé</option>
                    </select>
                  </div>
                  <div className="trip-scheduler-form-actions">
                    <button type="submit" className="trip-scheduler-save-btn">
                      Planifier
                    </button>
                    <button
                      type="button"
                      className="trip-scheduler-cancel-btn"
                      onClick={() => {
                        setFormData({ truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
                        setTruckSearch("");
                        setSelectedTruck(null);
                      }}
                    >
                      Effacer le Formulaire
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}

        {showAssignTruckModal && (
          <div className="modal-overlay">
            <div className="trip-scheduler-modal-content">
              <button
                className="trip-scheduler-modal-close"
                onClick={() => {
                  setShowAssignTruckModal(false);
                  setAssignFormData({ tripId: "", truckId: "" });
                  setTruckSearch("");
                  setSelectedTruck(null);
                  setError(null);
                }}
              >
                ✕
              </button>
              <section className="trip-scheduler-form-section">
                <h2>Assigner un Camion</h2>
                <form onSubmit={handleAssignTruck} className="trip-scheduler-form">
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="assignTruckSelect">Camion <span className="required-field">*</span></label>
                    <select
                      id="assignTruckSelect"
                      name="truckId"
                      value={assignFormData.truckId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const truck = trucks.find(t => t.id === selectedId);
                        if (truck) {
                          setAssignFormData(prev => ({ ...prev, truckId: truck.id }));
                          setTruckSearch(truck.immatriculation);
                          setSelectedTruck(truck);
                        } else {
                          setAssignFormData(prev => ({ ...prev, truckId: "" }));
                          setTruckSearch("");
                          setSelectedTruck(null);
                        }
                      }}
                      required
                    >
                      <option value="">-- Sélectionnez un camion --</option>
                      {trucks.map(truck => (
                        <option key={truck.id} value={truck.id}>
                          {truck.immatriculation}
                        </option>
                      ))}
                    </select>
                    <div style={{ marginTop: '8px' }}>
                      <label htmlFor="truckSearchAssign">Recherche rapide:</label>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <input
                          type="text"
                          id="truckSearchAssign"
                          value={truckSearch}
                          onChange={(e) => {
                            setTruckSearch(e.target.value);
                            if (selectedTruck && e.target.value !== selectedTruck.immatriculation) {
                              setSelectedTruck(null);
                              setAssignFormData(prev => ({ ...prev, truckId: "" }));
                            }
                          }}
                          placeholder="Filtrer par immatriculation..."
                          autoComplete="off"
                          onFocus={() => {
                            if (truckSearch && !selectedTruck) {
                              setShowTruckList(true);
                            }
                          }}
                        />
                        {showTruckList && truckSearch && filteredTrucks.length > 0 && (
                          <div className="trip-scheduler-truck-list" ref={truckListRef}>
                            {filteredTrucks.map((truck) => (
                              <div
                                key={truck.id}
                                className="trip-scheduler-truck-item"
                                onClick={() => handleTruckSelect(truck, true)}
                              >
                                {truck.immatriculation}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedTruck && (
                      <div className="trip-scheduler-selected-truck">
                        Camion sélectionné: {selectedTruck.immatriculation}
                      </div>
                    )}
                  </div>
                  <div className="trip-scheduler-form-actions">
                    <button type="submit" className="trip-scheduler-save-btn">
                      Assigner
                    </button>
                    <button
                      type="button"
                      className="trip-scheduler-cancel-btn"
                      onClick={() => {
                        setShowAssignTruckModal(false);
                        setAssignFormData({ tripId: "", truckId: "" });
                        setTruckSearch("");
                        setSelectedTruck(null);
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

        {showEditTripModal && (
          <div className="modal-overlay">
            <div className="trip-scheduler-modal-content">
              <button
                className="trip-scheduler-modal-close"
                onClick={() => {
                  setShowEditTripModal(false);
                  setEditFormData({ id: "", truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
                  setTruckSearch("");
                  setSelectedTruck(null);
                  setError(null);
                }}
              >
                ✕
              </button>
              <section className="trip-scheduler-form-section">
                <h2>Modifier le Voyage</h2>
                <form onSubmit={handleEditSubmit} className="trip-scheduler-form">
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="editTruckSelect">Camion (optionnel)</label>
                    <select
                      id="editTruckSelect"
                      name="truckId"
                      value={editFormData.truckId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const truck = trucks.find(t => t.id === selectedId);
                        if (truck) {
                          setEditFormData(prev => ({ ...prev, truckId: truck.id }));
                          setTruckSearch(truck.immatriculation);
                          setSelectedTruck(truck);
                        } else {
                          setEditFormData(prev => ({ ...prev, truckId: "" }));
                          setTruckSearch("");
                          setSelectedTruck(null);
                        }
                      }}
                    >
                      <option value="">-- Aucun camion --</option>
                      {trucks.map(truck => (
                        <option key={truck.id} value={truck.id}>
                          {truck.immatriculation}
                        </option>
                      ))}
                    </select>
                    <div style={{ marginTop: '8px' }}>
                      <label htmlFor="truckSearchEdit">Recherche rapide:</label>
                      <div style={{ display: 'flex', position: 'relative' }}>
                        <input
                          type="text"
                          id="truckSearchEdit"
                          value={truckSearch}
                          onChange={(e) => {
                            setTruckSearch(e.target.value);
                            if (selectedTruck && e.target.value !== selectedTruck.immatriculation) {
                              setSelectedTruck(null);
                              setEditFormData(prev => ({ ...prev, truckId: "" }));
                            }
                          }}
                          placeholder="Filtrer par immatriculation..."
                          autoComplete="off"
                          onFocus={() => {
                            if (truckSearch && !selectedTruck) {
                              setShowTruckList(true);
                            }
                          }}
                        />
                        {showTruckList && truckSearch && filteredTrucks.length > 0 && (
                          <div className="trip-scheduler-truck-list" ref={truckListRef}>
                            {filteredTrucks.map((truck) => (
                              <div
                                key={truck.id}
                                className="trip-scheduler-truck-item"
                                onClick={() => handleTruckSelect(truck, false, true)}
                              >
                                {truck.immatriculation}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedTruck && (
                      <div className="trip-scheduler-selected-truck">
                        Camion sélectionné: {selectedTruck.immatriculation}
                      </div>
                    )}
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="editDestination">Destination <span className="required-field">*</span></label>
                    <input
                      type="text"
                      id="editDestination"
                      name="destination"
                      value={editFormData.destination}
                      onChange={handleEditInputChange}
                      placeholder="ex: Tunis"
                      required
                    />
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="editDate">Date du Voyage <span className="required-field">*</span></label>
                    <input
                      type="date"
                      id="editDate"
                      name="date"
                      value={editFormData.date}
                      onChange={handleEditInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="editCargo">Cargaison <span className="required-field">*</span></label>
                    <input
                      type="text"
                      id="editCargo"
                      name="cargo"
                      value={editFormData.cargo}
                      onChange={handleEditInputChange}
                      placeholder="ex: Ciment, 5 tonnes"
                      required
                    />
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="editStatus">Statut</label>
                    <select
                      id="editStatus"
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                    >
                      <option value="scheduled">Planifié</option>
                      <option value="in_progress">En cours</option>
                      <option value="completed">Terminé</option>
                    </select>
                  </div>
                  <div className="trip-scheduler-form-actions">
                    <button type="submit" className="trip-scheduler-save-btn">
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      className="trip-scheduler-cancel-btn"
                      onClick={() => {
                        setShowEditTripModal(false);
                        setEditFormData({ id: "", truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
                        setTruckSearch("");
                        setSelectedTruck(null);
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

export default TripScheduler;