import React, { useState, useEffect } from "react";
import "./FuelHistoryTab.css";
import { supabase } from "../supabase";

const FuelHistoryTab = ({ fuelHistory, onFuelAdded }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRefuel, setEditRefuel] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupedHistory, setGroupedHistory] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  // Parse date to Date object
  const parseDate = (dateInput) => {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid parsed date: ${dateInput}`);
        return new Date(0);
      }
      return date;
    }
    console.warn(`Unrecognized date format: ${dateInput}`);
    return new Date(dateInput);
  };

  // Calculate metrics (fallback if database values are missing)
  const calculateMetrics = (currentEntry, previousEntry) => {
    const kilometers = parseFloat(currentEntry.kilometers) || 0;
    const liters = parseFloat(currentEntry.liters) || 0;
    const cost = parseFloat(currentEntry.cost) || 0;
    let distanceTraveled = 0;
    if (previousEntry) {
      const prevKilometers = parseFloat(previousEntry.kilometers) || 0;
      distanceTraveled = kilometers - prevKilometers;
      console.log(
        `Calculating distanceTraveled: current=${kilometers}, previous=${prevKilometers}, result=${distanceTraveled}`
      );
      if (distanceTraveled < 0) {
        console.warn(
          `Negative distance detected: current=${kilometers}, previous=${prevKilometers}`
        );
        // Use absolute value to allow display, but flag for data correction
        distanceTraveled = Math.abs(distanceTraveled);
      }
    }
    const consumption = distanceTraveled > 0 && liters > 0 ? distanceTraveled / liters : 0;
    const litersPer100km = distanceTraveled > 0 && liters > 0 ? (liters * 100) / distanceTraveled : 0;
    const costPerKm = distanceTraveled > 0 && cost > 0 ? cost / distanceTraveled : 0;
    return {
      distanceTraveled: distanceTraveled.toFixed(2),
      consumption: consumption.toFixed(2),
      litersPer100km: litersPer100km.toFixed(2),
      costPerKm: costPerKm.toFixed(3),
    };
  };

  // Process history for grouping
  useEffect(() => {
    console.log("FuelHistoryTab received fuelHistory:", JSON.stringify(fuelHistory, null, 2));
    if (fuelHistory && fuelHistory.length > 0) {
      const validHistory = fuelHistory
        .map((entry, index) => {
          if (!entry) {
            console.warn(`Skipping null entry at index ${index}:`, { entry });
            return null;
          }
          console.log(`Processing entry at index ${index}:`, JSON.stringify(entry, null, 2));
          const normalizedEntry = {
            id: entry.id,
            truck_id: entry.truck_id || entry.truckId,
            raw_date: entry.raw_date || entry.rawDate,
            kilometers: entry.kilometers != null ? parseFloat(entry.kilometers) : 0,
            liters: entry.liters != null ? parseFloat(entry.liters) : 0,
            fuel_price: entry.fuel_price != null ? parseFloat(entry.fuel_price) : 1.898,
            cost: entry.cost != null ? parseFloat(entry.cost) : 0,
            timestamp: entry.timestamp || (entry.raw_date ? parseDate(entry.raw_date).getTime() : 0),
            distance_traveled:
              entry.distance_traveled != null ? parseFloat(entry.distance_traveled) : 0,
            consumption: entry.consumption != null ? parseFloat(entry.consumption) : 0,
            cost_per_km: entry.cost_per_km != null ? parseFloat(entry.cost_per_km) : 0,
            liters_per_100km:
              entry.liters_per_100km != null ? parseFloat(entry.liters_per_100km) : 0,
          };
          if (!normalizedEntry.raw_date) {
            console.warn(`Entry at index ${index} missing date:`, normalizedEntry);
            return null;
          }
          return normalizedEntry;
        })
        .filter((entry) => entry != null)
        // Sort by raw_date ascending
        .sort((a, b) => {
          const dateA = parseDate(a.raw_date);
          const dateB = parseDate(b.raw_date);
          return dateA - dateB;
        });

      console.log("Valid history after filtering:", JSON.stringify(validHistory, null, 2));

      const grouped = {};
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      validHistory.forEach((entry, index, array) => {
        const raw_date = entry.raw_date;
        const entryDate = parseDate(raw_date);
        const month = entryDate.getMonth() + 1;
        const year = entryDate.getFullYear();
        const monthYearKey = `${month}/${year}`;
        const previousEntry = index > 0 ? array[index - 1] : null;
        // Prefer database metrics if distance_traveled is valid
        const metrics =
          entry.distance_traveled > 0
            ? {
                distanceTraveled: entry.distance_traveled.toFixed(2),
                consumption: entry.consumption > 0 ? entry.consumption.toFixed(2) : calculateMetrics(entry, previousEntry).consumption,
                litersPer100km: entry.liters_per_100km > 0 ? entry.liters_per_100km.toFixed(2) : calculateMetrics(entry, previousEntry).litersPer100km,
                costPerKm: entry.cost_per_km > 0 ? entry.cost_per_km.toFixed(3) : calculateMetrics(entry, previousEntry).costPerKm,
              }
            : calculateMetrics(
                {
                  kilometers: entry.kilometers,
                  liters: entry.liters,
                  cost: entry.cost,
                },
                previousEntry
              );

        if (!grouped[monthYearKey]) {
          grouped[monthYearKey] = {
            entries: [],
            month,
            year,
            monthName: new Date(year, month - 1, 1).toLocaleString('fr-FR', { month: 'long' }),
            totalCost: 0,
            totalMileage: 0,
          };
          if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
            setExpandedMonths((prev) => ({
              ...prev,
              [monthYearKey]: true,
            }));
          }
        }

        grouped[monthYearKey].entries.push({
          ...entry,
          raw_date,
          date: new Date(raw_date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          distanceTraveled: metrics.distanceTraveled,
          consumption: metrics.consumption,
          costPerKm: metrics.costPerKm,
          litersPer100km: metrics.litersPer100km,
        });
        grouped[monthYearKey].totalCost += parseFloat(entry.cost) || 0;
        grouped[monthYearKey].totalMileage += parseFloat(metrics.distanceTraveled) || 0;
      });

      Object.keys(grouped).forEach((monthYear) => {
        grouped[monthYear].entries.sort((a, b) => {
          const dateA = parseDate(a.raw_date);
          const dateB = parseDate(b.raw_date);
          return dateB - dateA;
        });
      });

      setGroupedHistory(grouped);
    } else {
      console.log("Fuel history is empty or undefined:", fuelHistory);
      setGroupedHistory({});
    }
  }, [fuelHistory]);

  const toggleMonthExpand = (monthYear) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthYear]: !prev[monthYear],
    }));
  };

  const handleOpenEditModal = (entry) => {
    const safeEntry = {
      id: entry.id,
      truck_id: entry.truck_id || entry.truckId,
      kilometers: entry.kilometers != null ? parseFloat(entry.kilometers) : 0,
      liters: entry.liters != null ? parseFloat(entry.liters) : 0,
      fuel_price: entry.fuel_price != null ? parseFloat(entry.fuel_price) : 1.898,
      cost: entry.cost != null ? parseFloat(entry.cost) : 0,
      raw_date: entry.raw_date || entry.rawDate || new Date().toISOString().split('T')[0],
    };

    setEditRefuel({
      id: safeEntry.id,
      truckId: safeEntry.truck_id,
      kilometers: safeEntry.kilometers.toString(),
      liters: safeEntry.liters.toString(),
      fuelPrice: safeEntry.fuel_price.toString(),
      cost: safeEntry.cost.toString(),
      date: safeEntry.raw_date,
    });
    setShowEditModal(true);
    setError("");
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditRefuel(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "liters") {
      const liters = parseFloat(value) || 0;
      const fuelPrice = parseFloat(editRefuel.fuelPrice) || 1.898;
      const calculatedCost = (liters * fuelPrice).toFixed(2);
      setEditRefuel({
        ...editRefuel,
        liters: value,
        cost: calculatedCost,
      });
    } else if (name === "kilometers" || name === "date") {
      setEditRefuel({
        ...editRefuel,
        [name]: value,
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editRefuel.kilometers || !editRefuel.liters || !editRefuel.fuelPrice) {
      setError("Kilométrage et litres sont obligatoires");
      return;
    }
    const kilometers = parseFloat(editRefuel.kilometers);
    const liters = parseFloat(editRefuel.liters);
    const fuelPrice = parseFloat(editRefuel.fuelPrice);
    const cost = liters * fuelPrice;
    const inputDate = parseDate(editRefuel.date);
    if (isNaN(kilometers) || isNaN(liters) || isNaN(fuelPrice)) {
      setError("Le kilométrage, les litres et le prix doivent être des nombres");
      return;
    }
    if (kilometers <= 0 || liters <= 0 || fuelPrice <= 0) {
      setError("Le kilométrage, les litres et le prix doivent être supérieurs à zéro");
      return;
    }
    if (inputDate > new Date()) {
      setError("La date ne peut pas être dans le futur");
      return;
    }
    try {
      setLoading(true);
      const sortedHistory = [...fuelHistory].sort((a, b) => {
        const dateA = parseDate(a.raw_date || a.rawDate);
        const dateB = parseDate(b.raw_date || b.rawDate);
        return dateA - dateB;
      });
      const currentIndex = sortedHistory.findIndex((entry) => entry.id === editRefuel.id);
      const previousEntry = currentIndex > 0 ? sortedHistory[currentIndex - 1] : null;
      const metrics = calculateMetrics(
        { kilometers, liters, cost },
        previousEntry
      );
      const updatedRecord = {
        truck_id: editRefuel.truckId,
        kilometers,
        liters,
        fuel_price: fuelPrice,
        cost,
        raw_date: editRefuel.date,
        distance_traveled: parseFloat(metrics.distanceTraveled),
        consumption: parseFloat(metrics.consumption),
        cost_per_km: parseFloat(metrics.costPerKm),
        liters_per_100km: parseFloat(metrics.litersPer100km),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('fuel_history')
        .update(updatedRecord)
        .eq('id', editRefuel.id);
      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }
      setShowEditModal(false);
      alert("Plein modifié avec succès !");
      if (onFuelAdded && typeof onFuelAdded === 'function') {
        onFuelAdded();
      }
    } catch (err) {
      console.error("Error updating fuel record:", err);
      setError(`Erreur lors de la modification: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fuel-history">
      <div className="fuel-header">
        <h3>Historique des Pleins</h3>
      </div>
      <div className="fuel-entries-by-month">
        {Object.keys(groupedHistory).length > 0 ? (
          Object.keys(groupedHistory)
            .sort((a, b) => {
              const [monthA, yearA] = a.split('/').map(Number);
              const [monthB, yearB] = b.split('/').map(Number);
              if (yearA !== yearB) return yearB - yearA;
              return monthB - monthA;
            })
            .map((monthYear) => {
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
                        <div key={`${entry.raw_date}-${entry.timestamp}-${index}`} className="fuel-entry">
                          <div className="fuel-date">
                            <h4>{entry.date}</h4>
                            <p>{entry.liters} L · {entry.kilometers} km</p>
                            {parseFloat(entry.distanceTraveled) > 0 && (
                              <p className="distance-traveled">
                                Distance: +{parseFloat(entry.distanceTraveled).toFixed(0)} km
                              </p>
                            )}
                          </div>
                          <div className="fuel-consumption">
                            <h4>{parseFloat(entry.consumption)?.toFixed(2) || "N/A"} km/L</h4>
                            <p className="liters-per-100km">
                              {parseFloat(entry.litersPer100km)?.toFixed(2) || "N/A"} L/100km
                            </p>
                            <p className="cost-per-km">
                              {parseFloat(entry.costPerKm)?.toFixed(3) || "N/A"} TND/km
                            </p>
                            <p className="fuel-cost">{parseFloat(entry.cost)?.toFixed(2) || "N/A"} TND</p>
                          </div>
                          <button
                            className="modify-btn"
                            onClick={() => handleOpenEditModal(entry)}
                          >
                            Modifier
                          </button>
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
      {showEditModal && editRefuel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Modifier un Plein</h3>
              <button className="close-modal" onClick={handleCloseEditModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="refuel-form">
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label htmlFor="editDate">Date</label>
                <input
                  type="date"
                  id="editDate"
                  name="date"
                  value={editRefuel.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editKilometers">Kilométrage actuel</label>
                <input
                  type="number"
                  id="editKilometers"
                  name="kilometers"
                  value={editRefuel.kilometers}
                  onChange={handleInputChange}
                  placeholder="ex: 54321"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editLiters">Litres de carburant</label>
                <input
                  type="number"
                  id="editLiters"
                  name="liters"
                  value={editRefuel.liters}
                  onChange={handleInputChange}
                  placeholder="ex: 65.5"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="editFuelPrice">Prix par litre (TND)</label>
                  <input
                    type="number"
                    id="editFuelPrice"
                    name="fuelPrice"
                    value={editRefuel.fuelPrice}
                    disabled
                    step="0.001"
                  />
                </div>
                <div className="form-group half">
                  <label htmlFor="editCost">Coût total (TND)</label>
                  <input
                    type="number"
                    id="editCost"
                    name="cost"
                    value={editRefuel.cost}
                    disabled
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseEditModal}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? "Modification..." : "Modifier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelHistoryTab;