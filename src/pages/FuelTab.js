import React, { useState, useEffect, useCallback } from "react";
import "./FuelTab.css";
import { supabase } from "../supabase";
import { useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const FuelTab = ({ onFuelAdded }) => {
  const { id } = useParams();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [monthOptions, setMonthOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newRefuel, setNewRefuel] = useState({
    kilometers: "",
    liters: "",
    fuelPrice: "1.898",
    cost: "",
    date: new Date().toISOString().split('T')[0],
    lastKilometrage: "",
    isExternal: false,
    stationName: "",
    voyage: "", // Added voyage field
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastEntryLoading, setLastEntryLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [fuelChartData, setFuelChartData] = useState([]);
  const [lastFuelEntry, setLastFuelEntry] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState({
    currentMonthCost: 0,
    currentMonthMileage: 0,
  });
  const [localHistory, setLocalHistory] = useState([]);

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

  const calculateMetrics = (currentEntry, previousEntry) => {
    const kilometers = parseFloat(currentEntry.kilometers) || 0;
    const liters = parseFloat(currentEntry.liters) || 0;
    const cost = parseFloat(currentEntry.cost) || 0;
    let distanceTraveled = 0;
    if (previousEntry) {
      const prevKilometers = parseFloat(previousEntry.kilometers) || 0;
      distanceTraveled = kilometers - prevKilometers;
      if (distanceTraveled < 0) {
        console.warn(
          `Negative distance detected: current=${kilometers}, previous=${prevKilometers}`
        );
        distanceTraveled = 0;
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

  const fetchFuelHistory = useCallback(async () => {
    if (!id) {
      console.warn("No truck_id provided");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('fuel_history')
        .select('*')
        .eq('truck_id', id)
        .order('raw_date', { ascending: true });
      if (error) {
        console.error("Supabase fetch history error:", error);
        throw error;
      }
      console.log("Fetched fuel_history data:", data);
      const formattedHistory = data
        .filter((entry) => {
          const isValid =
            entry.kilometers != null &&
            entry.liters != null &&
            entry.fuel_price != null &&
            entry.cost != null &&
            entry.raw_date;
          if (!isValid) {
            console.warn("Filtering out invalid database entry:", {
              entry,
              missingFields: {
                kilometers: entry.kilometers != null,
                liters: entry.liters != null,
                fuel_price: entry.fuel_price != null,
                cost: entry.cost != null,
                raw_date: !!entry.raw_date,
              },
            });
          }
          return isValid;
        })
        .map((entry) => ({
          id: entry.id,
          truck_id: entry.truck_id,
          kilometers: parseFloat(entry.kilometers),
          liters: parseFloat(entry.liters),
          fuel_price: parseFloat(entry.fuel_price),
          cost: parseFloat(entry.cost),
          raw_date: entry.raw_date,
          timestamp: parseDate(entry.raw_date).getTime(),
          distance_traveled: parseFloat(entry.distance_traveled) || 0,
          consumption: parseFloat(entry.consumption) || 0,
          cost_per_km: parseFloat(entry.cost_per_km) || 0,
          liters_per_100km: parseFloat(entry.liters_per_100km) || 0,
          is_external: entry.is_external || false,
          station_name: entry.station_name || "",
          voyage: entry.voyage || "", // Added voyage field
        }));
      console.log("Formatted fuel history:", formattedHistory);
      setLocalHistory(formattedHistory);
    } catch (err) {
      console.error("Error fetching fuel history:", err);
      setFetchError(`Erreur lors du chargement de l'historique: ${err.message}`);
    }
  }, [id]);

  useEffect(() => {
    async function fetchLastFuelEntry() {
      if (!id) return;
      try {
        setLastEntryLoading(true);
        const { data, error } = await supabase
          .from('fuel_history')
          .select('*')
          .eq('truck_id', id)
          .order('raw_date', { ascending: false })
          .limit(1);
        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }
        if (data && data.length > 0) {
          const lastEntry = {
            id: data[0].id,
            truck_id: data[0].truck_id,
            kilometers: parseFloat(data[0].kilometers),
            liters: parseFloat(data[0].liters),
            fuel_price: parseFloat(data[0].fuel_price),
            cost: parseFloat(data[0].cost),
            raw_date: data[0].raw_date,
            timestamp: parseDate(data[0].raw_date).getTime(),
            distance_traveled: parseFloat(data[0].distance_traveled) || 0,
            consumption: parseFloat(data[0].consumption) || 0,
            cost_per_km: parseFloat(data[0].cost_per_km) || 0,
            liters_per_100km: parseFloat(data[0].liters_per_100km) || 0,
            is_external: data[0].is_external || false,
            station_name: data[0].station_name || "",
            voyage: data[0].voyage || "", // Added voyage field
          };
          setLastFuelEntry(lastEntry);
          setNewRefuel((prev) => ({
            ...prev,
            lastKilometrage: lastEntry.kilometers.toString(),
          }));
        } else {
          setLastFuelEntry(null);
        }
      } catch (err) {
        console.error("Error fetching last fuel entry:", err);
        setFetchError(`Erreur lors du chargement du dernier plein: ${err.message}`);
      } finally {
        setLastEntryLoading(false);
      }
    }
    fetchLastFuelEntry();
    fetchFuelHistory();
  }, [id, fetchFuelHistory]);

  useEffect(() => {
    const frenchMonths = [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];
    const monthsSet = new Set();
    
    localHistory.forEach((entry) => {
      if (entry.raw_date) {
        const date = parseDate(entry.raw_date);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          monthsSet.add(`${year}-${month}`);
        }
      }
    });

    const options = Array.from(monthsSet)
      .map((yearMonth) => {
        const [year, month] = yearMonth.split('-').map(Number);
        return {
          value: yearMonth,
          label: `${frenchMonths[month - 1]} ${year}`
        };
      })
      .sort((a, b) => a.value.localeCompare(b.value));

    if (options.length === 0) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      options.push({
        value: `${year}-${month}`,
        label: `${frenchMonths[now.getMonth()]} ${year}`
      });
    }

    setMonthOptions(options);

    const mostRecentMonth = options.length > 0 ? options[options.length - 1].value : selectedMonth;
    if (!options.some(option => option.value === selectedMonth)) {
      setSelectedMonth(mostRecentMonth);
    }
  }, [localHistory, selectedMonth]);

  useEffect(() => {
    if (localHistory && localHistory.length > 0) {
      const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
      const startDate = new Date(selectedYear, selectedMonthNum - 1, 1);
      const endDate = new Date(selectedYear, selectedMonthNum, 0);
      const chartData = localHistory
        .map((entry, index, array) => {
          if (!entry?.raw_date) {
            console.warn("Skipping chart entry, missing raw_date:", entry);
            return null;
          }
          const previousEntry = index > 0 ? array[index - 1] : null;
          const metrics = calculateMetrics(entry, previousEntry);
          if (parseFloat(metrics.distanceTraveled) <= 0) {
            console.log("Skipping entry from chart data (no distanceTraveled):", entry);
            return null;
          }
          const entryDate = parseDate(entry.raw_date);
          if (entryDate < startDate || entryDate > endDate) {
            return null;
          }
          const consumption = parseFloat(metrics.consumption);
          const costPerKm = parseFloat(metrics.costPerKm);
          const litersPer100km = parseFloat(metrics.litersPer100km);
          const cost = parseFloat(entry.cost) || 0;
          if (
            isNaN(consumption) ||
            isNaN(costPerKm) ||
            isNaN(litersPer100km) ||
            isNaN(cost)
          ) {
            console.warn("Invalid chart data values:", {
              entry,
              consumption,
              costPerKm,
              litersPer100km,
              cost,
            });
            return null;
          }
          return {
            date: entryDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            consumption,
            costPerKm,
            cost,
            litersPer100km,
            timestamp: entryDate.getTime(),
          };
        })
        .filter((entry) => entry)
        .sort((a, b) => a.timestamp - b.timestamp);
      console.log("Generated chart data:", chartData);
      setFuelChartData(chartData);

      let selectedMonthCost = 0;
      let selectedMonthMileage = 0;
      localHistory.forEach((entry, index, array) => {
        if (!entry?.raw_date) return;
        const entryDate = parseDate(entry.raw_date);
        const metrics = calculateMetrics(entry, index > 0 ? array[index - 1] : null);
        if (
          entryDate.getMonth() + 1 === selectedMonthNum &&
          entryDate.getFullYear() === selectedYear
        ) {
          selectedMonthCost += parseFloat(entry.cost) || 0;
          selectedMonthMileage += parseFloat(metrics.distanceTraveled) || 0;
        }
      });
      setMonthlySummary({
        currentMonthCost: selectedMonthCost.toFixed(2),
        currentMonthMileage: selectedMonthMileage.toFixed(0),
      });
    } else {
      setFuelChartData([]);
      setMonthlySummary({
        currentMonthCost: 0,
        currentMonthMileage: 0,
      });
    }
  }, [localHistory, selectedMonth]);

  const handleOpenModal = () => {
    setShowModal(true);
    setError("");
    setNewRefuel({
      kilometers: "",
      liters: "",
      fuelPrice: newRefuel.isExternal ? "" : "1.898",
      cost: "",
      date: new Date().toISOString().split('T')[0],
      lastKilometrage: lastFuelEntry?.kilometers ? lastFuelEntry.kilometers.toString() : "",
      isExternal: false,
      stationName: "",
      voyage: "", // Added voyage field
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError("");
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setNewRefuel((prev) => ({
        ...prev,
        isExternal: checked,
        fuelPrice: checked ? "" : "1.898",
        stationName: checked ? prev.stationName : "",
      }));
    } else if (name === "liters" || name === "fuelPrice") {
      const liters = name === "liters" ? parseFloat(value) || 0 : parseFloat(newRefuel.liters) || 0;
      const price = name === "fuelPrice" ? parseFloat(value) || 0 : parseFloat(newRefuel.fuelPrice) || 0;
      const calculatedCost = (liters * price).toFixed(2);
      setNewRefuel({
        ...newRefuel,
        [name]: value,
        cost: calculatedCost,
      });
    } else if (name === "cost") {
      const liters = parseFloat(newRefuel.liters) || 0;
      if (liters > 0) {
        const calculatedPrice = ((parseFloat(value) || 0) / liters).toFixed(3);
        setNewRefuel({
          ...newRefuel,
          cost: value,
          fuelPrice: calculatedPrice,
        });
      } else {
        setNewRefuel({
          ...newRefuel,
          cost: value,
        });
      }
    } else {
      setNewRefuel({
        ...newRefuel,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newRefuel.kilometers || !newRefuel.liters || !newRefuel.cost || !newRefuel.fuelPrice) {
      setError("Tous les champs obligatoires doivent être remplis");
      return;
    }
    if (newRefuel.isExternal && !newRefuel.stationName) {
      setError("Le nom de la station est requis pour les pleins externes");
      return;
    }
    const kilometers = parseFloat(newRefuel.kilometers);
    const liters = parseFloat(newRefuel.liters);
    const cost = parseFloat(newRefuel.cost);
    const fuelPrice = parseFloat(newRefuel.fuelPrice);
    const inputDate = parseDate(newRefuel.date);
    if (isNaN(kilometers) || isNaN(liters) || isNaN(cost) || isNaN(fuelPrice)) {
      setError("Le kilométrage, les litres, le prix et le coût doivent être des nombres");
      return;
    }
    if (kilometers <= 0 || liters <= 0 || cost <= 0 || fuelPrice <= 0) {
      setError("Le kilométrage, les litres, le prix et le coût doivent être supérieurs à zéro");
      return;
    }
    if (inputDate > new Date()) {
      setError("La date ne peut pas être dans le futur");
      return;
    }
    if (!lastEntryLoading && lastFuelEntry && kilometers <= lastFuelEntry.kilometers) {
      setError(`Le kilométrage doit être supérieur à ${lastFuelEntry.kilometers} km (dernier enregistrement)`);
      return;
    }
    try {
      setLoading(true);

      const metrics = calculateMetrics(
        { kilometers, liters, cost },
        lastFuelEntry
      );
      const newRecord = {
        truck_id: id,
        kilometers,
        liters,
        fuel_price: fuelPrice,
        cost,
        raw_date: newRefuel.date,
        distance_traveled: parseFloat(metrics.distanceTraveled),
        consumption: parseFloat(metrics.consumption),
        cost_per_km: parseFloat(metrics.costPerKm),
        liters_per_100km: parseFloat(metrics.litersPer100km),
        created_at: new Date().toISOString(),
        is_external: newRefuel.isExternal,
        station_name: newRefuel.isExternal ? newRefuel.stationName : null,
        voyage: newRefuel.voyage || "", // Added voyage field
      };

      // Insert fuel_history record
      const { data, error: fuelError } = await supabase
        .from('fuel_history')
        .insert([newRecord])
        .select();
      if (fuelError) {
        console.error("Supabase insert fuel error:", fuelError);
        throw fuelError;
      }

      // Update tank level and log transaction only for internal refuels
      if (!newRefuel.isExternal) {
        const { data: tankData, error: tankFetchError } = await supabase
          .from('fuel_tank')
          .select('id, current_level')
          .single();
        if (tankFetchError) {
          console.error("Error fetching tank:", tankFetchError);
          throw tankFetchError;
        }
        if (tankData.current_level < liters) {
          setError(`Stock carburant insuffisant: ${tankData.current_level.toFixed(2)} L disponibles`);
          return;
        }

        const newTankLevel = tankData.current_level - liters;
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
            amount: -liters,
            type: 'refuel',
            truck_id: id,
            created_at: new Date().toISOString(),
          }]);
        if (transactionError) {
          console.error("Supabase insert transaction error:", transactionError);
          throw transactionError;
        }
      }

      const newEntry = {
        id: data[0].id,
        truck_id: id,
        kilometers,
        liters,
        fuel_price: fuelPrice,
        cost,
        raw_date: newRefuel.date,
        timestamp: inputDate.getTime(),
        distance_traveled: parseFloat(metrics.distanceTraveled),
        consumption: parseFloat(metrics.consumption),
        cost_per_km: parseFloat(metrics.costPerKm),
        liters_per_100km: parseFloat(metrics.litersPer100km),
        is_external: newRefuel.isExternal,
        station_name: newRefuel.isExternal ? newRefuel.stationName : "",
        voyage: newRefuel.voyage || "", // Added voyage field
      };
      setLocalHistory((prev) => [...prev, newEntry].sort((a, b) => parseDate(a.raw_date) - parseDate(b.raw_date)));
      setLastFuelEntry(newEntry);
      setShowModal(false);
      alert("Plein ajouté avec succès !");
      if (onFuelAdded && typeof onFuelAdded === 'function') {
        onFuelAdded();
      }
      await fetchFuelHistory();
    } catch (err) {
      console.error("Error adding fuel record:", err);
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fuel-tab-content">
      {fetchError && <div className="error-message">{fetchError}</div>}
      <div className="fuel-header">
        <h3>Carburant et Consommation</h3>
        <p>Enregistrez et suivez la consommation de carburant</p>
        <button className="add-fuel-btn" onClick={handleOpenModal}>
          <span className="plus-icon">+</span> Ajouter un Plein
        </button>
      </div>
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
      <div className="fuel-charts">
        <div className="month-selector">
          <label htmlFor="monthSelect">Sélectionner le mois :</label>
          <select
            id="monthSelect"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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
                  name="Coût/km"
                  yAxisId="right"
                  stroke="#FF5722"
                  fill="#FFCCBC"
                  stackId="2"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-chart-data">
              <p>Aucune données disponible pour le mois sélectionné.</p>
            </div>
          )}
        </section>
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
                  formatter={(value) => [`${value.toFixed(2)} L/100km`, "Consommation"]}
                />
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
              <p>Aucune données de consommation disponible pour le mois sélectionné.</p>
            </div>
          )}
        </section>
        <section className="fuel-cost-chart">
          <h3>💰 Coût Total des Pleins</h3>
          {fuelChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={fuelChartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "none", color: "#000" }}
                  formatter={(value) => [`${value.toFixed(2)} TND`, "Coût Total"]}
                />
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
              <p>Aucune données de coût disponible pour le mois sélectionné.</p>
            </div>
          )}
        </section>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Ajouter un Plein</h3>
              <button className="close-modal" onClick={handleCloseModal}>
                ×
              </button>
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
                  placeholder={
                    lastEntryLoading
                      ? "Chargement..."
                      : newRefuel.lastKilometrage
                      ? `Doit être > ${newRefuel.lastKilometrage}`
                      : "ex: 54321"
                  }
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
              <div className="form-group">
                <label htmlFor="voyage">Dernière destination</label>
                <input
                  type="text"
                  id="voyage"
                  name="voyage"
                  value={newRefuel.voyage}
                  onChange={handleInputChange}
                  placeholder="ex: Tunis - Sfax"
                />
              </div>
              <div className="form-group">
                <label htmlFor="isExternal">
                  <input
                    type="checkbox"
                    id="isExternal"
                    name="isExternal"
                    checked={newRefuel.isExternal}
                    onChange={handleInputChange}
                  />
                  Plein effectué à une station externe
                </label>
              </div>
              {newRefuel.isExternal && (
                <div className="form-group">
                  <label htmlFor="stationName">Nom de la station</label>
                  <input
                    type="text"
                    id="stationName"
                    name="stationName"
                    value={newRefuel.stationName}
                    onChange={handleInputChange}
                    placeholder="ex: Station Total Tunis"
                    required
                  />
                </div>
              )}
              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="fuelPrice">Prix par litre (TND)</label>
                  <input
                    type="number"
                    id="fuelPrice"
                    name="fuelPrice"
                    value={newRefuel.fuelPrice}
                    onChange={handleInputChange}
                    placeholder="ex: 1.898"
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
                <button type="submit" className="save-btn" disabled={loading}>
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