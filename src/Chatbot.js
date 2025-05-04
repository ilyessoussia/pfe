import React, { useState, useEffect, useRef } from "react";
import "./Chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [lastTopic, setLastTopic] = useState(null);
  const messagesEndRef = useRef(null);

  const keywords = {
    produit: ["produit", "matériaux", "catalogue", "marchandise", "stock", "ciment", "brique", "colle"],
    livraison: ["livraison", "camion", "expédition", "transport", "véhicule", "délai"],
    contact: ["contact", "adresse", "téléphone", "email", "nous joindre", "bureau"],
    prix: ["prix", "tarif", "coût", "combien", "devis", "facture"],
    goodbye: ["au revoir", "bye", "à bientôt", "salut", "tchao", "adieu"]
  };

  const responses = {
    produit: "📦 Nous proposons des sacs de ciment, briques (12, 8, plâtrière), et colles (Pro 100, Pro 200). Consultez la section <a href='#products' class='chatbot-link'>Produits</a> pour plus de détails ! Merci !",
    livraison: "🚚 Nous offrons des livraisons rapides et fiables avec nos camions plateaux ou grues. Voir la section <a href='#solutions' class='chatbot-link'>Solutions</a> pour plus d'infos. Merci !",
    contact: "📞 Contactez-nous via la section <a href='#contact' class='chatbot-link'>Contact</a>, par email (contact@chb.com), ou téléphone (+216 123 456 789). Merci !",
    prix: "💰 Les prix varient selon les produits et la quantité. Contactez-nous via la section <a href='#contact' class='chatbot-link'>Contact</a> pour un devis personnalisé. Merci !",
    produit_prix: "💰 Les prix des produits comme le ciment ou les briques dépendent de la quantité. Consultez la section <a href='#products' class='chatbot-link'>Produits</a> et contactez-nous pour un devis ! Merci !",
    default: "🤔 Pas sûr de ce que vous cherchez ? Essayez des mots comme 'produits', 'livraison', ou 'contact'. Ou utilisez les boutons ci-dessous !",
    greeting: "Salut ! 👋 Je suis l'assistant CHB ! Je peux vous aider avec nos produits, livraisons, prix ou contacts. Posez-moi une question ou utilisez les boutons ci-dessous !",
    empty: "😊 Salut ! Oups, il semble que vous n'ayez rien écrit. Essayez 'produits' ou 'livraison' !",
    goodbye: "Merci, à bientôt ! 👋"
  };

  // Scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize with greeting when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ sender: "bot", text: responses.greeting, quickReplies: true }]);
    }
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, messages.length]);

  const handleSend = () => {
    if (!userInput.trim()) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: responses.empty, quickReplies: true }
      ]);
      setUserInput("");
      return;
    }

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: userInput }]);
    const input = userInput.toLowerCase();

    // Find matching keywords
    let matchedTopics = [];
    for (const [topic, words] of Object.entries(keywords)) {
      if (words.some((word) => input.includes(word))) {
        matchedTopics.push(topic);
      }
    }

    // Determine response
    let response = responses.default;
    let newTopic = lastTopic;

    if (matchedTopics.length === 0) {
      response = responses.default;
      newTopic = null;
    } else if (matchedTopics.includes("goodbye")) {
      response = responses.goodbye;
      newTopic = null;
    } else if (matchedTopics.length === 1) {
      const topic = matchedTopics[0];
      response = responses[topic];
      newTopic = topic;
    } else if (matchedTopics.includes("prix") && matchedTopics.includes("produit")) {
      response = responses.produit_prix;
      newTopic = "produit";
    } else {
      response = responses[matchedTopics[0]]; // Prioritize first match
      newTopic = matchedTopics[0];
    }

    // Contextual response for follow-up questions
    if (lastTopic === "produit" && input.includes("prix") && !matchedTopics.includes("produit")) {
      response = responses.produit_prix;
      newTopic = "produit";
    }

    // Add bot response with delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: response, quickReplies: response !== responses.goodbye }
      ]);
      setLastTopic(newTopic);
      scrollToBottom();
    }, 500);

    setUserInput("");
  };

  const handleQuickReply = (topic) => {
    setMessages((prev) => [...prev, { sender: "user", text: topic }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: responses[topic], quickReplies: true }
      ]);
      setLastTopic(topic);
      scrollToBottom();
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // Handle link clicks for smooth scrolling
  const handleLinkClick = (e) => {
    e.preventDefault();
    const href = e.target.getAttribute("href");
    const section = document.querySelector(href);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false); // Close chatbot on link click
    }
  };

  return (
    <div className="chatbot-container">
      {!isOpen && (
        <button
          className="chatbot-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir le chatbot"
        >
          💬
        </button>
      )}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Assistant CHB</h3>
            <button
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le chatbot"
            >
              ×
            </button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chatbot-message ${
                  msg.sender === "user" ? "user" : "bot"
                }`}
              >
                <span
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                  onClick={handleLinkClick}
                />
                {msg.quickReplies && (
                  <div className="quick-replies">
                    <button onClick={() => handleQuickReply("produit")}>
                      📦 Produits
                    </button>
                    <button onClick={() => handleQuickReply("livraison")}>
                      🚚 Livraison
                    </button>
                    <button onClick={() => handleQuickReply("contact")}>
                      📞 Contact
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre question..."
              aria-label="Saisir une question pour le chatbot"
            />
            <button onClick={handleSend} aria-label="Envoyer le message">
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;