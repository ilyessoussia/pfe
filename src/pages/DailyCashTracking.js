import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./DailyCashTracking.css";
import { supabase } from "../supabase";

const DailyCashTracking = () => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({
    description: "",
    chbOutflow: "",
    chbInflow: "",
    snttOutflow: "",
    snttInflow: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [filterType, setFilterType] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingRows, setEditingRows] = useState({});
  const tableRef = useRef(null);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true);
        let query = supabase.from('cash_entries').select('*').order('created_at', { ascending: false });
        if (filterType === "today") {
          const today = new Date().toISOString().split('T')[0];
          query = query.eq('date', today);
        } else if (filterType === "specific" && selectedDate) {
          query = query.eq('date', selectedDate);
        }
        const { data, error } = await query;
        if (error) throw error;
        const formattedEntries = data.reduce((acc, entry) => {
          const existing = acc.find((e) => e.description === entry.description && e.date === entry.date);
          const amount = parseFloat(entry.amount) || 0;
          if (existing) {
            if (entry.entity === 'CHB') {
              existing[entry.type === 'inflow' ? 'chbInflow' : 'chbOutflow'] = amount;
            } else {
              existing[entry.type === 'inflow' ? 'snttInflow' : 'snttOutflow'] = amount;
            }
            existing.relatedIds.push(entry.id);
          } else {
            acc.push({
              id: entry.id,
              description: entry.description,
              chbInflow: entry.entity === 'CHB' && entry.type === 'inflow' ? amount : 0,
              chbOutflow: entry.entity === 'CHB' && entry.type === 'outflow' ? amount : 0,
              snttInflow: entry.entity === 'SNTT' && entry.type === 'inflow' ? amount : 0,
              snttOutflow: entry.entity === 'SNTT' && entry.type === 'outflow' ? amount : 0,
              date: entry.date,
              createdAt: new Date(entry.created_at),
              relatedIds: [entry.id],
            });
          }
          return acc;
        }, []);
        setEntries(formattedEntries);
      } catch (err) {
        console.error("Error fetching cash entries:", err);
        setError("Échec du chargement des entrées.");
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [filterType, selectedDate]);

  const handleInputChange = (id, field, value, isNew = false) => {
    if (isNew) {
      setNewEntry((prev) => ({ ...prev, [field]: value }));
    } else {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        )
      );
    }
  };

  const saveEntry = async (entry, isNew = false) => {
    setError(null);
    const amounts = [
      { field: 'chbInflow', entity: 'CHB', type: 'inflow' },
      { field: 'chbOutflow', entity: 'CHB', type: 'outflow' },
      { field: 'snttInflow', entity: 'SNTT', type: 'inflow' },
      { field: 'snttOutflow', entity: 'SNTT', type: 'outflow' },
    ];
    const nonEmptyAmounts = amounts.filter(({ field }) => entry[field] && parseFloat(entry[field]) > 0);
    if (!entry.description) {
      setError("La description est requise.");
      return false;
    }
    if (nonEmptyAmounts.length > 1) {
      setError("Une entrée ne peut avoir qu'un seul montant non nul.");
      return false;
    }
    if (nonEmptyAmounts.length === 0 && isNew) {
      return false;
    }
    try {
      const today = selectedDate || new Date().toISOString().split('T')[0];
      if (isNew) {
        if (nonEmptyAmounts.length === 0) return false;
        const { field, entity, type } = nonEmptyAmounts[0];
        const amount = parseFloat(entry[field]);
        const { data, error } = await supabase
          .from('cash_entries')
          .insert([{
            date: today,
            entity,
            type,
            amount,
            description: entry.description,
          }])
          .select();
        if (error) throw error;
        setEntries((prev) => [
          {
            id: data[0].id,
            description: data[0].description,
            chbInflow: entity === 'CHB' && type === 'inflow' ? amount : 0,
            chbOutflow: entity === 'CHB' && type === 'outflow' ? amount : 0,
            snttInflow: entity === 'SNTT' && type === 'inflow' ? amount : 0,
            snttOutflow: entity === 'SNTT' && type === 'outflow' ? amount : 0,
            date: data[0].date,
            createdAt: new Date(data[0].created_at),
            relatedIds: [data[0].id],
          },
          ...prev,
        ]);
        setNewEntry({ description: "", chbInflow: "", chbOutflow: "", snttInflow: "", snttOutflow: "" });
      } else {
        const existingEntry = entries.find((e) => e.id === entry.id);
        const updates = await Promise.all(amounts.map(async ({ field, entity, type }) => {
          const amount = parseFloat(entry[field]) || 0;
          const existingAmount = existingEntry[field] || 0;
          const relatedId = existingEntry.relatedIds[amounts.indexOf({ field, entity, type })];
          if (amount > 0 && !relatedId) {
            const { data, error } = await supabase
              .from('cash_entries')
              .insert([{
                date: entry.date,
                entity,
                type,
                amount,
                description: entry.description,
              }])
              .select();
            if (error) throw error;
            return { id: data[0].id, field };
          } else if (amount > 0 && relatedId) {
            const { error } = await supabase
              .from('cash_entries')
              .update({ amount, description: entry.description })
              .eq('id', relatedId);
            if (error) throw error;
            return { id: relatedId, field };
          } else if (existingAmount > 0 && relatedId) {
            const { error } = await supabase
              .from('cash_entries')
              .delete()
              .eq('id', relatedId);
            if (error) throw error;
            return null;
          }
          return null;
        }));
        const validUpdates = updates.filter((u) => u);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  description: entry.description,
                  chbInflow: parseFloat(entry.chbInflow) || 0,
                  chbOutflow: parseFloat(entry.chbOutflow) || 0,
                  snttInflow: parseFloat(entry.snttInflow) || 0,
                  snttOutflow: parseFloat(entry.snttOutflow) || 0,
                  relatedIds: validUpdates.map((u) => u.id),
                }
              : e
          )
        );
      }
      setSuccessMessage(isNew ? "Entrée ajoutée avec succès !" : "Entrée mise à jour avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (err) {
      console.error("Error saving cash entry:", err);
      setError("Erreur lors de l'enregistrement de l'entrée.");
      return false;
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Voulez-vous supprimer cette entrée ?")) return;
    try {
      const entry = entries.find((e) => e.id === id);
      const { error } = await supabase
        .from('cash_entries')
        .delete()
        .in('id', entry.relatedIds);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setEditingRows((prev) => {
        const newEditingRows = { ...prev };
        delete newEditingRows[id];
        return newEditingRows;
      });
      setSuccessMessage("Entrée supprimée avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error deleting cash entry:", err);
      setError("Erreur lors de la suppression de l'entrée.");
    }
  };

  const toggleEdit = (id, entry) => {
    if (editingRows[id]) {
      saveEntry(entry).then((success) => {
        if (success) {
          setEditingRows((prev) => ({ ...prev, [id]: false }));
        }
      });
    } else {
      setEditingRows((prev) => ({ ...prev, [id]: true }));
    }
  };

  const handleKeyDown = (e, id, field, isNew = false) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isNew) {
        saveEntry(newEntry, true);
      } else if (editingRows[id]) {
        const entry = entries.find((entry) => entry.id === id);
        saveEntry(entry).then((success) => {
          if (success) {
            setEditingRows((prev) => ({ ...prev, [id]: false }));
          }
        });
      }
    } else if (e.key === 'Tab' && !e.shiftKey && editingRows[id]) {
      e.preventDefault();
      const inputs = Array.from(tableRef.current.querySelectorAll(`tr[data-id="${id}"] input`));
      const currentIndex = inputs.indexOf(e.target);
      const nextIndex = (currentIndex + 1) % inputs.length;
      inputs[nextIndex]?.focus();
    }
  };

  const calculateTotals = () => {
    return entries.reduce(
      (acc, entry) => {
        acc.chbInflow += parseFloat(entry.chbInflow || 0);
        acc.chbOutflow += parseFloat(entry.chbOutflow || 0);
        acc.snttInflow += parseFloat(entry.snttInflow || 0);
        acc.snttOutflow += parseFloat(entry.snttOutflow || 0);
        return acc;
      },
      { chbInflow: 0, chbOutflow: 0, snttInflow: 0, snttOutflow: 0 }
    );
  };

  const printTable = () => {
    const todayEntries = entries.filter(
      (entry) => entry.date === new Date().toISOString().split('T')[0]
    );
    const totals = calculateTotals();
    const chbTotal = totals.chbInflow - totals.chbOutflow;
    const snttTotal = totals.snttInflow - totals.snttOutflow;
    const totalOfTotals = chbTotal + snttTotal;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Journal de Caisse - ${new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              text-align: center;
              font-size: 24px;
              margin-bottom: 10px;
            }
            h2 {
              text-align: center;
              font-size: 18px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .expense-value {
              color: red;
            }
            .income-value {
              color: green;
            }
            .total-row {
              font-weight: bold;
            }
            .combined-total-row td {
              font-weight: bold;
            }
            .total-of-totals-row td {
              font-weight: bold;
              font-size: 16px;
            }
            @media print {
              body {
                margin: 0;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          <h1>Journal de Caisse</h1>
          <h2>${new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>CHB (−)</th>
                <th>CHB (+)</th>
                <th>SNTT (−)</th>
                <th>SNTT (+)</th>
              </tr>
            </thead>
            <tbody>
              ${todayEntries.map((entry) => `
                <tr>
                  <td>${entry.description || ''}</td>
                  <td>${entry.chbOutflow ? `${parseFloat(entry.chbOutflow).toFixed(2)} TND` : ''}</td>
                  <td>${entry.chbInflow ? `${parseFloat(entry.chbInflow).toFixed(2)} TND` : ''}</td>
                  <td>${entry.snttOutflow ? `${parseFloat(entry.snttOutflow).toFixed(2)} TND` : ''}</td>
                  <td>${entry.snttInflow ? `${parseFloat(entry.snttInflow).toFixed(2)} TND` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>Total</td>
                <td class="expense-value">${totals.chbOutflow.toFixed(2)} TND</td>
                <td class="income-value">${totals.chbInflow.toFixed(2)} TND</td>
                <td class="expense-value">${totals.snttOutflow.toFixed(2)} TND</td>
                <td class="income-value">${totals.snttInflow.toFixed(2)} TND</td>
              </tr>
              <tr class="combined-total-row">
                <td>Total CHB + SNTT</td>
                <td class="${chbTotal >= 0 ? 'income-value' : 'expense-value'}">
                  ${chbTotal.toFixed(2)} TND
                </td>
                <td></td>
                <td class="${snttTotal >= 0 ? 'income-value' : 'expense-value'}">
                  ${snttTotal.toFixed(2)} TND
                </td>
                <td></td>
              </tr>
              <tr class="total-of-totals-row">
                <td>Total Net</td>
                <td colspan="4" class="${totalOfTotals >= 0 ? 'income-value' : 'expense-value'}">
                  ${totalOfTotals.toFixed(2)} TND
                </td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const totals = calculateTotals();
  const chbTotal = totals.chbInflow - totals.chbOutflow;
  const snttTotal = totals.snttInflow - totals.snttOutflow;
  const totalOfTotals = chbTotal + snttTotal;

  return (
    <div className="cash-tracking-container">
      <aside className="sidebar">
        <h2 className="cash-tracking-fleet-title">Système de Gestion & Contrôle</h2>
        <nav>
          <ul>
            <li><Link to="/fleet/dashboard">📊 Gestion de Flotte</Link></li>
            <li className="active"><Link to="/cash-tracking">💵 Gestion de Caisse</Link></li>
            <li><Link to="/parc">🔧 Gestion des Pièces</Link></li>
            <li><Link to="/fleet/stock-carburant">⛽ Stock Carburant</Link></li>
            <li><Link to="/stock">📦 Gestion de Stock</Link></li>
            <li><Link to="/schedule">🗓️ Gestion des Programmes</Link></li>
            <li><Link to="/maintenance">🛠️ Maintenance</Link></li>
            <li><Link to="/trailers">🚛 Gestion des Remorques</Link></li>
            <li><Link to="/incidents">🚨 Gestion des Incidents</Link></li>
            <li><Link to="/driver-payments">💰 Gestion de Paiement des Chauffeurs</Link></li>
          </ul>
        </nav>
        <div className="cash-tracking-sidebar-footer">
          <p>Version 1.2.0</p>
          <p>© 2025 Fleet Manager</p>
        </div>
      </aside>

      <main className="cash-tracking-content">
        <header className="cash-tracking-header">
          <h1>💵 Suivi Quotidien de Caisse</h1>
          <div className="cash-tracking-filter">
            <label htmlFor="filterType">Filtrer par :</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="today">Aujourd'hui</option>
              <option value="specific">Date spécifique</option>
              <option value="all">Toutes les entrées</option>
            </select>
            {filterType === "specific" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="xx/xx/xxxx"
              />
            )}
            <button
              className="cash-tracking-edit-btn"
              onClick={printTable}
              style={{ marginLeft: '10px' }}
            >
              Print Table
            </button>
          </div>
        </header>

        {successMessage && (
          <div className="cash-tracking-success-message">{successMessage}</div>
        )}
        {error && <div className="cash-tracking-error-message">{error}</div>}

        <section className="cash-tracking-list-section">
          <h2>
            Journal de Caisse -{' '}
            {filterType === 'all'
              ? 'Toutes les dates'
              : new Date(selectedDate || Date.now()).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
          </h2>
          {loading ? (
            <div className="cash-tracking-loading">Chargement des entrées...</div>
          ) : (
            <div className="cash-tracking-table-container">
              <table className="cash-tracking-table" ref={tableRef}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>CHB (−)</th>
                    <th>CHB (+)</th>
                    <th>SNTT (−)</th>
                    <th>SNTT (+)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} data-id={entry.id}>
                      <td>
                        <input
                          type="text"
                          value={entry.description}
                          onChange={(e) => handleInputChange(entry.id, 'description', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, entry.id, 'description')}
                          placeholder="ex: Alimentation de caisse"
                          disabled={!editingRows[entry.id]}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={entry.chbOutflow || ''}
                          onChange={(e) => handleInputChange(entry.id, 'chbOutflow', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, entry.id, 'chbOutflow')}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="expense-input"
                          disabled={!editingRows[entry.id]}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={entry.chbInflow || ''}
                          onChange={(e) => handleInputChange(entry.id, 'chbInflow', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, entry.id, 'chbInflow')}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="income-input"
                          disabled={!editingRows[entry.id]}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={entry.snttOutflow || ''}
                          onChange={(e) => handleInputChange(entry.id, 'snttOutflow', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, entry.id, 'snttOutflow')}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="expense-input"
                          disabled={!editingRows[entry.id]}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={entry.snttInflow || ''}
                          onChange={(e) => handleInputChange(entry.id, 'snttInflow', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, entry.id, 'snttInflow')}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="income-input"
                          disabled={!editingRows[entry.id]}
                        />
                      </td>
                      <td>
                        <button
                          className={`cash-tracking-edit-btn ${editingRows[entry.id] ? 'save' : 'edit'}`}
                          onClick={() => toggleEdit(entry.id, entry)}
                        >
                          {editingRows[entry.id] ? '✅' : '🖌️'}
                        </button>
                        <button
                          className="cash-tracking-delete-btn"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <input
                        type="text"
                        value={newEntry.description}
                        onChange={(e) => handleInputChange(null, 'description', e.target.value, true)}
                        onKeyDown={(e) => handleKeyDown(e, null, 'description', true)}
                        placeholder="ex: Alimentation de caisse"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={newEntry.chbOutflow}
                        onChange={(e) => handleInputChange(null, 'chbOutflow', e.target.value, true)}
                        onKeyDown={(e) => handleKeyDown(e, null, 'chbOutflow', true)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="expense-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={newEntry.chbInflow}
                        onChange={(e) => handleInputChange(null, 'chbInflow', e.target.value, true)}
                        onKeyDown={(e) => handleKeyDown(e, null, 'chbInflow', true)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="income-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={newEntry.snttOutflow}
                        onChange={(e) => handleInputChange(null, 'snttOutflow', e.target.value, true)}
                        onKeyDown={(e) => handleKeyDown(e, null, 'snttOutflow', true)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="expense-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={newEntry.snttInflow}
                        onChange={(e) => handleInputChange(null, 'snttInflow', e.target.value, true)}
                        onKeyDown={(e) => handleKeyDown(e, null, 'snttInflow', true)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="income-input"
                      />
                    </td>
                    <td></td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="cash-tracking-total-row">
                    <td>Total</td>
                    <td className="expense-value">{totals.chbOutflow.toFixed(2)} TND</td>
                    <td className="income-value">{totals.chbInflow.toFixed(2)} TND</td>
                    <td className="expense-value">{totals.snttOutflow.toFixed(2)} TND</td>
                    <td className="income-value">{totals.snttInflow.toFixed(2)} TND</td>
                    <td></td>
                  </tr>
                  <tr className="cash-tracking-combined-total-row">
                    <td>Total CHB + SNTT</td>
                    <td className={chbTotal >= 0 ? 'income-value' : 'expense-value'}>
                      {chbTotal.toFixed(2)} TND
                    </td>
                    <td></td>
                    <td className={snttTotal >= 0 ? 'income-value' : 'expense-value'}>
                      {snttTotal.toFixed(2)} TND
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr className="cash-tracking-total-of-totals-row">
                    <td>Total Net</td>
                    <td colSpan="5" className={totalOfTotals >= 0 ? 'income-value' : 'expense-value'}>
                      {totalOfTotals.toFixed(2)} TND
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DailyCashTracking;