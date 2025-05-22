import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import "./FleetChatbot.css";
import { supabase } from "../supabase";
import Chart from "chart.js/auto";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FleetChatbot = () => {
  const [messages, setMessages] = useState([
    {
      text: "Bienvenue dans le système de reporting de flotte ! Sélectionnez un type de rapport ci-dessus pour commencer.",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [reportType, setReportType] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [isChart, setIsChart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  // Fetch trucks and drivers for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      const { data: truckData, error: truckError } = await supabase
        .from("trucks")
        .select("id, immatriculation")
        .order("immatriculation");
      if (truckError) console.error("Truck fetch error:", truckError);
      console.log("Fetched trucks:", truckData);
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("name")
        .order("name");
      if (driverError) console.error("Driver fetch error:", driverError);
      setTrucks(truckData || []);
      setDrivers(driverData || []);
    };
    fetchData();
  }, []);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Render chart when chartData changes
  useEffect(() => {
    let chartInstance = null;
    if (chartData) {
      const ctx = document.getElementById("chatbot-chart")?.getContext("2d");
      if (ctx) {
        chartInstance = new Chart(ctx, chartData);
      } else {
        console.error("Chart canvas not found");
      }
    }
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [chartData]);

  // Handle password submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.rpc("validate_cash_password", { input_password: password });
      if (error) throw error;
      if (data) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setAuthError("Mot de passe incorrect.");
        setPassword("");
      }
    } catch (err) {
      console.error("Error validating password:", err);
      setAuthError("Erreur lors de la validation du mot de passe.");
      setPassword("");
    }
  };

  // Normalize date
  const normalizeDate = (date) => {
    try {
      return date ? new Date(date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
    } catch (err) {
      console.error("Date normalization error:", err);
      return new Date().toISOString().split("T")[0];
    }
  };

  // Report handlers
  const reportHandlers = {
    cash_summary: {
      handler: async (params, isChart) => {
        const date = params.dates[0] ? normalizeDate(params.dates[0]) : normalizeDate(new Date());
        const { data, error } = await supabase
          .from("cash_entries")
          .select("entity, type, amount")
          .eq("date", date);
        if (error) throw error;

        const summary = { CHB: { inflows: 0, outflows: 0 }, SNTT: { inflows: 0, outflows: 0 } };
        data.forEach((entry) => {
          const amount = parseFloat(entry.amount) || 0;
          if (entry.entity === "CHB") {
            summary.CHB[entry.type === "inflow" ? "inflows" : "outflows"] += amount;
          } else if (entry.entity === "SNTT") {
            summary.SNTT[entry.type === "inflow" ? "inflows" : "outflows"] += amount;
          }
        });

        summary.CHB.net = summary.CHB.inflows - summary.CHB.outflows;
        summary.SNTT.net = summary.SNTT.inflows - summary.SNTT.outflows;
        const totalNet = summary.CHB.net + summary.SNTT.net;

        if (isChart) {
          const chart = {
            type: "bar",
            data: {
              labels: ["CHB Inflows", "CHB Outflows", "SNTT Inflows", "SNTT Outflows"],
              datasets: [{
                label: "Cash Flow (TND)",
                data: [
                  summary.CHB.inflows,
                  summary.CHB.outflows,
                  summary.SNTT.inflows,
                  summary.SNTT.outflows,
                ],
                backgroundColor: ["#15803D", "#B91C1C", "#15803D", "#B91C1C"],
              }],
            },
            options: {
              scales: {
                y: { beginAtZero: true, title: { display: true, text: "Amount (TND)" } },
              },
              plugins: {
                title: { display: true, text: `Cash Flow - ${date}` },
              },
            },
          };
          setChartData(chart);
          return "Graphique du flux de caisse généré.";
        }

        const tableHeader = `
<table class="report-table">
  <thead>
    <tr>
      <th>Entité</th>
      <th>Entrées (TND)</th>
      <th>Sorties (TND)</th>
      <th>Net (TND)</th>
    </tr>
  </thead>
  <tbody>
`;
        const tableRows = `
    <tr>
      <td>CHB</td>
      <td>${summary.CHB.inflows.toFixed(2)}</td>
      <td>${summary.CHB.outflows.toFixed(2)}</td>
      <td>${summary.CHB.net.toFixed(2)}</td>
    </tr>
    <tr>
      <td>SNTT</td>
      <td>${summary.SNTT.inflows.toFixed(2)}</td>
      <td>${summary.SNTT.outflows.toFixed(2)}</td>
      <td>${summary.SNTT.net.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Total</td>
      <td>-</td>
      <td>-</td>
      <td>${totalNet.toFixed(2)}</td>
    </tr>
`;
        const tableFooter = `
  </tbody>
</table>
`;
        return `Résumé caisse pour ${date}:\n${tableHeader}${tableRows}${tableFooter}`;
      },
    },
    entry_list: {
      handler: async (params) => {
        const date = params.dates[0] ? normalizeDate(params.dates[0]) : normalizeDate(new Date());
        const { data, error } = await supabase
          .from("cash_entries")
          .select("id, description, entity, type, amount")
          .eq("date", date)
          .order("created_at", { ascending: true });
        if (error) throw error;

        if (data.length === 0) {
          return `Aucune entrée de caisse pour ${date}.`;
        }

        const formattedEntries = data.reduce((acc, entry) => {
          const existing = acc.find((e) => e.description === entry.description);
          const amount = parseFloat(entry.amount) || 0;
          if (existing) {
            if (entry.entity === "CHB") {
              existing[entry.type === "inflow" ? "chbInflow" : "chbOutflow"] = amount;
            } else {
              existing[entry.type === "inflow" ? "snttInflow" : "snttOutflow"] = amount;
            }
          } else {
            acc.push({
              description: entry.description,
              chbInflow: entry.entity === "CHB" && entry.type === "inflow" ? amount : 0,
              chbOutflow: entry.entity === "CHB" && entry.type === "outflow" ? amount : 0,
              snttInflow: entry.entity === "SNTT" && entry.type === "inflow" ? amount : 0,
              snttOutflow: entry.entity === "SNTT" && entry.type === "outflow" ? amount : 0,
            });
          }
          return acc;
        }, []).filter(
          (entry) =>
            entry.chbInflow !== 0 || entry.chbOutflow !== 0 || entry.snttInflow !== 0 || entry.snttOutflow !== 0
        );

        if (formattedEntries.length === 0) {
          return `Aucune entrée de caisse avec des valeurs non nulles pour ${date}.`;
        }

        const tableHeader = `
<table class="report-table">
  <thead>
    <tr>
      <th>Description</th>
      <th>CHB Entrées (TND)</th>
      <th>CHB Sorties (TND)</th>
      <th>SNTT Entrées (TND)</th>
      <th>SNTT Sorties (TND)</th>
    </tr>
  </thead>
  <tbody>
`;
        const tableRows = formattedEntries
          .map(
            (e) => `
    <tr>
      <td>${e.description}</td>
      <td>${e.chbInflow === 0 ? "*" : e.chbInflow.toFixed(2)}</td>
      <td>${e.chbOutflow === 0 ? "*" : e.chbOutflow.toFixed(2)}</td>
      <td>${e.snttInflow === 0 ? "*" : e.snttInflow.toFixed(2)}</td>
      <td>${e.snttOutflow === 0 ? "*" : e.snttOutflow.toFixed(2)}</td>
    </tr>
`
          )
          .join("");
        const tableFooter = `
  </tbody>
</table>
`;

        return `Entrées caisse pour ${date}:\n${tableHeader}${tableRows}${tableFooter}`;
      },
    },
    tank_level: {
      handler: async (params, isChart) => {
        const { data, error } = await supabase
          .from("fuel_tank")
          .select("current_level")
          .single();
        if (error) {
          if (error.code === "PGRST116") {
            return "Aucun réservoir trouvé. Veuillez configurer le réservoir.";
          }
          throw error;
        }

        const tankLevel = parseFloat(data.current_level) || 0;
        const tankCapacity = 30000.0;
        const percentage = ((tankLevel / tankCapacity) * 100).toFixed(1);

        if (isChart) {
          const chart = {
            type: "bar",
            data: {
              labels: ["Niveau Actuel", "Capacité Restante"],
              datasets: [{
                label: "Stock Carburant (Litres)",
                data: [tankLevel, tankCapacity - tankLevel],
                backgroundColor: ["#15803D", "#D1D5DB"],
              }],
            },
            options: {
              indexAxis: "y",
              scales: {
                x: { beginAtZero: true, title: { display: true, text: "Litres" } },
              },
              plugins: {
                title: { display: true, text: `Stock Carburant` },
              },
            },
          };
          setChartData(chart);
          return "Graphique du stock de carburant généré.";
        }

        const tableHeader = `
<table class="report-table">
  <thead>
    <tr>
      <th>Métrique</th>
      <th>Valeur</th>
    </tr>
  </thead>
  <tbody>
`;
        const tableRows = `
    <tr>
      <td>Niveau Actuel</td>
      <td>${tankLevel.toFixed(2)} L (${percentage}%)</td>
    </tr>
    <tr>
      <td>Capacité</td>
      <td>${tankCapacity.toFixed(2)} L</td>
    </tr>
    ${tankLevel < 5000 ? `
    <tr>
      <td>Avertissement</td>
      <td>Niveau de carburant faible !</td>
    </tr>
    ` : ""}
`;
        const tableFooter = `
  </tbody>
</table>
`;
        return `Niveau du réservoir:\n${tableHeader}${tableRows}${tableFooter}`;
      },
    },
    truck_fuel_summary: {
      handler: async (params, isChart) => {
        const { truckImmatriculation, month } = params;
        if (!truckImmatriculation) {
          return "Veuillez sélectionner un camion.";
        }

        const { data: truckData, error: truckError } = await supabase
          .from("trucks")
          .select("id")
          .eq("immatriculation", truckImmatriculation)
          .single();
        if (truckError || !truckData) {
          return `Camion ${truckImmatriculation} non trouvé.`;
        }
        const truckId = truckData.id;

        let data, periodLabel;
        if (month) {
          const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
          const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === month.toLowerCase());
          if (monthIndex === -1) {
            return "Mois invalide.";
          }
          const year = new Date().getFullYear();
          const startDate = new Date(year, monthIndex, 1).toISOString().split("T")[0];
          const endDate = new Date(year, monthIndex + 1, 0).toISOString().split("T")[0];
          periodLabel = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
          const { data: monthData, error } = await supabase
            .from("fuel_history")
            .select("liters, cost, distance_traveled, liters_per_100km, raw_date")
            .eq("truck_id", truckId)
            .gte("raw_date", startDate)
            .lte("raw_date", endDate)
            .order("raw_date", { ascending: true });
          if (error) throw error;
          data = monthData;
        } else {
          const { data: latestData, error } = await supabase
            .from("fuel_history")
            .select("liters, cost, distance_traveled, liters_per_100km, raw_date")
            .eq("truck_id", truckId)
            .order("raw_date", { ascending: false })
            .limit(1);
          if (error) throw error;
          data = latestData;
          periodLabel = latestData[0]?.raw_date
            ? new Date(latestData[0].raw_date).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "dernier plein";
        }

        if (!data || data.length === 0) {
          return `Aucun plein trouvé pour le camion ${truckImmatriculation} pour ${periodLabel}.`;
        }

        const summary = {
          totalLiters: 0,
          totalCost: 0,
          totalDistance: 0,
          avgLitersPer100km: 0,
          warnings: [],
        };

        // Filter valid entries (exclude entries with distance_traveled <= 0)
        const validEntries = data.filter((entry) => {
          const liters = parseFloat(entry.liters) || 0;
          const cost = parseFloat(entry.cost) || 0;
          const distance = parseFloat(entry.distance_traveled) || 0;
          const isValid = liters > 0 && cost > 0 && distance > 0;
          if (!isValid) {
            console.warn(`Invalid entry on ${entry.raw_date}: liters=${liters}, cost=${cost}, distance=${distance}`);
          }
          return isValid;
        });

        if (validEntries.length === 0) {
          return `Aucune entrée valide trouvée pour le camion ${truckImmatriculation} pour ${periodLabel}. Veuillez ajouter des pleins supplémentaires.`;
        }

        // Aggregate totals from valid entries
        validEntries.forEach((entry) => {
          const liters = parseFloat(entry.liters) || 0;
          const cost = parseFloat(entry.cost) || 0;
          const distance = parseFloat(entry.distance_traveled) || 0;
          summary.totalLiters += liters;
          summary.totalCost += cost;
          summary.totalDistance += distance;
        });

        // Calculate average consumption: (totalLiters / totalDistance) * 100
        summary.avgLitersPer100km = summary.totalDistance > 0
          ? ((summary.totalLiters / summary.totalDistance) * 100).toFixed(2)
          : 0;

        if (summary.avgLitersPer100km === 0) {
          summary.warnings.push("Consommation moyenne non calculable (distance totale nulle).");
        }

        if (isChart) {
          const chart = {
            type: "bar",
            data: {
              labels: ["Litres", "Coût", "Distance Parcourue"],
              datasets: [{
                label: `Carburant - ${truckImmatriculation}`,
                data: [
                  summary.totalLiters,
                  summary.totalCost,
                  summary.totalDistance,
                ],
                backgroundColor: ["#15803D", "#1E88E5", "#9C27B0"],
              }],
            },
            options: {
              scales: {
                y: { beginAtZero: true, title: { display: true, text: "Valeur" } },
              },
              plugins: {
                title: { display: true, text: `Carburant ${truckImmatriculation} - ${periodLabel}` },
              },
            },
          };
          setChartData(chart);
          return `Graphique de consommation pour ${truckImmatriculation} généré.`;
        }

        const tableHeader = `
<table class="report-table">
  <thead>
    <tr>
      <th>Métrique</th>
      <th>Valeur</th>
    </tr>
  </thead>
  <tbody>
`;
        const tableRows = `
    <tr>
      <td>Total Litres</td>
      <td>${summary.totalLiters.toFixed(2)} L</td>
    </tr>
    <tr>
      <td>Coût Total</td>
      <td>${summary.totalCost.toFixed(2)} TND</td>
    </tr>
    <tr>
      <td>Distance Parcourue</td>
      <td>${summary.totalDistance.toFixed(2)} km</td>
    </tr>
    <tr>
      <td>Consommation Moyenne</td>
      <td>${summary.avgLitersPer100km} L/100km</td>
    </tr>
    ${summary.warnings.length > 0 ? `
    <tr>
      <td>Avertissements</td>
      <td>${summary.warnings.join("<br>")}</td>
    </tr>
    ` : ""}
`;
        const tableFooter = `
  </tbody>
</table>
`;
        return `Résumé carburant pour ${truckImmatriculation} (${periodLabel}):\n${tableHeader}${tableRows}${tableFooter}`;
      },
    },
    driver_salary_summary: {
      handler: async (params, isChart) => {
        const { driverName, month } = params;
        if (!driverName) {
          return "Veuillez sélectionner un chauffeur.";
        }

        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("id, name, base_salary")
          .eq("name", driverName)
          .limit(1);
        if (driverError || !driverData || driverData.length === 0) {
          return `Chauffeur ${driverName} non trouvé.`;
        }

        const driver = driverData[0];
        const driverId = driver.id;
        const baseSalary = parseFloat(driver.base_salary) || 0;

        let startDate, endDate, periodLabel;
        if (month) {
          const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
          const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === month.toLowerCase());
          if (monthIndex === -1) {
            return "Mois invalide.";
          }
          const year = new Date().getFullYear();
          startDate = new Date(year, monthIndex, 1).toISOString().split("T")[0];
          endDate = new Date(year, monthIndex + 1, 0).toISOString().split("T")[0];
          periodLabel = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
        } else {
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
          periodLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        }

        const { data: paymentsData, error: paymentsError } = await supabase
          .from("driver_payments")
          .select("salary_paid")
          .eq("driver_id", driverId)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate);
        if (paymentsError) throw paymentsError;

        const { data: advancesData, error: advancesError } = await supabase
          .from("driver_advances")
          .select("amount")
          .eq("driver_id", driverId)
          .gte("advance_date", startDate)
          .lte("advance_date", endDate);
        if (advancesError) throw advancesError;

        const { data: absencesData, error: absencesError } = await supabase
          .from("driver_absences")
          .select("deduction_amount")
          .eq("driver_id", driverId)
          .gte("absence_date", startDate)
          .lte("absence_date", endDate);
        if (absencesError) throw absencesError;

        const totalPayments = paymentsData.reduce((sum, p) => sum + (parseFloat(p.salary_paid) || 0), 0);
        const totalAdvances = advancesData.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
        const totalDeductions = absencesData.reduce((sum, a) => sum + (parseFloat(a.deduction_amount) || 0), 0);
        const totalPaid = totalPayments + totalAdvances;
        const remainingSalary = baseSalary - totalPaid - totalDeductions;

        if (isChart) {
          const chart = {
            type: "bar",
            data: {
              labels: ["Salaire de Base", "Total Payé", "Déductions", "Salaire Restant"],
              datasets: [{
                label: `Salaire - ${driver.name}`,
                data: [
                  baseSalary,
                  totalPaid,
                  totalDeductions,
                  remainingSalary < 0 ? 0 : remainingSalary,
                ],
                backgroundColor: ["#15803D", "#1E88E5", "#B91C1C", "#9C27B0"],
              }],
            },
            options: {
              scales: {
                y: { beginAtZero: true, title: { display: true, text: "Montant (TND)" } },
              },
              plugins: {
                title: { display: true, text: `Résumé Salaire ${driver.name} - ${periodLabel}` },
              },
            },
          };
          setChartData(chart);
          return `Graphique du salaire pour ${driver.name} généré.`;
        }

        const tableHeader = `
<table class="report-table">
  <thead>
    <tr>
      <th>Métrique</th>
      <th>Valeur (TND)</th>
    </tr>
  </thead>
  <tbody>
`;
        const tableRows = `
    <tr>
      <td>Salaire de Base</td>
      <td>${baseSalary.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Règlement Salaire</td>
      <td>${totalPayments.toFixed(2)}</td>
    </tr>
    <tr>
      <td>A compte</td>
      <td>${totalAdvances.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Déductions (Absences)</td>
      <td>${totalDeductions.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Total Payé</td>
      <td>${totalPaid.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Salaire Restant</td>
      <td>${remainingSalary.toFixed(2)}</td>
    </tr>
`;
        const tableFooter = `
  </tbody>
</table>
`;
        return `Résumé salaire pour ${driver.name} (${periodLabel}):\n${tableHeader}${tableRows}${tableFooter}`;
      },
    },
    driver_payment_history: {
      handler: async (params, isChart) => {
        const { driverName, month } = params;
        if (!driverName) {
          return "Veuillez sélectionner un chauffeur.";
        }

        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("id, name")
          .eq("name", driverName)
          .limit(1);
        if (driverError || !driverData || driverData.length === 0) {
          return `Chauffeur ${driverName} non trouvé.`;
        }

        const driver = driverData[0];
        const driverId = driver.id;

        let startDate, endDate, periodLabel;
        if (month) {
          const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
          const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === month.toLowerCase());
          if (monthIndex === -1) {
            return "Mois invalide.";
          }
          const year = new Date().getFullYear();
          startDate = new Date(year, monthIndex, 1).toISOString().split("T")[0];
          endDate = new Date(year, monthIndex + 1, 0).toISOString().split("T")[0];
          periodLabel = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
        } else {
          periodLabel = "récent";
          startDate = new Date(0).toISOString().split("T")[0];
          endDate = new Date().toISOString().split("T")[0];
        }

        const { data: paymentsData, error: paymentsError } = await supabase
          .from("driver_payments")
          .select("id, payment_date, salary_paid, description, payment_method, numero_de_virement")
          .eq("driver_id", driverId)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate)
          .order("payment_date", { ascending: false })
          .limit(5);
        if (paymentsError) throw paymentsError;

        const { data: advancesData, error: advancesError } = await supabase
          .from("driver_advances")
          .select("id, advance_date, amount, description, payment_method, numero_de_virement")
          .eq("driver_id", driverId)
          .gte("advance_date", startDate)
          .lte("advance_date", endDate)
          .order("advance_date", { ascending: false })
          .limit(5);
        if (advancesError) throw advancesError;

        const { data: absencesData, error: absencesError } = await supabase
          .from("driver_absences")
          .select("id, absence_date, days_absent, deduction_amount")
          .eq("driver_id", driverId)
          .gte("absence_date", startDate)
          .lte("absence_date", endDate)
          .order("absence_date", { ascending: false })
          .limit(5);
        if (absencesError) throw absencesError;

        const history = [
          ...paymentsData.map((p) => ({
            type: "Paiement",
            date: p.payment_date
              ? new Date(p.payment_date).toLocaleDateString("fr-FR")
              : "N/A",
            amount: parseFloat(p.salary_paid).toFixed(2),
            description: p.description || "N/A",
            payment_method: p.payment_method === "espèce" ? "Espèce" : "Virement bancaire",
          })),
          ...advancesData.map((a) => ({
            type: "Avance",
            date: a.advance_date
              ? new Date(a.advance_date).toLocaleDateString("fr-FR")
              : "N/A",
            amount: parseFloat(a.amount).toFixed(2),
            description: a.description || "N/A",
            payment_method: a.payment_method === "espèce" ? "Espèce" : "Virement bancaire",
          })),
          ...absencesData.map((a) => ({
            type: "Absence",
            date: a.absence_date
              ? new Date(a.absence_date).toLocaleDateString("fr-FR")
              : "N/A",
            amount: parseFloat(a.deduction_amount).toFixed(2),
            description: `Absence de ${a.days_absent} jour(s)`,
            payment_method: "N/A",
          })),
        ].sort((a, b) => {
          const dateA = a.date !== "N/A" ? new Date(a.date.split("/").reverse().join("-")) : new Date(0);
          const dateB = b.date !== "N/A" ? new Date(b.date.split("/").reverse().join("-")) : new Date(0);
          return dateB - dateA;
        });

        if (history.length === 0) {
          return `Aucun historique trouvé pour ${driver.name} pour ${periodLabel}.`;
        }

        if (isChart) {
          const chart = {
            type: "bar",
            data: {
              labels: history.map((h) => `${h.date} (${h.type})`),
              datasets: [{
                label: `Historique - ${driver.name}`,
                data: history.map((h) => parseFloat(h.amount)),
                backgroundColor: history.map((h) =>
                  h.type === "Paiement" ? "#15803D" :
                  h.type === "Avance" ? "#1E88E5" : "#B91C1C"
                ),
              }],
            },
            options: {
              scales: {
                y: { beginAtZero: true, title: { display: true, text: "Montant (TND)" } },
              },
              plugins: {
                title: { display: true, text: `Historique ${driver.name} - ${periodLabel}` },
              },
              responsive: true,
              maintainAspectRatio: false,
            },
          };
          setChartData(chart);
          return `Graphique de l'historique pour ${driver.name} généré.`;
        }

        const tableHeader = `
<table class="report-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Type</th>
      <th>Montant (TND)</th>
      <th>Description</th>
      <th>Méthode</th>
    </tr>
  </thead>
  <tbody>
`;
        const tableRows = history
          .map(
            (h) => `
    <tr>
      <td>${h.date}</td>
      <td>${h.type}</td>
      <td>${h.amount}</td>
      <td>${h.description}</td>
      <td>${h.payment_method}</td>
    </tr>
`
          )
          .join("");
        const tableFooter = `
  </tbody>
</table>
`;
        return `Historique pour ${driver.name} (${periodLabel}):\n${tableHeader}${tableRows}${tableFooter}`;
      },
    },
    daily_fuel_consumption: {
      handler: async (params, isChart) => {
        const date = params.dates[0] ? normalizeDate(params.dates[0]) : normalizeDate(new Date());
        
        // Fetch fuel history entries for the selected date
        const { data: fuelData, error: fuelError } = await supabase
          .from("fuel_history")
          .select("id, raw_date, liters, cost, distance_traveled, liters_per_100km, voyage, truck_id")
          .eq("raw_date", date)
          .order("raw_date", { ascending: false });
        if (fuelError) throw fuelError;

        console.log("Fuel history truck_ids:", fuelData?.map(entry => entry.truck_id) || []);

        if (!fuelData || fuelData.length === 0) {
          return `Aucun plein de carburant trouvé pour le ${date}.`;
        }

        // Create a map of truck_id to immatriculation for quick lookup
        const truckMap = new Map(trucks.map(truck => [truck.id, truck.immatriculation]));
        console.log("Truck map:", Array.from(truckMap.entries()));

        // Format entries, mapping truck_id to immatriculation
        const formattedEntries = fuelData.map((entry) => ({
          immatriculation: truckMap.get(entry.truck_id) || "Inconnu",
          date: new Date(entry.raw_date).toLocaleDateString("fr-FR"),
          liters: parseFloat(entry.liters) || 0,
          cost: parseFloat(entry.cost) || 0,
          distanceTraveled: parseFloat(entry.distance_traveled) || 0,
          litersPer100km: parseFloat(entry.liters_per_100km) || 0,
          voyage: typeof entry.voyage === "string" ? entry.voyage : "Non spécifié",
        }));

        // Log entries to check if any valid trucks were found
        console.log("Formatted entries:", formattedEntries);

        if (formattedEntries.every(entry => entry.immatriculation === "Inconnu")) {
          return `Aucun camion valide trouvé pour le ${date}. Vérifiez que les truck_id dans fuel_history correspondent aux id dans trucks.`;
        }

        const tableHeader = `
<table class="report-table">
  <thead>
    <tr>
      <th>Camion</th>
      <th>Date</th>
      <th>Litres</th>
      <th>Coût (TND)</th>
      <th>Distance (km)</th>
      <th>L/100km</th>
      <th>Voyage</th>
    </tr>
  </thead>
  <tbody>
`;
        const tableRows = formattedEntries
          .map(
            (entry) => `
    <tr>
      <td>${entry.immatriculation}</td>
      <td>${entry.date}</td>
      <td>${entry.liters.toFixed(2)}</td>
      <td>${entry.cost.toFixed(2)}</td>
      <td>${entry.distanceTraveled.toFixed(2)}</td>
      <td>${entry.litersPer100km.toFixed(2)}</td>
      <td>${entry.voyage}</td>
    </tr>
`
          )
          .join("");
        const tableFooter = `
  </tbody>
</table>
`;

        return `Consommation quotidienne de carburant pour ${date}:\n${tableHeader}${tableRows}${tableFooter}`;

        /* 
        // Alternative: Use this query after adding foreign key to fuel_history.truck_id
        const { data: fuelData, error: fuelError } = await supabase
          .from("fuel_history")
          .select(`
            id,
            raw_date,
            liters,
            cost,
            distance_traveled,
            liters_per_100km,
            voyage,
            truck_id,
            trucks (
              immatriculation
            )
          `)
          .eq("raw_date", date)
          .order("raw_date", { ascending: false });
        if (fuelError) throw fuelError;

        if (!fuelData || fuelData.length === 0) {
          return `Aucun plein de carburant trouvé pour le ${date}.`;
        }

        const formattedEntries = fuelData.map((entry) => ({
          immatriculation: entry.trucks?.immatriculation || "Inconnu",
          date: new Date(entry.raw_date).toLocaleDateString("fr-FR"),
          liters: parseFloat(entry.liters) || 0,
          cost: parseFloat(entry.cost) || 0,
          distanceTraveled: parseFloat(entry.distance_traveled) || 0,
          litersPer100km: parseFloat(entry.liters_per_100km) || 0,
          voyage: typeof entry.voyage === "string" ? entry.voyage : "Non spécifié",
        }));
        */
      },
    },
  };

  // Handle report submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportType) {
      toast.error("Veuillez sélectionner un type de rapport.");
      return;
    }
    setLoading(true);
    setChartData(null);

    const params = {
      dates: selectedDate ? [selectedDate] : [],
      month: selectedMonth,
      truckImmatriculation: selectedTruck,
      driverName: selectedDriver,
    };

    const userMessage = `Rapport demandé: ${reportType}${selectedTruck ? ` pour camion ${selectedTruck}` : ""}${selectedDriver ? ` pour chauffeur ${selectedDriver}` : ""}${selectedDate ? ` pour ${selectedDate}` : selectedMonth ? ` pour ${selectedMonth}` : ""}${isChart && reportType !== "daily_fuel_consumption" ? " (graphique)" : ""}`;
    let response = "Rapport non disponible.";

    try {
      const handler = reportHandlers[reportType]?.handler;
      if (handler) {
        response = await handler(params, isChart && reportType !== "daily_fuel_consumption");
      }
      setMessages((prev) => [
        ...prev,
        { text: userMessage, sender: "user", timestamp: new Date() },
        { text: response, sender: "bot", timestamp: new Date() },
      ]);
    } catch (err) {
      console.error("Error processing report:", err);
      const errorMessage = `Erreur: ${err.message || "Impossible de générer le rapport."}`;
      toast.error(errorMessage);
      setMessages((prev) => [
        ...prev,
        { text: userMessage, sender: "user", timestamp: new Date() },
        { text: errorMessage, sender: "bot", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
      setReportType("");
      setSelectedDate("");
      setSelectedMonth("");
      setSelectedTruck("");
      setSelectedDriver("");
      setIsChart(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setReportType("");
    setSelectedDate("");
    setSelectedMonth("");
    setSelectedTruck("");
    setSelectedDriver("");
    setIsChart(false);
    setMessages((prev) => [
      ...prev,
      { text: "Formulaire réinitialisé.", sender: "bot", timestamp: new Date() },
    ]);
  };

  // Authentication UI
  if (!isAuthenticated) {
    return (
      <div className="chatbot-password-container">
        <h2 className="chatbot-password-title">Accès au Système de Reporting</h2>
        <p className="chatbot-password-text">
          Veuillez entrer le mot de passe pour accéder à cette fonctionnalité.
        </p>
        {authError && <p className="chatbot-error-message">{authError}</p>}
        <form onSubmit={handlePasswordSubmit} className="chatbot-password-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="chatbot-password-input"
            autoFocus
          />
          <div className="chatbot-password-buttons">
            <button type="submit" className="chatbot-password-submit">
              Valider
            </button>
            <button
              type="button"
              className="chatbot-password-cancel"
              onClick={() => (window.location.href = "/fleet/dashboard")}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Main reporting UI
  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li className={location.pathname === "/fleet/dashboard" ? "active" : ""}>
              <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
            </li>
            <li className={location.pathname === "/cash-tracking" ? "active" : ""}>
              <Link to="/cash-tracking">💵 Gestion de Caisse</Link>
            </li>
            <li className={location.pathname === "/parc" ? "active" : ""}>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
            <li className={location.pathname === "/fleet/stock-carburant" ? "active" : ""}>
              <Link to="/fleet/stock-carburant">⛽ Stock Carburant</Link>
            </li>
            <li className={location.pathname === "/stock" ? "active" : ""}>
              <Link to="/stock">📦 Gestion de Stock</Link>
            </li>
            <li className={location.pathname === "/schedule" ? "active" : ""}>
              <Link to="/schedule">🗓️ Gestion des Programmes</Link>
            </li>
            <li className={location.pathname === "/maintenance" ? "active" : ""}>
              <Link to="/maintenance">🛠️ Maintenance</Link>
            </li>
            <li className={location.pathname === "/trailers" ? "active" : ""}>
              <Link to="/trailers">🚛 Gestion des Remorques</Link>
            </li>
            <li className={location.pathname === "/incidents" ? "active" : ""}>
              <Link to="/incidents">🚨 Gestion des Incidents</Link>
            </li>
            <li className={location.pathname === "/driver-payments" ? "active" : ""}>
              <Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link>
            </li>
            <li className={location.pathname === "/chatbot" ? "active" : ""}>
              <Link to="/chatbot">🤖 Système de Reporting</Link>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025</p>
        </div>
      </aside>
      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>🤖 Système de Reporting</h1>
        </header>
        <div className="chatbot-container">
          <ToastContainer position="top-right" autoClose={5000} />
          <form onSubmit={handleReportSubmit} className="chatbot-report-form">
            <div className="chatbot-report-form-group">
              <label htmlFor="report-type">Type de Rapport:</label>
              <select
                id="report-type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                required
              >
                <option value="">Sélectionner un rapport</option>
                <option value="cash_summary">Résumé Caisse</option>
                <option value="entry_list">Liste des Entrées Caisse</option>
                <option value="tank_level">Niveau Réservoir</option>
                <option value="truck_fuel_summary">Résumé Carburant Camion</option>
                <option value="driver_salary_summary">Résumé Salaire Chauffeur</option>
                <option value="driver_payment_history">Historique Paiements Chauffeur</option>
                <option value="daily_fuel_consumption">Consommation Quotidienne Carburant</option>
              </select>
            </div>
            {(reportType === "cash_summary" || reportType === "entry_list" || reportType === "daily_fuel_consumption") && (
              <div className="chatbot-report-form-group">
                <label htmlFor="date">Date:</label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}
            {(reportType === "truck_fuel_summary" || reportType === "driver_salary_summary" || reportType === "driver_payment_history") && (
              <div className="chatbot-report-form-group">
                <label htmlFor="month">Mois:</label>
                <select
                  id="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">Aucun (dernier disponible)</option>
                  <option value="janvier">Janvier</option>
                  <option value="février">Février</option>
                  <option value="mars">Mars</option>
                  <option value="avril">Avril</option>
                  <option value="mai">Mai</option>
                  <option value="juin">Juin</option>
                  <option value="juillet">Juillet</option>
                  <option value="août">Août</option>
                  <option value="septembre">Septembre</option>
                  <option value="octobre">Octobre</option>
                  <option value="novembre">Novembre</option>
                  <option value="décembre">Décembre</option>
                </select>
              </div>
            )}
            {reportType === "truck_fuel_summary" && (
              <div className="chatbot-report-form-group">
                <label htmlFor="truck">Camion:</label>
                <select
                  id="truck"
                  value={selectedTruck}
                  onChange={(e) => setSelectedTruck(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un camion</option>
                  {trucks.map((truck) => (
                    <option key={truck.immatriculation} value={truck.immatriculation}>
                      {truck.immatriculation}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(reportType === "driver_salary_summary" || reportType === "driver_payment_history") && (
              <div className="chatbot-report-form-group">
                <label htmlFor="driver">Chauffeur:</label>
                <select
                  id="driver"
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un chauffeur</option>
                  {drivers.map((driver) => (
                    <option key={driver.name} value={driver.name}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {reportType !== "daily_fuel_consumption" && (
              <div className="chatbot-report-form-group chatbot-checkbox-group">
                <label className="chart-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isChart}
                    onChange={(e) => setIsChart(e.target.checked)}
                    className="chart-checkbox"
                  />
                  Afficher en graphique
                </label>
              </div>
            )}
            <div className="chatbot-report-buttons">
              <button type="submit" disabled={loading}>
                {loading ? "..." : "Générer Rapport"}
              </button>
              <button type="button" onClick={handleReset} disabled={loading}>
                Réinitialiser
              </button>
            </div>
          </form>
          <div className="chatbot-conversation">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <span className="message-text" dangerouslySetInnerHTML={{ __html: msg.text }} />
                <span className="message-timestamp">
                  {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {chartData && (
              <div className="chatbot-chart">
                <canvas id="chatbot-chart"></canvas>
              </div>
            )}
            {loading && <div className="chatbot-loading">Chargement...</div>}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default FleetChatbot;