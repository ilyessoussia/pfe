import React, { useState, useEffect, useRef } from "react";
import "./FleetChatbot.css";
import { supabase } from "../supabase";

const FleetChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Salut ! Je suis votre assistant de flotte. Posez-moi des questions comme 'Quels camions ont besoin de maintenance cette semaine ?', 'Comment a changé la consommation de carburant ?', ou 'Accidents par chauffeur ?'",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Flexible query parser
  const parseQuery = (query) => {
    const normalizedQuery = query.toLowerCase().trim().replace(/[.,!?]/g, "");
    const tokens = normalizedQuery.split(/\s+/);

    // Keyword sets for each query type
    const maintenanceKeywords = ["maintenance", "entretien", "réparation", "service"];
    const weekKeywords = ["semaine", "week", "cette", "this"];
    const fuelKeywords = ["carburant", "fuel", "consommation", "consumption"];
    const monthKeywords = ["mois", "month", "dernier", "last"];
    const incidentKeywords = [
      "incident",
      "incidents",
      "accident",
      "accidents",
      "panne",
      "problème",
      "issue",
    ];
    const driverKeywords = [
      "chauffeur",
      "chauffeurs",
      "driver",
      "drivers",
      "conducteur",
      "conducteurs",
    ];

    // Check for maintenance query
    const isMaintenanceQuery =
      maintenanceKeywords.some((kw) => tokens.includes(kw)) &&
      weekKeywords.some((kw) => tokens.includes(kw));
    if (isMaintenanceQuery) return "maintenance_week";

    // Check for fuel query
    const isFuelQuery =
      fuelKeywords.some((kw) => tokens.includes(kw)) &&
      monthKeywords.some((kw) => tokens.includes(kw));
    if (isFuelQuery) return "fuel_month";

    // Check for incident query
    const isIncidentQuery =
      incidentKeywords.some((kw) => tokens.includes(kw)) &&
      driverKeywords.some((kw) => tokens.includes(kw));
    if (isIncidentQuery) return "incident_driver";

    // Log unmatched query for debugging
    console.log("Unmatched query:", normalizedQuery);
    return null;
  };

  // Handle user queries
  const handleQuery = async (query) => {
    setLoading(true);
    let response = "Désolé, je n'ai pas compris. Essayez 'Maintenance cette semaine ?', 'Consommation carburant dernier mois ?', ou 'Accidents par chauffeur ?'";

    try {
      const queryType = parseQuery(query);

      if (queryType === "maintenance_week") {
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const { data: maintenanceData, error } = await supabase
          .from("maintenance_records")
          .select("*, trucks(immatriculation)")
          .eq("status", "scheduled")
          .gte("date", startOfWeek.toISOString().split("T")[0])
          .lte("date", endOfWeek.toISOString().split("T")[0]);

        if (error) throw error;

        if (maintenanceData.length > 0) {
          const truckList = maintenanceData
            .map(
              (record) =>
                `${record.trucks.immatriculation} (${record.type}, prévu le ${new Date(
                  record.date
                ).toLocaleDateString("fr-FR")})`
            )
            .join(", ");
          response = `Camions nécessitant une maintenance cette semaine : ${truckList}.`;
        } else {
          response = "Aucun camion n'a de maintenance prévue cette semaine.";
        }
      } else if (queryType === "fuel_month") {
        const now = new Date();
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);

        const fetchFuelData = async (start, end) => {
          const { data, error } = await supabase
            .from("fuel_history")
            .select("liters_per_100km")
            .gte("raw_date", start.toISOString().split("T")[0])
            .lte("raw_date", end.toISOString().split("T")[0]);

          if (error) throw error;
          const avg =
            data.reduce((sum, entry) => sum + (parseFloat(entry.liters_per_100km) || 0), 0) /
            (data.length || 1);
          return avg.toFixed(2);
        };

        const lastMonthAvg = await fetchFuelData(lastMonthStart, lastMonthEnd);
        const twoMonthsAgoAvg = await fetchFuelData(twoMonthsAgoStart, twoMonthsAgoEnd);

        if (lastMonthAvg && twoMonthsAgoAvg) {
          const change = ((lastMonthAvg - twoMonthsAgoAvg) / twoMonthsAgoAvg * 100).toFixed(2);
          response = `La consommation moyenne de carburant le mois dernier était de ${lastMonthAvg} L/100km, contre ${twoMonthsAgoAvg} L/100km le mois précédent, soit une variation de ${change}%.`;
        } else {
          response = "Pas assez de données pour comparer la consommation de carburant.";
        }
      } else if (queryType === "incident_driver") {
        const { data: incidentsData, error: incidentsError } = await supabase
          .from("incidents")
          .select("truck_id, trucks!inner(chauffeur)")
          .order("incident_date", { ascending: false });

        if (incidentsError) {
          console.error("Incident query error:", incidentsError);
          throw new Error("Erreur lors de la récupération des incidents: " + incidentsError.message);
        }

        if (!incidentsData || incidentsData.length === 0) {
          response = "Aucun incident enregistré dans la base de données.";
        } else {
          const incidentCounts = incidentsData.reduce((acc, incident) => {
            const driver = incident.trucks?.chauffeur || "Inconnu";
            if (driver && driver !== "Inconnu") {
              acc[driver] = (acc[driver] || 0) + 1;
            }
            return acc;
          }, {});

          if (Object.keys(incidentCounts).length === 0) {
            response = "Aucun incident associé à un chauffeur connu.";
          } else {
            const maxIncidents = Math.max(...Object.values(incidentCounts));
            const topDriver = Object.keys(incidentCounts).find(
              (driver) => incidentCounts[driver] === maxIncidents
            );
            response = `Le chauffeur avec le plus d'incidents est ${topDriver} avec ${maxIncidents} incident(s).`;
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { text: query, sender: "user", timestamp: new Date() },
        { text: response, sender: "bot", timestamp: new Date() },
      ]);
    } catch (err) {
      console.error("Error processing query:", err);
      setMessages((prev) => [
        ...prev,
        { text: query, sender: "user", timestamp: new Date() },
        {
          text: "Erreur lors du traitement de la demande: " + err.message,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleQuery(input);
    setInput("");
  };

  const handleQuickReply = (query) => {
    handleQuery(query);
  };

  return (
    <div className={`chatbot-container ${isOpen ? "open" : ""}`}>
      <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "×" : "💬"}
      </button>
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Assistant de Flotte</h3>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <span className="message-text">{msg.text}</span>
                <span className="message-timestamp">
                  {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-quick-replies">
            <button
              onClick={() => handleQuickReply("Quels camions ont besoin de maintenance cette semaine ?")}
            >
              Maintenance cette semaine
            </button>
            <button
              onClick={() =>
                handleQuickReply("Comment a changé la consommation de carburant le mois dernier ?")
              }
            >
              Consommation carburant
            </button>
            <button onClick={() => handleQuickReply("Accidents par chauffeur ?")}>
              Accidents par chauffeur
            </button>
          </div>
          <form onSubmit={handleSubmit} className="chatbot-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question..."
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? "..." : "Envoyer"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FleetChatbot;