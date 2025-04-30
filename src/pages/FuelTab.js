import React, { useState, useEffect } from "react";
import "./FuelTab.css";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const FuelTab = ({ fuelHistory, onFuelAdded }) => {
  const { id } = useParams(); // Get truck ID from URL
  const [showModal, setShowModal] = useState(false);
  const [newRefuel, setNewRefuel] = useState({
    kilometers: "",
    liters: "",
    fuelPrice: "2.205", // Fixed price in Tunisia
    cost: "", // Total cost field
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastEntryLoading, setLastEntryLoading] = useState(true); // New loading state for last entry
  const [fuelChartData, setFuelChartData] = useState([]);
  const [lastFuelEntry, setLastFuelEntry] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState({
    currentMonthCost: 0,
    currentMonthMileage: 0
  });
  const [groupedHistory, setGroupedHistory] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  // Load the last fuel entry to validate kilometrage and calculate consumption
  useEffect(() => {
    async function fetchLastFuelEntry() {
      try {
        setLastEntryLoading(true); // Set loading to true when starting fetch
        
        const fuelQuery = query(
          collection(db, "fuelRecords"),
          where("truckId", "==", id),
          orderBy("timestamp", "desc")
        );
        
        const querySnapshot = await getDocs(fuelQuery);
        if (!querySnapshot.empty) {
          const lastEntry = querySnapshot.docs[0].data();
          console.log("Last fuel entry loaded:", lastEntry); // Debug log
          setLastFuelEntry(lastEntry);
          
          // Update the form with last kilometrage as a hint
          setNewRefuel(prev => ({
            ...prev,
            lastKilometrage: lastEntry.kilometers
          }));
        } else {
          console.log("No previous fuel entries found"); // Debug log
          setLastFuelEntry(null);
        }
      } catch (err) {
        console.error("Error fetching last fuel entry:", err);
      } finally {
        setLastEntryLoading(false); // Set loading to false after fetch completes
      }
    }
    
    if (id) {
      fetchLastFuelEntry();
    }
    
  }, [id]); // Only depend on id, not fuelHistory

  // Use separate effect to update last fuel entry when fuelHistory changes
  useEffect(() => {
    if (fuelHistory && fuelHistory.length > 0) {
      // Find the most recent entry from fuelHistory
      const sortedHistory = [...fuelHistory].sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        // If no timestamp, use the date
        if (a.date && b.date) {
          const [dayA, monthA, yearA] = a.date.split('/');
          const [dayB, monthB, yearB] = b.date.split('/');
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateB - dateA;
        }
        return 0;
      });
      
      if (sortedHistory[0]) {
        console.log("Last fuel entry from history:", sortedHistory[0]); // Debug log
        setLastFuelEntry(sortedHistory[0]);
        
        // Update the form if it's open
        setNewRefuel(prev => ({
          ...prev,
          lastKilometrage: sortedHistory[0].kilometers
        }));
      }
    }
  }, [fuelHistory]);

  // Process fuel history data for charts and monthly summary
  useEffect(() => {
    if (fuelHistory && fuelHistory.length > 0) {
      // Process fuel data for chart
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      
      // Format for chart (last 30 days, exclude entries without distanceTraveled)
      const chartData = fuelHistory
        .filter(entry => {
          if (!entry.date.includes('/')) return false;
          
          const [day, month, year] = entry.date.split('/');
          const entryDate = new Date(year, month - 1, day);
          
          // Only include entries with valid distanceTraveled (excludes first entry)
          return (
            entryDate >= last30Days &&
            entry.distanceTraveled > 0 &&
            entry.consumption !== undefined &&
            entry.consumption > 0
          );
        })
        .map(entry => {
          const dateParts = entry.date.split('/');
          const shortDate = `${dateParts[0]}/${dateParts[1]}`;
          
          // Calculate L/100km from km/L
          const litersPer100km = entry.consumption > 0 ? 
            (100 / entry.consumption) : 0;
            
          return {
            date: shortDate,
            consumption: entry.consumption || 0,
            costPerKm: entry.costPerKm || 0,
            cost: entry.cost || 0,
            litersPer100km: litersPer100km
          };
        })
        .sort((a, b) => {
          // Sort by date (assuming DD/MM format)
          const [dayA, monthA] = a.date.split('/');
          const [dayB, monthB] = b.date.split('/');
          const dateA = new Date(2025, parseInt(monthA) - 1, parseInt(dayA));
          const dateB = new Date(2025, parseInt(monthB) - 1, parseInt(dayB));
          return dateA - dateB;
        });
      
      setFuelChartData(chartData);
      
      // Group fuel history by month and calculate monthly summary
      const grouped = {};
      let currentMonthCost = 0;
      let currentMonthMileage = 0;
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      fuelHistory.forEach(entry => {
        if (!entry.date.includes('/')) return;
        
        const [day, month, year] = entry.date.split('/');
        const monthYearKey = `${month}/${year}`;
        const entryDate = new Date(year, month - 1, day);
        
        // Check if this entry is from current month for summary
        if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
          currentMonthCost += parseFloat(entry.cost) || 0;
          if (entry.distanceTraveled) {
            currentMonthMileage += parseFloat(entry.distanceTraveled) || 0;
          }
        }
        
        // Group by month/year
        if (!grouped[monthYearKey]) {
          grouped[monthYearKey] = {
            entries: [],
            month: month,
            year: year,
            monthName: new Date(year, month - 1, 1).toLocaleString('fr-FR', { month: 'long' }),
            totalCost: 0,
            totalMileage: 0
          };
          
          // Set this month as expanded by default
          if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
            setExpandedMonths(prev => ({
              ...prev,
              [monthYearKey]: true
            }));
          }
        }
        
        grouped[monthYearKey].entries.push(entry);
        grouped[monthYearKey].totalCost += parseFloat(entry.cost) || 0;
        grouped[monthYearKey].totalMileage += parseFloat(entry.distanceTraveled) || 0;
      });
      
      // Sort entries within each month by date (newest first)
      Object.keys(grouped).forEach(monthYear => {
        grouped[monthYear].entries.sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split('/');
          const [dayB, monthB, yearB] = b.date.split('/');
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateB - dateA; // Newest first
        });
      });
      
      setGroupedHistory(grouped);
      setMonthlySummary({
        currentMonthCost: currentMonthCost.toFixed(2),
        currentMonthMileage: currentMonthMileage.toFixed(0)
      });
    } else {
      setFuelChartData([]);
      setGroupedHistory({});
      setMonthlySummary({
        currentMonthCost: 0,
        currentMonthMileage: 0
      });
    }
  }, [fuelHistory]);

  const handleOpenModal = () => {
    setShowModal(true);
    setError("");
    // When opening the modal, ensure the lastKilometrage is correctly set
    setNewRefuel({
      kilometers: "",
      liters: "",
      fuelPrice: "2.205", // Fixed price in Tunisia
      cost: "",
      date: new Date().toISOString().split('T')[0],
      lastKilometrage: lastFuelEntry?.kilometers || "",
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "liters" || name === "fuelPrice") {
      // Calculate total cost automatically when liters or price changes
      const liters = name === "liters" ? parseFloat(value) || 0 : parseFloat(newRefuel.liters) || 0;
      const price = name === "fuelPrice" ? parseFloat(value) || 0 : parseFloat(newRefuel.fuelPrice) || 0;
      const calculatedCost = (liters * price).toFixed(2);
      
      setNewRefuel({
        ...newRefuel,
        [name]: value,
        cost: calculatedCost
      });
    } else if (name === "cost") {
      // When cost is updated directly, recalculate fuel price if liters is available
      const liters = parseFloat(newRefuel.liters) || 0;
      if (liters > 0) {
        const calculatedPrice = ((parseFloat(value) || 0) / liters).toFixed(3);
        setNewRefuel({
          ...newRefuel,
          cost: value,
          fuelPrice: calculatedPrice
        });
      } else {
        setNewRefuel({
          ...newRefuel,
          cost: value
        });
      }
    } else {
      setNewRefuel({
        ...newRefuel,
        [name]: value
      });
    }
  };

  const toggleMonthExpand = (monthYear) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthYear]: !prev[monthYear]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!newRefuel.kilometers || !newRefuel.liters || !newRefuel.cost) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    const kilometers = parseFloat(newRefuel.kilometers);
    const liters = parseFloat(newRefuel.liters);
    const cost = parseFloat(newRefuel.cost);
    const fuelPrice = parseFloat(newRefuel.fuelPrice);

    if (isNaN(kilometers) || isNaN(liters) || isNaN(cost)) {
      setError("Le kilométrage, les litres et le coût total doivent être des nombres");
      return;
    }

    if (kilometers <= 0 || liters <= 0 || cost <= 0) {
      setError("Le kilométrage, les litres et le coût doivent être supérieurs à zéro");
      return;
    }

    // Only validate against lastFuelEntry if it exists and not loading
    if (!lastEntryLoading && lastFuelEntry && kilometers <= lastFuelEntry.kilometers) {
      console.log("Validation failed:", kilometers, lastFuelEntry.kilometers);
      setError(`Le kilométrage doit être supérieur à ${lastFuelEntry.kilometers} km (dernier enregistrement)`);
      return;
    }

    try {
      setLoading(true);
      
      // Initialize variables for fuel calculations
      let consumption = 0;
      let distanceTraveled = 0;
      let costPerKm = 0;
      let litersPer100km = 0;
      
      if (lastFuelEntry) {
        // Calculate based on previous record
        distanceTraveled = kilometers - lastFuelEntry.kilometers;
        
        // Consumption in km/L based on current distance and current fuel amount
        consumption = liters > 0 ? (distanceTraveled / liters) : 0;
        
        // L/100km calculation
        litersPer100km = distanceTraveled > 0 ? (liters * 100 / distanceTraveled) : 0;
        
        // Cost per kilometer for this refueling
        costPerKm = distanceTraveled > 0 ? (cost / distanceTraveled) : 0;
      }
      
      const formattedDate = new Date(newRefuel.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      console.log("Adding new fuel record:", {
        truckId: id,
        kilometers,
        liters,
        fuelPrice,
        cost,
        date: new Date(newRefuel.date),
        distanceTraveled,
        consumption,
        costPerKm,
        litersPer100km
      });
      
      // Create a new document in the fuelRecords collection
      const docRef = await addDoc(collection(db, "fuelRecords"), {
        truckId: id,
        kilometers: kilometers,
        liters: liters,
        fuelPrice: fuelPrice,
        cost: cost,
        date: formattedDate, // Store as formatted string for display
        rawDate: new Date(newRefuel.date), // Store actual date object for calculations
        timestamp: serverTimestamp(), // Server timestamp for sorting/filtering
        distanceTraveled: distanceTraveled,
        consumption: consumption,
        costPerKm: costPerKm,
        litersPer100km: litersPer100km
      });
      
      console.log("Document added with ID:", docRef.id);
      
      // Immediately update lastFuelEntry with the new entry to ensure proper state
      const newEntry = {
        kilometers: kilometers,
        liters: liters,
        fuelPrice: fuelPrice,
        cost: cost,
        date: formattedDate
      };
      setLastFuelEntry(newEntry);
      
      // Close modal after successful submission
      setShowModal(false);
      alert("Plein ajouté avec succès !");
      
      // Call the callback function to refresh the fuel history
      if (onFuelAdded && typeof onFuelAdded === 'function') {
        console.log("Calling onFuelAdded callback");
        onFuelAdded();
      } else {
        console.log("onFuelAdded callback is not available");
      }
    } catch (err) {
      console.error("Error adding fuel record:", err);
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fuel-tab-content">
      <div className="fuel-header">
        <h3>Carburant et Consommation</h3>
        <p>Enregistrez et suivez la consommation de carburant</p>
        <button className="add-fuel-btn" onClick={handleOpenModal}>
          <span className="plus-icon">+</span> Ajouter un Plein
        </button>
      </div>

      {/* Monthly Summary Box */}
      <div className="monthly-summary-box">
        <div className="summary-item">
          <span className="summary-label">Coût total du mois:</span>
          <span className="summary-value">{monthlySummary.currentMonthCost} TND</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Kilométrage du mois:</span>
          <span className="summary-value">{monthlySummary.currentMonthMileage} km</span>
        </div>
      </div>

      {/* Charts Section - Moved to top */}
      <div className="fuel-charts">
        {/* Chart 1: Combined Efficiency and Cost per KM */}
        <section className="fuel-combined-chart">
          <h3>⛽ Rendement et Coût par Kilomètre</h3>
          {fuelChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart 
                data={fuelChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" stroke="#1E88E5" />
                <YAxis yAxisId="right" orientation="right" stroke="#FF5722" />
                <Tooltip 
                 contentStyle={{ backgroundColor: "#fff", border: "none", color: "#000" }}
                  formatter={(value, name) => {
                    if (name === "consumption") {
                      return [`${value.toFixed(2)} km/L`, "Rendement"];
                    }
                    if (name === "costPerKm") {
                      return [`${value.toFixed(3)} TND/km`, "Coût/km"];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="consumption" 
                  name="Rendement (km/L)"
                  yAxisId="left"
                  stroke="#1E88E5" 
                  fill="#BBDEFB" 
                  stackId="1"
                />
                <Area 
                  type="monotone" 
                  dataKey="costPerKm" 
                  name="Coût/km (TND)"
                  yAxisId="right"
                  stroke="#FF5722" 
                  fill="#FFCCBC" 
                  stackId="2"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-chart-data">
              <p>Aucune donnée disponible pour les 30 derniers jours.</p>
            </div>
          )}
        </section>

        {/* Chart 2: Liters per 100km (Fuel Consumption) */}
        <section className="fuel-consumption-chart">
          <h3>🚗 Consommation (L/100km)</h3>
          {fuelChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart 
                data={fuelChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "none", color: "#000" }} 
                formatter={(value) => [`${value.toFixed(2)} L/100km`, "Consommation"]} />
                <Area 
                  type="monotone" 
                  dataKey="litersPer100km" 
                  name="L/100km"
                  stroke="#9C27B0" 
                  fill="#E1BEE7" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-chart-data">
              <p>Aucune donnée de consommation disponible pour les 30 derniers jours.</p>
            </div>
          )}
        </section>

        {/* Chart 3: Total Refueling Cost */}
        <section className="fuel-cost-chart">
          <h3>💰 Coût Total des Pleins</h3>
          {fuelChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={fuelChartData}>
                <XAxis dataKey="date"  />
                <YAxis />
                <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "none", color: "#000" }}
                 formatter={(value) => [`${value.toFixed(2)} TND`, "Coût Total"]} />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  name="Coût Total"
                  stroke="#4CAF50" 
                  fill="#C8E6C9" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-chart-data">
              <p>Aucune donnée de coût disponible pour les 30 derniers jours.</p>
            </div>
          )}
        </section>
      </div>

      {/* Fuel History Section - Moved below charts and grouped by month */}
      <div className="fuel-history">
        <div className="fuel-header">
          <h3>Historique des Pleins</h3>
        </div>

        <div className="fuel-entries-by-month">
          {Object.keys(groupedHistory).length > 0 ? (
            Object.keys(groupedHistory)
              .sort((a, b) => {
                // Sort by year and month, newest first
                const [monthA, yearA] = a.split('/');
                const [monthB, yearB] = b.split('/');
                if (yearA !== yearB) return yearB - yearA;
                return monthB - monthA;
              })
              .map(monthYear => {
                const monthData = groupedHistory[monthYear];
                return (
                  <div key={monthYear} className="month-group">
                    <div 
                      className="month-header" 
                      onClick={() => toggleMonthExpand(monthYear)}
                    >
                      <h4>
                        <span className={`expand-icon ${expandedMonths[monthYear] ? 'expanded' : ''}`}>
                          {expandedMonths[monthYear] ? '▼' : '►'}
                        </span>
                        {monthData.monthName} {monthData.year}
                      </h4>
                      <div className="month-summary">
                        <span>{monthData.entries.length} pleins</span>
                        <span>{monthData.totalCost.toFixed(2)} TND</span>
                        <span>{monthData.totalMileage.toFixed(0)} km</span>
                      </div>
                    </div>
                    
                    {expandedMonths[monthYear] && (
                      <div className="month-entries">
                        {monthData.entries.map((entry, index) => (
                          <div key={index} className="fuel-entry">
                            <div className="fuel-date">
                              <h4>{entry.date}</h4>
                              <p>{entry.liters} L · {entry.kilometers} km</p>
                              {entry.distanceTraveled > 0 && (
                                <p className="distance-traveled">Distance: +{entry.distanceTraveled} km</p>
                              )}
                            </div>
                            <div className="fuel-consumption">
                              <h4>{entry.consumption?.toFixed(2) || "N/A"} km/L</h4>
                              <p className="liters-per-100km">
                                {entry.litersPer100km?.toFixed(2) || "N/A"} L/100km
                              </p>
                              <p className="cost-per-km">{entry.costPerKm?.toFixed(3) || "N/A"} TND/km</p>
                              <p className="fuel-cost">{entry.cost?.toFixed(2) || "N/A"} TND</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="no-data">
              <p>Aucun enregistrement de carburant trouvé pour ce camion.</p>
              <p className="note">Ajoutez un plein pour commencer le suivi.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for adding new refuel */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Ajouter un Plein</h3>
              <button className="close-modal" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="refuel-form">
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={newRefuel.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="kilometers">
                  Kilométrage actuel 
                  {lastEntryLoading ? (
                    <span className="hint">(Chargement...)</span>
                  ) : newRefuel.lastKilometrage ? (
                    <span className="hint">(Dernier: {newRefuel.lastKilometrage} km)</span>
                  ) : null}
                </label>
                <input
                  type="number"
                  id="kilometers"
                  name="kilometers"
                  value={newRefuel.kilometers}
                  onChange={handleInputChange}
                  placeholder={lastEntryLoading ? "Chargement..." : 
                    newRefuel.lastKilometrage ? 
                    `Doit être > ${newRefuel.lastKilometrage}` : "ex: 54321"}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="liters">Litres de carburant</label>
                <input
                  type="number"
                  id="liters"
                  name="liters"
                  value={newRefuel.liters}
                  onChange={handleInputChange}
                  placeholder="ex: 65.5"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="fuelPrice">Prix par litre (TND)</label>
                  <input
                    type="number"
                    id="fuelPrice"
                    name="fuelPrice"
                    value={newRefuel.fuelPrice}
                    onChange={handleInputChange}
                    placeholder="ex: 2.205"
                    step="0.001"
                    required
                  />
                </div>
                
                <div className="form-group half">
                  <label htmlFor="cost">Coût total (TND)</label>
                  <input
                    type="number"
                    id="cost"
                    name="cost"
                    value={newRefuel.cost}
                    onChange={handleInputChange}
                    placeholder="ex: 144.53"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={loading}
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelTab;