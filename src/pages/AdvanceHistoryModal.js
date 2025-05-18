import React from "react";
import "./PaymentAdvanceHistoryModal.css";

const PaymentAdvanceHistoryModal = ({ driver, advances, payments, month, onEditAdvance, onDeleteAdvance, onEditPayment, onDeletePayment, onClose }) => {
  // Filter advances and payments by the selected month
  const filteredAdvances = advances.filter(
    (a) => a.advance_date && new Date(a.advance_date).toISOString().slice(0, 7) === month
  );
  const filteredPayments = payments.filter(
    (p) => p.payment_date && new Date(p.payment_date).toISOString().slice(0, 7) === month
  );

  // Combine advances and payments into a single history array (all months for display)
  const history = [
    ...advances.map((advance) => ({
      id: advance.id,
      type: "Avance",
      date: advance.advance_date
        ? new Date(advance.advance_date).toLocaleDateString("fr-FR")
        : "N/A",
      amount: typeof advance.amount === "number" ? advance.amount.toFixed(2) : "0.00",
      description: advance.description || "N/A",
      payment_method:
        advance.payment_method === "espèce"
          ? "Espèce"
          : advance.payment_method === "virement_bancaire"
          ? "Par virement bancaire"
          : "N/A",
      numero_de_virement: advance.numero_de_virement || "N/A",
      status: null,
      original: advance,
    })),
    ...payments.map((payment) => ({
      id: payment.id,
      type: "Paiement",
      date: payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString("fr-FR")
        : "N/A",
      amount: typeof payment.salary_paid === "number" ? payment.salary_paid.toFixed(2) : "0.00",
      description: payment.description || "N/A",
      payment_method:
        payment.payment_method === "espèce"
          ? "Espèce"
          : payment.payment_method === "virement_bancaire"
          ? "Par virement bancaire"
          : "N/A",
      numero_de_virement: payment.numero_de_virement || "N/A",
      status: payment.status || "N/A",
      original: payment,
    })),
  ];

  // Sort by date (newest first)
  history.sort((a, b) => {
    const dateA = a.date !== "N/A" ? new Date(a.date.split("/").reverse().join("-")) : new Date(0);
    const dateB = b.date !== "N/A" ? new Date(b.date.split("/").reverse().join("-")) : new Date(0);
    return dateB - dateA;
  });

  // Calculate totals for the selected month
  const totalAdvances = filteredAdvances.reduce(
    (total, advance) => total + (typeof advance.amount === "number" ? advance.amount : 0),
    0
  );
  const totalPayments = filteredPayments.reduce(
    (total, payment) => total + (typeof payment.salary_paid === "number" ? payment.salary_paid : 0),
    0
  );
  const totalPaid = totalAdvances + totalPayments;
  const baseSalary = typeof driver.base_salary === "number" ? driver.base_salary : 0;
  const remainingSalary = baseSalary - totalPaid;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Historique pour {driver.name} ({month})</h3>
          <button className="close-modal-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="summary-section">
          <div className="summary-item">
            <div className="summary-label">Salaire de Base:</div>
            <div className="summary-value">{baseSalary.toFixed(2)} TND</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Règlement salaire</div>
            <div className="summary-value">{totalPayments.toFixed(2)} TND</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">A compte:</div>
            <div className="summary-value">{totalAdvances.toFixed(2)} TND</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Total Payé:</div>
            <div className="summary-value">{totalPaid.toFixed(2)} TND</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Salaire Restant:</div>
            <div className={`summary-value ${remainingSalary >= 0 ? "positive" : "negative"}`}>
              {remainingSalary.toFixed(2)} TND
            </div>
          </div>
        </div>

        <div className="history-table">
          {history.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Montant (TND)</th>
                  <th>Description</th>
                  <th>Méthode de Paiement</th>
                  <th>Numéro de Virement</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className={item.type === "Avance" ? "advance-row" : "payment-row"}
                  >
                    <td>{item.date}</td>
                    <td>{item.type}</td>
                    <td>{item.amount}</td>
                    <td>{item.description}</td>
                    <td>{item.payment_method}</td>
                    <td>{item.numero_de_virement}</td>
                    <td>{item.status}</td>
                    <td>
                    
                      <button
                        className="history-delete-btn"
                        onClick={() =>
                          item.type === "Avance"
                            ? onDeleteAdvance(item.id)
                            : onDeletePayment(item.id)
                        }
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-history">Aucun historique trouvé.</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentAdvanceHistoryModal;