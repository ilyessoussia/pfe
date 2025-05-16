import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "./DriverPaymentDashboard.css";
import DriverForm from "./DriverForm";
import PaymentForm from "./PaymentForm";
import AdvanceForm from "./AdvanceForm";
import PaymentAdvanceHistoryModal from "./AdvanceHistoryModal";
import { supabase } from "../supabase";

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
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterDriver, setFilterDriver] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch drivers
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("*, trucks(immatriculation)")
        .order("name", { ascending: true });
      if (driversError) throw new Error(`Échec du chargement des chauffeurs: ${driversError.message}`);
      if (!Array.isArray(driversData)) throw new Error("Données des chauffeurs invalides.");

      // Fetch trucks
      const { data: trucksData, error: trucksError } = await supabase
        .from("trucks")
        .select("id, immatriculation")
        .order("immatriculation", { ascending: true });
      if (trucksError) throw new Error(`Échec du chargement des camions: ${trucksError.message}`);
      if (!Array.isArray(trucksData)) throw new Error("Données des camions invalides.");
      setTrucks(trucksData);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("driver_payments")
        .select("*")
        .order("payment_date", { ascending: false });
      if (paymentsError) throw new Error(`Échec du chargement des paiements: ${paymentsError.message}`);
      if (!Array.isArray(paymentsData)) throw new Error("Données des paiements invalides.");
      setPayments(paymentsData);

      // Fetch advances
      const { data: advancesData, error: advancesError } = await supabase
        .from("driver_advances")
        .select("*")
        .order("advance_date", { ascending: false });
      if (advancesError) throw new Error(`Échec du chargement des avances: ${advancesError.message}`);
      if (!Array.isArray(advancesData)) throw new Error("Données des avances invalides.");

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

      setDrivers(formattedDrivers);
      setAdvances(advancesData);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Fetch data error:", err);
      setError(err.message || "Échec du chargement des données. Veuillez réessayer.");
    } finally {
      setLoading(false);
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
    setSelectedPayment(null);
    setShowPaymentForm(true);
  };

  const handleAddAdvance = (driver) => {
    setSelectedDriver(driver);
    setSelectedAdvance(null);
    setShowAdvanceForm(true);
  };

  const handleEditDriver = (driver) => {
    setSelectedDriver(driver);
    setShowDriverForm(true);
  };

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce chauffeur et toutes ses données associées (paiements et avances) ? Cette action est irréversible.")) return;
    try {
      setLoading(true);
      setError(null);

      // Delete associated payments
      const { error: paymentsError } = await supabase
        .from("driver_payments")
        .delete()
        .eq("driver_id", driverId);
      if (paymentsError) throw new Error(`Échec de la suppression des paiements: ${paymentsError.message}`);

      // Delete associated advances
      const { error: advancesError } = await supabase
        .from("driver_advances")
        .delete()
        .eq("driver_id", driverId);
      if (advancesError) throw new Error(`Échec de la suppression des avances: ${advancesError.message}`);

      // Delete the driver
      const { error: driverError } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driverId);
      if (driverError) throw new Error(`Échec de la suppression du chauffeur: ${driverError.message}`);

      // Refresh data to ensure consistency
      await fetchData();
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error("Error deleting driver:", err);
      setError(err.message || "Échec de la suppression du chauffeur et de ses données associées. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdvance = (advance) => {
    const driver = drivers.find((d) => d.id === advance.driver_id);
    setSelectedDriver(driver);
    setSelectedAdvance(advance);
    setShowAdvanceForm(true);
  };

  const handleDeleteAdvance = async (advanceId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette avance ?")) return;
    try {
      const { error } = await supabase
        .from("driver_advances")
        .delete()
        .eq("id", advanceId);
      if (error) throw error;
      setAdvances((prev) => prev.filter((a) => a.id !== advanceId));
      setLastUpdated(new Date().toLocaleString());
      fetchData(); // Refresh to update payment status
    } catch (err) {
      console.error("Error deleting advance:", err);
      setError("Échec de la suppression de l'avance. Veuillez réessayer.");
    }
  };

  const handleEditPayment = (payment) => {
    const driver = drivers.find((d) => d.id === payment.driver_id);
    setSelectedDriver(driver);
    setSelectedPayment(payment);
    setShowPaymentForm(true);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce paiement ?")) return;
    try {
      const { error } = await supabase
        .from("driver_payments")
        .delete()
        .eq("id", paymentId);
      if (error) throw error;
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setLastUpdated(new Date().toLocaleString());
      fetchData(); // Refresh to update payment status
    } catch (err) {
      console.error("Error deleting payment:", err);
      setError("Échec de la suppression du paiement. Veuillez réessayer.");
    }
  };

  const handleViewHistory = (driver) => {
    setSelectedDriver(driver);
    setShowHistoryModal(true);
  };

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
          </div>
        </header>

        {showDriverForm && (
          <DriverForm
            trucks={trucks}
            driver={selectedDriver}
            onClose={() => {
              setShowDriverForm(false);
              setSelectedDriver(null);
              handleRefresh();
            }}
          />
        )}

        {showPaymentForm && (
          <PaymentForm
            driver={selectedDriver}
            payment={selectedPayment}
            month={filterMonth}
            onClose={() => {
              setShowPaymentForm(false);
              setSelectedDriver(null);
              setSelectedPayment(null);
              handleRefresh();
            }}
          />
        )}

        {showAdvanceForm && (
          <AdvanceForm
            driver={selectedDriver}
            advance={selectedAdvance}
            onClose={() => {
              setShowAdvanceForm(false);
              setSelectedDriver(null);
              setSelectedAdvance(null);
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
            onEditAdvance={handleEditAdvance}
            onDeleteAdvance={handleDeleteAdvance}
            onEditPayment={handleEditPayment}
            onDeletePayment={handleDeletePayment}
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
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditDriver(driver)}
                        >
                          Modifier
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteDriver(driver.id)}
                        >
                          Supprimer
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