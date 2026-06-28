import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import './PatientChatbot.css';

export default function PatientChatbot() {
  const { currentUser } = useDatabase();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hello ${currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}! I'm your AI Pharmacist. How can I assist you with your health or medications today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: getSimulatedResponse(userMessage.text),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getSimulatedResponse = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('ibuprofen') || lowerText.includes('pain')) {
      return "Ibuprofen is a standard anti-inflammatory. However, if you are currently taking any blood pressure medication, it's best to consult directly with your doctor as NSAIDs can sometimes interfere with hypertension treatments.";
    }
    if (lowerText.includes('delivery') || lowerText.includes('order')) {
      return "You can track your live orders right from your Profile page! Standard delivery takes about 30-45 minutes depending on your zone.";
    }
    return "I'm currently a simulated AI Assistant! In the full version, I will connect securely to an n8n workflow to pull your medical history and give safe, accurate pharmacy advice. How else can I help?";
  };

  return (
    <div className="patient-chatbot-wrapper">
      {isOpen && (
        <div className="chatbot-panel animate-slide-up">
          <div className="chatbot-header">
            <div className="flex-center gap-3">
              <div className="bot-avatar">
                <Bot size={20} color="white" />
              </div>
              <div>
                <h4 className="font-bold text-white leading-tight">AI Pharmacist</h4>
                <p className="text-xs text-white opacity-70">Online 24/7</p>
              </div>
            </div>
            <button className="close-bot-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
                {msg.sender === 'ai' && (
                  <div className="msg-avatar ai-avatar"><Bot size={14} /></div>
                )}
                <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message-row ai-row">
                <div className="msg-avatar ai-avatar"><Bot size={14} /></div>
                <div className="message-bubble ai-bubble typing-bubble">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input 
              type="text" 
              placeholder="Ask about medications..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend} disabled={!inputValue.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <button className="chatbot-toggle-btn shadow-blue hover-scale" onClick={() => setIsOpen(true)}>
          <MessageSquare size={24} />
          <div className="active-dot"></div>
        </button>
      )}
    </div>
  );
}
