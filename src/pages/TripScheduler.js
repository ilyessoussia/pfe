import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./TripScheduler.css";
import { supabase } from "../supabase"; // Adjust path to your supabase.js

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
  const [truckSearch, setTruckSearch] = useState("");
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 10;
  const [selectedTruck, setSelectedTruck] = useState(null); // Added state to track selected truck
  const [showTruckList, setShowTruckList] = useState(false); // New state to control dropdown visibility

  const truckListRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch trucks
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

        // Fetch trips
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('*');

        if (tripsError) throw tripsError;
        setTrips(tripsData.map(trip => ({
          id: trip.id,
          truckId: trip.truck_id,
          destination: trip.destination,
          date: new Date(trip.date).toLocaleDateString('fr-FR'),
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
    // Only filter trucks when search is active and no truck is selected
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
      if (truckListRef.current && !truckListRef.current.contains(e.target)) {
        // Don't close the dropdown if we're clicking the search input itself
        if (e.target.id !== "truckSearch") {
          setShowTruckList(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTruckSelect = (truck) => {
    console.log("Selected truck:", truck);
    setFormData((prev) => ({ ...prev, truckId: truck.id }));
    setTruckSearch(truck.immatriculation);
    setSelectedTruck(truck); // Store the selected truck for display
    setShowTruckList(false); // Hide dropdown after selection
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    
    // Log form data for debugging
    console.log("Form data at submission:", formData);
    
    // Check all required fields with detailed errors
    if (!formData.truckId) {
      setError("Veuillez sélectionner un camion dans la liste déroulante.");
      document.getElementById("truckSelect").focus();
      return;
    }
    
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
          truck_id: formData.truckId,
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
          cargo: data[0].cargo,
          status: data[0].status,
          createdAt: new Date(data[0].created_at),
        },
        ...prev,
      ]);
      
      // Reset form
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

  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredTripsByStatus = sortedTrips.filter(
    (trip) => filterStatus === "all" || trip.status === filterStatus
  );

  const filteredTrips = filteredTripsByStatus.filter((trip) => {
    const truck = trucks.find((t) => t.id === trip.truckId);
    const searchLower = searchQuery.toLowerCase();
    return (
      (truck?.immatriculation || "").toLowerCase().includes(searchLower) ||
      trip.destination.toLowerCase().includes(searchLower) ||
      trip.cargo.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredTrips.length / tripsPerPage);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * tripsPerPage,
    currentPage * tripsPerPage
  );

  // Reset form and clear errors when opening the modal
  const openAddTripModal = () => {
    // Reset all form-related state
    setFormData({ truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
    setTruckSearch("");
    setSelectedTruck(null);
    setError(null);
    
    // Get tomorrow's date in YYYY-MM-DD format for the date input default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFormatted = tomorrow.toISOString().split('T')[0];
    
    // Set a default date (tomorrow) for better UX
    setFormData(prev => ({ ...prev, date: tomorrowFormatted }));
    
    // Show the modal
    setShowAddTripModal(true);
  };

  return (
    <div className="trip-scheduler-container">
      <aside className="sidebar">
        <h2 className="trip-scheduler-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>  
            <li>
              <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
            </li>
            <li>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li>
              <Link to="/stock">📦 Gestion de Stock</Link>
            </li>
            <li className="active">
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
            <button
              className="trip-scheduler-add-btn"
              onClick={openAddTripModal}
            >
              ➕ Planifier un Voyage
            </button>
          </div>
        </header>

        {successMessage && (
          <div className="trip-scheduler-success-message">{successMessage}</div>
        )}
        {error && <div className="trip-scheduler-error-message">{error}</div>}

        <div className="trip-scheduler-tabs">
          <button
            className={`trip-scheduler-tab ${activeTab === "list" ? "active" : ""}`}
            onClick={() => setActiveTab("list")}
          >
            Vue Liste
          </button>
          <button
            className={`trip-scheduler-tab ${activeTab === "timeline" ? "active" : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            Vue Chronologique
          </button>
        </div>

        <section className="trip-scheduler-list-section">
          <div className="trip-scheduler-filter-controls">
            <h2>Voyages Planifiés</h2>
            <div className="trip-scheduler-filter-options">
              <div className="trip-scheduler-search-bar">
                <label className="trip-scheduler-label">Rechercher: </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Camion, destination, cargaison..."
                />
              </div>
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
            </div>
          </div>

          {loading ? (
            <div className="trip-scheduler-loading">Chargement des voyages...</div>
          ) : filteredTrips.length > 0 ? (
            <>
              {activeTab === "list" && (
                <div className="trip-scheduler-items">
                  {paginatedTrips.map((trip) => {
                    const truck = trucks.find((t) => t.id === trip.truckId);
                    return (
                      <div
                        key={trip.id}
                        className={`trip-scheduler-item trip-scheduler-item-${trip.status}`}
                      >
                        <h3>{truck?.immatriculation || "Inconnu"}</h3>
                        <p>
                          <strong>Destination:</strong> {trip.destination}
                        </p>
                        <p>
                          <strong>Date:</strong> {trip.date}
                        </p>
                        <p>
                          <strong>Cargaison:</strong> {trip.cargo}
                        </p>
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
                          {trip.status !== "canceled" && trip.status !== "completed" && (
                            <>
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
              )}

              {activeTab === "timeline" && (
                <div className="trip-scheduler-timeline">
                  {paginatedTrips.map((trip) => {
                    const truck = trucks.find((t) => t.id === trip.truckId);
                    return (
                      <div
                        key={trip.id}
                        className={`trip-scheduler-timeline-item trip-scheduler-item-${trip.status}`}
                      >
                        <div className="trip-scheduler-timeline-date">
                          {trip.date}
                        </div>
                        <div className="trip-scheduler-timeline-content">
                          <h3>{truck?.immatriculation || "Inconnu"}</h3>
                          <p>
                            <strong>Destination:</strong> {trip.destination}
                          </p>
                          <p>
                            <strong>Cargaison:</strong> {trip.cargo}
                          </p>
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
                            {trip.status !== "canceled" && trip.status !== "completed" && (
                              <>
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
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="trip-scheduler-pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </button>
                <span>
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </button>
              </div>
            </>
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
                  setFormData({
                    truckId: "",
                    destination: "",
                    date: "",
                    cargo: "",
                    status: "scheduled",
                  });
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
                    <label htmlFor="truckSelect">Camion <span className="required-field">*</span></label>
                    
                    {/* Dropdown selection instead of text search */}
                    <div className="truck-select-container">
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
                        required
                      >
                        <option value="">-- Sélectionnez un camion --</option>
                        {trucks.map(truck => (
                          <option key={truck.id} value={truck.id}>
                            {truck.immatriculation}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Alternative search functionality */}
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
                    
                    {/* Removed the error message that was showing when a truck was selected */}
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
                      min={new Date().toISOString().split('T')[0]} // Set min date to today
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
                        setFormData({
                          truckId: "",
                          destination: "",
                          date: "",
                          cargo: "",
                          status: "scheduled",
                        });
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
      </main>
    </div>
  );
};

export default TripScheduler;