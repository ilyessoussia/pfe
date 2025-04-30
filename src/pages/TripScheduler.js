import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./TripScheduler.css";
import { db } from "../firebase";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";

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
  const [searchQuery, setSearchQuery] = useState(""); // New state for search bar
  const [currentPage, setCurrentPage] = useState(1);
  const tripsPerPage = 10;

  const truckListRef = useRef(null);

  // Fetch trucks and trips from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch trucks
        const trucksCollection = collection(db, "trucks");
        const trucksSnapshot = await getDocs(trucksCollection);
        const trucksData = trucksSnapshot.docs.map((doc) => ({
          id: doc.id,
          immatriculation: doc.data().immatriculation || doc.id,
        }));
        setTrucks(trucksData);
        setFilteredTrucks(trucksData);

        // Fetch trips
        const tripsCollection = collection(db, "trips");
        const tripsSnapshot = await getDocs(tripsCollection);
        const tripsData = tripsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTrips(tripsData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Échec du chargement des données.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle truck search
  useEffect(() => {
    const filtered = trucks.filter((truck) =>
      truck.immatriculation.toLowerCase().includes(truckSearch.toLowerCase())
    );
    setFilteredTrucks(filtered);
  }, [truckSearch, trucks]);

  // Handle clicks outside the truck list to close it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (truckListRef.current && !truckListRef.current.contains(e.target)) {
        setFilteredTrucks([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Select truck from search
  const handleTruckSelect = (truck) => {
    setFormData((prev) => ({ ...prev, truckId: truck.id }));
    setTruckSearch(truck.immatriculation);
    setFilteredTrucks([]); // Close the truck list after selection
  };

  // Handle form submission (add new trip)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.truckId || !formData.destination || !formData.date || !formData.cargo) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    const tripDate = new Date(formData.date);
    if (tripDate < new Date()) {
      setError("La date du voyage doit être dans le futur.");
      return;
    }

    try {
      setError(null);
      const formattedDate = tripDate.toLocaleDateString("fr-FR");
      const docRef = await addDoc(collection(db, "trips"), {
        truckId: formData.truckId,
        destination: formData.destination,
        date: formattedDate,
        rawDate: tripDate,
        cargo: formData.cargo,
        status: formData.status,
        createdAt: new Date(),
      });
      setTrips((prev) => [
        {
          id: docRef.id,
          truckId: formData.truckId,
          destination: formData.destination,
          date: formattedDate,
          rawDate: tripDate,
          cargo: formData.cargo,
          status: formData.status,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      setFormData({ truckId: "", destination: "", date: "", cargo: "", status: "scheduled" });
      setTruckSearch("");
      setShowAddTripModal(false);
      setSuccessMessage("Voyage planifié avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error scheduling trip:", err);
      setError("Erreur lors de la planification du voyage.");
    }
  };

  // Handle trip cancellation
  const handleCancel = async (tripId) => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler ce voyage ?")) {
      try {
        const tripRef = doc(db, "trips", tripId);
        await updateDoc(tripRef, { status: "canceled" });
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

  // Handle trip completion
  const handleComplete = async (tripId) => {
    if (window.confirm("Êtes-vous sûr de vouloir marquer ce voyage comme terminé ?")) {
      try {
        const tripRef = doc(db, "trips", tripId);
        await updateDoc(tripRef, { status: "completed" });
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

  // Sort trips by createdAt (newest first)
  const sortedTrips = [...trips].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Filter trips by status
  const filteredTripsByStatus = sortedTrips.filter(
    (trip) => filterStatus === "all" || trip.status === filterStatus
  );

  // Filter trips by search query
  const filteredTrips = filteredTripsByStatus.filter((trip) => {
    const truck = trucks.find((t) => t.id === trip.truckId);
    const searchLower = searchQuery.toLowerCase();
    return (
      (truck?.immatriculation || "").toLowerCase().includes(searchLower) ||
      trip.destination.toLowerCase().includes(searchLower) ||
      trip.cargo.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredTrips.length / tripsPerPage);
  const paginatedTrips = filteredTrips.slice(
    (currentPage - 1) * tripsPerPage,
    currentPage * tripsPerPage
  );

  return (
    <div className="trip-scheduler-container">
      {/* Sidebar */}
      <aside className="trip-scheduler-sidebar">
        <h2 className="trip-scheduler-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Tableau de Bord</Link>
            </li>
            <li>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li>
              <Link to="/stock">📦 Gestion de Stock</Link>
            </li>
            <li className="active">
              <Link to="/schedule">🗓️ Planifier un Programme</Link>
            </li>
            <li>
              <Link to="/maintenance">🛠️ Maintenance</Link>
            </li>
          </ul>
        </nav>
        <div className="trip-scheduler-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="trip-scheduler-content">
        <header className="trip-scheduler-header">
          <div>
            <h1>🗓️ Planifier un Programme</h1>
          </div>
          <div className="trip-scheduler-header-actions">
            <button
              className="trip-scheduler-add-btn"
              onClick={() => setShowAddTripModal(true)}
            >
              ➕ Planifier un Voyage
            </button>
            <Link to="/fleet/dashboard" className="trip-scheduler-back-btn">
              ⬅ Retour au Tableau de Bord
            </Link>
          </div>
        </header>

        {successMessage && (
          <div className="trip-scheduler-success-message">{successMessage}</div>
        )}
        {error && <div className="trip-scheduler-error-message">{error}</div>}

        {/* Tabs for List and Timeline View */}
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

        {/* Trip List Section */}
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

              {/* Pagination */}
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

        {/* Add Trip Modal */}
        {showAddTripModal && (
          <div className="trip-scheduler-modal">
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
                }}
              >
                ✕
              </button>
              <section className="trip-scheduler-form-section">
                <h2>Planifier un Nouveau Voyage</h2>
                <form onSubmit={handleSubmit} className="trip-scheduler-form">
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="truckSearch">Camion</label>
                    <input
                      type="text"
                      id="truckSearch"
                      value={truckSearch}
                      onChange={(e) => setTruckSearch(e.target.value)}
                      placeholder="Rechercher un camion..."
                      required
                    />
                    {truckSearch && filteredTrucks.length > 0 && (
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
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="destination">Destination</label>
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
                    <label htmlFor="date">Date du Voyage</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="trip-scheduler-form-group">
                    <label htmlFor="cargo">Cargaison</label>
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