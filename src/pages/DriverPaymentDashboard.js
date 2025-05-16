import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./DriverPaymentDashboard.css";
import DriverForm from "./DriverForm";
import PaymentForm from "./PaymentForm";
import AdvanceForm from "./AdvanceForm";
import PaymentAdvanceHistoryModal from "./AdvanceHistoryModal";
import { supabase } from "../supabase";
import { CSVLink } from "react-csv";

const DriverPaymentDashboard = () => {
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterDriver, setFilterDriver] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching data for month:", filterMonth);

      // Fetch drivers
      console.log("Fetching drivers...");
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*, trucks(immatriculation)")
        .order("name", { ascending: true });
      if (driversError) {
        console.error("Drivers error:", driversError);
        throw new Error(`Échec du chargement des chauffeurs: ${driversError.message}`);
      }
      if (!Array.isArray(driversData)) {
        console.error("Invalid drivers data:", driversData);
        throw new Error("Données des chauffeurs invalides.");
      }
      console.log("Drivers fetched:", driversData);

      // Fetch trucks
      console.log("Fetching trucks...");
      const { data: trucksData, error: trucksError } = await supabase
        .from("trucks")
        .select("id, immatriculation")
        .order("immatriculation", { ascending: true });
      if (trucksError) {
        console.error("Trucks error:", trucksError);
        throw new Error(`Échec du chargement des camions: ${trucksError.message}`);
      }
      if (!Array.isArray(trucksData)) {
        console.error("Invalid trucks data:", trucksData);
        throw new Error("Données des camions invalides.");
      }
      console.log("Trucks fetched:", trucksData);
      setTrucks(trucksData);

      // Fetch payments (all months for history)
      console.log("Fetching payments...");
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("driver_payments")
        .select("*")
        .order("payment_date", { ascending: false });
      if (paymentsError) {
        console.error("Payments error:", paymentsError);
        throw new Error(`Échec du chargement des paiements: ${paymentsError.message}`);
      }
      if (!Array.isArray(paymentsData)) {
        console.error("Invalid payments data:", paymentsData);
        throw new Error("Données des paiements invalides.");
      }
      console.log("Payments fetched:", paymentsData);
      setPayments(paymentsData);

      // Fetch advances
      console.log("Fetching advances...");
      const { data: advancesData, error: advancesError } = await supabase
        .from("driver_advances")
        .select("*")
        .order("advance_date", { ascending: false });
      if (advancesError) {
        console.error("Advances error:", advancesError);
        throw new Error(`Échec du chargement des avances: ${advancesError.message}`);
      }
      if (!Array.isArray(advancesData)) {
        console.error("Invalid advances data:", advancesData);
        throw new Error("Données des avances invalides.");
      }
      console.log("Advances fetched:", advancesData);

      // Format drivers with payment status for current month
      const formattedDrivers = driversData.map((driver) => {
        const driverPayments = paymentsData
          .filter((p) => p.driver_id === driver.id && p.payment_date)
          .filter((p) => new Date(p.payment_date).toISOString().slice(0, 7) === filterMonth);
        const totalSalaryPaid = driverPayments.reduce(
          (sum, p) => sum + (typeof p.salary_paid === "number" ? p.salary_paid : 0),
          0
        );
        const driverAdvances = advancesData
          .filter((a) => a.driver_id === driver.id && a.advance_date)
          .filter((a) => new Date(a.advance_date).toISOString().slice(0, 7) === filterMonth);
        const totalAdvances = driverAdvances.reduce(
          (sum, a) => sum + (typeof a.amount === "number" ? a.amount : 0),
          0
        );
        const salaryPaid = totalSalaryPaid;
        const baseSalary = typeof driver.base_salary === "number" ? driver.base_salary : 0;
        const totalReceived = salaryPaid + totalAdvances;
        const remainingSalary = baseSalary - totalReceived;
        const paymentStatus =
          totalReceived >= baseSalary ? "paid" : totalReceived > 0 ? "partial" : "unpaid";

        return {
          id: driver.id ?? "",
          name: driver.name ?? "Inconnu",
          rib_bancaire: driver.rib_bancaire ?? "N/A",
          truck: driver.trucks?.immatriculation ?? "Aucun",
          base_salary: baseSalary,
          start_date: driver.start_date
            ? new Date(driver.start_date).toLocaleDateString("fr-FR")
            : "N/A",
          payment_status: paymentStatus,
          salary_paid: salaryPaid,
          total_advances: totalAdvances,
          remaining_salary: remainingSalary < 0 ? 0 : remainingSalary,
          payment_method: driverPayments.length > 0 ? driverPayments[0].payment_method : "N/A",
          status: driverPayments.length > 0 ? driverPayments[0].status : "N/A",
        };
      });

      console.log("Formatted drivers:", formattedDrivers);
      setDrivers(formattedDrivers);
      setAdvances(advancesData);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Fetch data error:", err);
      setError(err.message || "Échec du chargement des données. Veuillez réessayer.");
    } finally {
      setLoading(false);
      console.log("Fetch data complete, loading set to false");
    }
  }, [filterMonth]);

  useEffect(() => {
    fetchData();
  }, [filterMonth, fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleAddPayment = (driver) => {
    setSelectedDriver(driver);
    setShowPaymentForm(true);
  };

  const handleAddAdvance = (driver) => {
    setSelectedDriver(driver);
    setShowAdvanceForm(true);
  };

  const handleViewHistory = (driver) => {
    setSelectedDriver(driver);
    setShowHistoryModal(true);
  };

  // Prepare CSV data
  const csvData = drivers.map((driver) => ({
    Chauffeur: driver.name,
    "RIB Bancaire": driver.rib_bancaire,
    Camion: driver.truck,
    "Salaire de Base": driver.base_salary,
    "Date de Début": driver.start_date,
    "Mois": filterMonth,
    "Salaire Payé": driver.salary_paid,
    "Avances": driver.total_advances,
    "Salaire Restant": driver.remaining_salary,
    "Méthode de Paiement":
      driver.payment_method === "espèce"
        ? "Espèce"
        : driver.payment_method === "virement_bancaire"
        ? "Par virement bancaire"
        : "N/A",
    Statut:
      driver.payment_status === "unpaid"
        ? "Non payé"
        : driver.payment_status === "partial"
        ? "Partiel"
        : "Payé",
    "Statut Paiement": driver.status,
  }));

  const filteredDrivers = drivers.filter((driver) =>
    filterDriver === "all" ||
    (typeof driver.name === "string" && driver.name.toLowerCase().includes(filterDriver.toLowerCase()))
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li>
              <Link to="/fleet/dashboard">📊 Gestion de Flotte</Link>
            </li>
            <li><Link to="/cash-tracking">💵 Gestion de Caisse</Link></li>
            <li>
              <Link to="/parc">🔧 Gestion des Pièces</Link>
            </li>
                        <li>
              <Link to="/fleet/stock-carburant">⛽ Stock Carburant</Link>
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
            <li className="active">
              <Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link>
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
          <div>
            <h1>Gestion de Paiement des Chauffeurs</h1>
            <p className="last-updated">Mise à jour: {lastUpdated}</p>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
              {loading ? "🔄" : "Actualiser🔄"}
            </button>
            <button className="add-driver" onClick={() => setShowDriverForm(true)}>
              Ajouter un chauffeur +
            </button>
            <CSVLink
              data={csvData}
              filename={`paiements_chauffeurs_${filterMonth}.csv`}
              className="export-btn"
            >
              Exporter CSV
            </CSVLink>
          </div>
        </header>

        {showDriverForm && (
          <DriverForm
            trucks={trucks}
            onClose={() => {
              setShowDriverForm(false);
              handleRefresh();
            }}
          />
        )}

        {showPaymentForm && (
          <PaymentForm
            driver={selectedDriver}
            month={filterMonth}
            onClose={() => {
              setShowPaymentForm(false);
              setSelectedDriver(null);
              handleRefresh();
            }}
          />
        )}

        {showAdvanceForm && (
          <AdvanceForm
            driver={selectedDriver}
            onClose={() => {
              setShowAdvanceForm(false);
              setSelectedDriver(null);
              handleRefresh();
            }}
          />
        )}

        {showHistoryModal && (
          <PaymentAdvanceHistoryModal
            driver={selectedDriver}
            advances={advances.filter((a) => a.driver_id === selectedDriver?.id)}
            payments={payments.filter((p) => p.driver_id === selectedDriver?.id)}
            month={filterMonth}
            onClose={() => {
              setShowHistoryModal(false);
              setSelectedDriver(null);
            }}
          />
        )}

        {error && <div className="error-message">{error}</div>}

        <section className="payment-section">
          <div className="payment-filter">
            <div>
              <h2>Chauffeurs</h2>
              <p className="total-drivers">{drivers.length} chauffeurs</p>
            </div>
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                className="search-bar"
              />
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="month-filter"
              />
            </div>
          </div>

          <div className="payment-table">
            {loading ? (
              <div className="loading">Chargement...</div>
            ) : filteredDrivers.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Chauffeur</th>
                    <th>RIB Bancaire</th>
                    <th>Camion</th>
                    <th>Salaire de Base</th>
                    <th>A compte</th>
                    <th>Règlement Salaire</th>
                    <th>Salaire Restant</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <tr
                      key={driver.id}
                      className={
                        driver.payment_status === "unpaid"
                          ? "status-unpaid"
                          : driver.payment_status === "partial"
                          ? "status-partial"
                          : "status-paid"
                      }
                    >
                      <td>{driver.name}</td>
                      <td>{driver.rib_bancaire}</td>
                      <td>{driver.truck}</td>
                      <td>{driver.base_salary.toFixed(2)} TND</td>
                      <td>{driver.total_advances.toFixed(2)} TND</td>
                      <td>{driver.salary_paid.toFixed(2)} TND</td>
                      <td>{driver.remaining_salary.toFixed(2)} TND</td>
                      <td>
                        {driver.payment_status === "unpaid"
                          ? "Non payé"
                          : driver.payment_status === "partial"
                          ? "Partiel"
                          : "Payé"}
                      </td>
                      <td>
                        <button
                          className="action-btn payment-btn"
                          onClick={() => handleAddPayment(driver)}
                        >
                          Règlement Salaire
                        </button>
                        <button
                          className="action-btn advance-btn"
                          onClick={() => handleAddAdvance(driver)}
                        >
                          A compte
                        </button>
                        <button
                          className="action-btn history-btn"
                          onClick={() => handleViewHistory(driver)}
                        >
                          Historique
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-drivers">Aucun chauffeur trouvé.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DriverPaymentDashboard;