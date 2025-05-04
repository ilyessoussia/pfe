import React, { useState, useEffect, useCallback } from "react";
import "./FuelTab.css";
import { supabase } from "../supabase";
import { useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const FuelTab = ({ onFuelAdded }) => {
  const { id } = useParams();
  // Move selectedMonth to the top to ensure it's initialized before use
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  });
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newRefuel, setNewRefuel] = useState({
    kilometers: "",
    liters: "",
    fuelPrice: "2.205",
    cost: "",
    date: new Date().toISOString().split('T')[0],
    lastKilometrage: "",
  });
  const [editRefuel, setEditRefuel] = useState(null);
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
  const [groupedHistory, setGroupedHistory] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});
  const [localHistory, setLocalHistory] = useState([]);

  // Format date as DD/MM/YYYY for display
  const formatDate = (dateInput) => {
    let date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date();
    }
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date input: ${dateInput}`);
      return "Invalid Date";
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Parse date to Date object, handling YYYY-MM-DD
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

  // Calculate metrics (distance, consumption, cost per km, liters per 100km)
  const calculateMetrics = (currentEntry, previousEntry) => {
    const kilometers = parseFloat(currentEntry.kilometers) || 0;
    const liters = parseFloat(currentEntry.liters) || 0;
    const cost = parseFloat(currentEntry.cost) || 0;
    const distanceTraveled = previousEntry
      ? kilometers - parseFloat(previousEntry.kilometers)
      : 0;
    const consumption = distanceTraveled > 0 ? distanceTraveled / liters : 0;
    const litersPer100km = distanceTraveled > 0 ? (liters * 100) / distanceTraveled : 0;
    const costPerKm = distanceTraveled > 0 ? cost / distanceTraveled : 0;
    return {
      distanceTraveled: distanceTraveled.toFixed(2),
      consumption: consumption.toFixed(2),
      litersPer100km: litersPer100km.toFixed(2),
      costPerKm: costPerKm.toFixed(3),
    };
  };

  // Fetch fuel history from Supabase
  const fetchFuelHistory = useCallback(async () => {
    if (!id) return;

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

      console.log("Fetched fuel history:", data);

      const formattedHistory = data.map((entry) => ({
        id: entry.id,
        truckId: entry.truck_id,
        kilometers: parseFloat(entry.kilometers),
        liters: parseFloat(entry.liters),
        fuelPrice: parseFloat(entry.fuel_price),
        cost: parseFloat(entry.cost),
        rawDate: entry.raw_date,
        timestamp: parseDate(entry.raw_date).getTime(),
        distanceTraveled: parseFloat(entry.distance_traveled) || 0,
        consumption: parseFloat(entry.consumption) || 0,
        costPerKm: parseFloat(entry.cost_per_km) || 0,
        litersPer100km: parseFloat(entry.liters_per_100km) || 0,
      }));

      setLocalHistory(formattedHistory);
    } catch (err) {
      console.error("Error fetching fuel history:", err);
      setFetchError(`Erreur lors du chargement de l'historique: ${err.message}`);
    }
  }, [id]);

  // Fetch last fuel entry from Supabase
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
          console.log("Last fuel entry loaded:", data[0]);
          const lastEntry = {
            id: data[0].id,
            truckId: data[0].truck_id,
            kilometers: parseFloat(data[0].kilometers),
            liters: parseFloat(data[0].liters),
            fuelPrice: parseFloat(data[0].fuel_price),
            cost: parseFloat(data[0].cost),
            rawDate: data[0].raw_date,
            timestamp: parseDate(data[0].raw_date).getTime(),
            distanceTraveled: parseFloat(data[0].distance_traveled) || 0,
            consumption: parseFloat(data[0].consumption) || 0,
            costPerKm: parseFloat(data[0].cost_per_km) || 0,
            litersPer100km: parseFloat(data[0].liters_per_100km) || 0,
          };
          setLastFuelEntry(lastEntry);
          setNewRefuel((prev) => ({
            ...prev,
            lastKilometrage: lastEntry.kilometers.toString(),
          }));
        } else {
          console.log("No previous fuel entries found");
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

  // Process history for charts and summaries
  useEffect(() => {
    console.log("Processing history:", localHistory);
    if (localHistory && localHistory.length > 0) {
      // Process and filter data for charts based on selected month
      const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
      const startDate = new Date(selectedYear, selectedMonthNum - 1, 1);
      const endDate = new Date(selectedYear, selectedMonthNum, 0);

      const chartData = localHistory
        .map((entry, index, array) => {
          if (!entry?.rawDate) {
            console.log("Skipping entry, missing rawDate:", entry);
            return null;
          }
          const previousEntry = index > 0 ? array[index - 1] : null;
          const metrics = calculateMetrics(entry, previousEntry);
          
          // Skip entries with distanceTraveled = 0 (no previous entry)
          if (parseFloat(metrics.distanceTraveled) <= 0) {
            console.log("Skipping first entry from chart data (no distanceTraveled):", entry);
            return null;
          }
          
          const entryDate = parseDate(entry.rawDate);
          if (entryDate < startDate || entryDate > endDate) {
            return null;
          }

          return {
            date: entryDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            consumption: parseFloat(metrics.consumption),
            costPerKm: parseFloat(metrics.costPerKm),
            cost: parseFloat(entry.cost) || 0,
            litersPer100km: parseFloat(metrics.litersPer100km),
            timestamp: entryDate.getTime(),
          };
        })
        .filter((entry) => entry)
        .sort((a, b) => a.timestamp - b.timestamp);

      console.log("Processed chart data:", chartData);
      setFuelChartData(chartData);

      // Process monthly summaries and group history by month
      const grouped = {};
      let currentMonthCost = 0;
      let currentMonthMileage = 0;
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      localHistory.forEach((entry, index, array) => {
        if (!entry?.rawDate) {
          console.log("Skipping invalid entry, missing rawDate:", entry);
          return;
        }
        const entryDate = parseDate(entry.rawDate);
        const month = entryDate.getMonth() + 1;
        const year = entryDate.getFullYear();
        const monthYearKey = `${month}/${year}`;
        const metrics = calculateMetrics(entry, index > 0 ? array[index - 1] : null);

        if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
          currentMonthCost += parseFloat(entry.cost) || 0;
          currentMonthMileage += parseFloat(metrics.distanceTraveled) || 0;
        }

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
          date: formatDate(entry.rawDate),
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
          const dateA = parseDate(a.rawDate);
          const dateB = parseDate(b.rawDate);
          return dateB - dateA;
        });
      });

      console.log("Grouped history:", grouped);
      console.log("Monthly summary:", { currentMonthCost, currentMonthMileage });

      setGroupedHistory(grouped);
      setMonthlySummary({
        currentMonthCost: currentMonthCost.toFixed(2),
        currentMonthMileage: currentMonthMileage.toFixed(0),
      });
    } else {
      console.log("No history data available");
      setFuelChartData([]);
      setGroupedHistory({});
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
      fuelPrice: "2.205",
      cost: "",
      date: new Date().toISOString().split('T')[0],
      lastKilometrage: lastFuelEntry?.kilometers ? lastFuelEntry.kilometers.toString() : "",
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleOpenEditModal = (entry) => {
    setEditRefuel({
      id: entry.id,
      kilometers: entry.kilometers.toString(),
      liters: entry.liters.toString(),
      fuelPrice: entry.fuelPrice.toString(),
      cost: entry.cost.toString(),
      date: entry.rawDate,
    });
    setShowEditModal(true);
    setError("");
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditRefuel(null);
  };

  const handleInputChange = (e, isEdit = false) => {
    const { name, value } = e.target;
    const targetState = isEdit ? editRefuel : newRefuel;
    const setTargetState = isEdit ? setEditRefuel : setNewRefuel;

    if (name === "liters" || name === "fuelPrice") {
      const liters = name === "liters" ? parseFloat(value) || 0 : parseFloat(targetState.liters) || 0;
      const price = name === "fuelPrice" ? parseFloat(value) || 0 : parseFloat(targetState.fuelPrice) || 0;
      const calculatedCost = (liters * price).toFixed(2);

      setTargetState({
        ...targetState,
        [name]: value,
        cost: calculatedCost,
      });
    } else if (name === "cost") {
      const liters = parseFloat(targetState.liters) || 0;
      if (liters > 0) {
        const calculatedPrice = ((parseFloat(value) || 0) / liters).toFixed(3);
        setTargetState({
          ...targetState,
          cost: value,
          fuelPrice: calculatedPrice,
        });
      } else {
        setTargetState({
          ...targetState,
          cost: value,
        });
      }
    } else {
      setTargetState({
        ...targetState,
        [name]: value,
      });
    }
  };

  const toggleMonthExpand = (monthYear) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthYear]: !prev[monthYear],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newRefuel.kilometers || !newRefuel.liters || !newRefuel.cost || !newRefuel.fuelPrice) {
      setError("Tous les champs sont obligatoires");
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
      };

      console.log("Inserting fuel record:", newRecord);

      const { data, error } = await supabase
        .from('fuel_history')
        .insert([newRecord])
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Insert response:", data);

      const newEntry = {
        id: data[0].id,
        truckId: id,
        kilometers,
        liters,
        fuelPrice,
        cost,
        rawDate: newRefuel.date,
        timestamp: inputDate.getTime(),
        distanceTraveled: parseFloat(metrics.distanceTraveled),
        consumption: parseFloat(metrics.consumption),
        costPerKm: parseFloat(metrics.costPerKm),
        litersPer100km: parseFloat(metrics.litersPer100km),
      };

      console.log("New fuel entry added:", newEntry);

      // Append to localHistory and refresh from Supabase
      setLocalHistory((prev) => [...prev, newEntry]);
      setLastFuelEntry(newEntry);
      fetchFuelHistory();
      setShowModal(false);
      alert("Plein ajouté avec succès !");

      if (onFuelAdded && typeof onFuelAdded === 'function') {
        console.log("Calling onFuelAdded");
        onFuelAdded();
      }
    } catch (err) {
      console.error("Error adding fuel record:", err);
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editRefuel.kilometers || !editRefuel.liters || !editRefuel.cost || !editRefuel.fuelPrice) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    const kilometers = parseFloat(editRefuel.kilometers);
    const liters = parseFloat(editRefuel.liters);
    const cost = parseFloat(editRefuel.cost);
    const fuelPrice = parseFloat(editRefuel.fuelPrice);
    const inputDate = parseDate(editRefuel.date);

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

    try {
      setLoading(true);

      // Find the previous entry for metrics calculation
      const sortedHistory = [...localHistory].sort((a, b) => a.timestamp - b.timestamp);
      const currentIndex = sortedHistory.findIndex((entry) => entry.id === editRefuel.id);
      const previousEntry = currentIndex > 0 ? sortedHistory[currentIndex - 1] : null;

      const metrics = calculateMetrics(
        { kilometers, liters, cost },
        previousEntry
      );

      const updatedRecord = {
        truck_id: id,
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

      console.log("Updating fuel record:", updatedRecord);

      const { data, error } = await supabase
        .from('fuel_history')
        .update(updatedRecord)
        .eq('id', editRefuel.id)
        .select();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Update response:", data);

      const updatedEntry = {
        id: editRefuel.id,
        truckId: id,
        kilometers,
        liters,
        fuelPrice,
        cost,
        rawDate: editRefuel.date,
        timestamp: inputDate.getTime(),
        distanceTraveled: parseFloat(metrics.distanceTraveled),
        consumption: parseFloat(metrics.consumption),
        costPerKm: parseFloat(metrics.costPerKm),
        litersPer100km: parseFloat(metrics.litersPer100km),
      };

      console.log("Fuel entry updated:", updatedEntry);

      // Update localHistory
      setLocalHistory((prev) =>
        prev.map((entry) =>
          entry.id === editRefuel.id ? updatedEntry : entry
        )
      );
      fetchFuelHistory();
      setShowEditModal(false);
      alert("Plein modifié avec succès !");

      if (onFuelAdded && typeof onFuelAdded === 'function') {
        console.log("Calling onFuelAdded");
        onFuelAdded();
      }
    } catch (err) {
      console.error("Error updating fuel record:", err);
      setError(`Erreur lors de la modification: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate month options for selector
  const monthOptions = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  for (let year = currentYear; year >= currentYear - 5; year--) {
    for (let month = 12; month >= 1; month--) {
      const date = new Date(year, month - 1, 1);
      if (date <= currentDate) {
        monthOptions.push({
          value: `${year}-${month}`,
          label: date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
        });
      }
    }
  }

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
              <p>Aucune donnée disponible pour le mois sélectionné.</p>
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
              <p>Aucune donnée de consommation disponible pour le mois sélectionné.</p>
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
              <p>Aucune donnée de coût disponible pour le mois sélectionné.</p>
            </div>
          )}
        </section>
      </div>

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
                          <div key={`${entry.rawDate}-${entry.timestamp}-${index}`} className="fuel-entry">
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
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  onChange={(e) => handleInputChange(e, true)}
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
                  onChange={(e) => handleInputChange(e, true)}
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
                  onChange={(e) => handleInputChange(e, true)}
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
                    onChange={(e) => handleInputChange(e, true)}
                    placeholder="ex: 2.205"
                    step="0.001"
                    required
                  />
                </div>

                <div className="form-group half">
                  <label htmlFor="editCost">Coût total (TND)</label>
                  <input
                    type="number"
                    id="editCost"
                    name="cost"
                    value={editRefuel.cost}
                    onChange={(e) => handleInputChange(e, true)}
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

export default FuelTab;