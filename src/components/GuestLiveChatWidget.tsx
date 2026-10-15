import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { VillaLogo } from "./VillaLogo";
import { ChatMessage, ChatSession, PresetQA, DEFAULT_PRESET_QAS } from "../types";
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  Headphones,
  User,
  ShieldCheck,
  CheckCheck,
  GripHorizontal,
  RotateCcw,
  Sparkles,
  Phone,
  MapPin,
  Trash2,
  Calendar,
} from "lucide-react";

const STORAGE_KEY = "diversion_vigan_live_chat_sessions";
const GUEST_ID_KEY = "diversion_vigan_guest_chat_id";

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: "msg-welcome-001",
  sender: "front_desk",
  senderName: "Maria • Front Desk",
  text: "Mabuhay! Welcome to Diversion Vigan Transient & Villa. How can we help you with reservations or rates today?",
  timestamp: new Date().toISOString(),
  isRead: true,
};

const QUICK_SUGGESTIONS = [
  "Room Availability",
  "Family Rooms (4-6)",
  "Private Villa Rates",
  "Check-in Time",
  "Calle Crisologo",
];

export const GuestLiveChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  // Dynamic Preset QAs / FAQs State
  const [presetQAs, setPresetQAs] = useState<PresetQA[]>(() => {
    try {
      const saved = localStorage.getItem("diversion_vigan_custom_preset_faqs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PRESET_QAS;
  });

  useEffect(() => {
    const syncFaqs = () => {
      try {
        const saved = localStorage.getItem("diversion_vigan_custom_preset_faqs");
        if (saved) setPresetQAs(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener("diversion_preset_faqs_update", syncFaqs);
    window.addEventListener("storage", syncFaqs);
    return () => {
      window.removeEventListener("diversion_preset_faqs_update", syncFaqs);
      window.removeEventListener("storage", syncFaqs);
    };
  }, []);

  const activeChips = useMemo(() => {
    const chipItems = presetQAs.filter((q) => q.showAsChip !== false);
    if (chipItems.length > 0) return chipItems.map((q) => q.question);
    return QUICK_SUGGESTIONS;
  }, [presetQAs]);

  // Position state for movable draggable window and trigger button
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragTracker = useRef<{
    startX: number;
    startY: number;
    initialElemX: number;
    initialElemY: number;
    hasMovedSignificantly: boolean;
    pointerId: number | null;
  }>({
    startX: 0,
    startY: 0,
    initialElemX: 0,
    initialElemY: 0,
    hasMovedSignificantly: false,
    pointerId: null,
  });

  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get or initialize persistent Guest Chat ID
  const getGuestId = (): string => {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = "guest-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  };

  // Load chat session from localStorage
  const loadChatSession = () => {
    try {
      const guestId = getGuestId();
      const allSessions: ChatSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const currentSession = allSessions.find((s) => s.id === guestId);

      if (currentSession && currentSession.messages && currentSession.messages.length > 0) {
        setMessages((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(currentSession.messages)) return prev;
          return currentSession.messages;
        });
        setGuestName(currentSession.guestName || "");
        setGuestPhone(currentSession.guestPhone || "");
        setHasStartedChat(true);
        if (!isOpen) {
          setUnreadCount(currentSession.unreadCountForGuest || 0);
        }
      }
    } catch (e) {
      console.error("Error loading chat session:", e);
    }
  };

  // Save session to localStorage and broadcast event
  const saveChatSession = (updatedMessages: ChatMessage[], name?: string, phone?: string) => {
    try {
      const guestId = getGuestId();
      const allSessions: ChatSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const activeName = name || guestName || "Website Guest";
      const activePhone = phone || guestPhone || "";
      const lastMsg = updatedMessages[updatedMessages.length - 1];

      const existingIndex = allSessions.findIndex((s) => s.id === guestId);

      const sessionData: ChatSession = {
        id: guestId,
        guestName: activeName,
        guestPhone: activePhone,
        unreadCountForDesk: (existingIndex >= 0 ? allSessions[existingIndex].unreadCountForDesk || 0 : 0) + 1,
        unreadCountForGuest: 0,
        lastMessage: lastMsg ? lastMsg.text : "Started conversation",
        lastTimestamp: lastMsg ? lastMsg.timestamp : new Date().toISOString(),
        messages: updatedMessages,
      };

      if (existingIndex >= 0) {
        allSessions[existingIndex] = sessionData;
      } else {
        allSessions.unshift(sessionData);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
      window.dispatchEvent(new CustomEvent("diversion_chat_update", { detail: { sessionId: guestId } }));
    } catch (e) {
      console.error("Error saving chat session:", e);
    }
  };

  useEffect(() => {
    loadChatSession();

    const handleChatUpdate = (e: any) => {
      const guestId = getGuestId();
      if (!e.detail || e.detail.sessionId === guestId) {
        loadChatSession();
      }
    };

    window.addEventListener("diversion_chat_update", handleChatUpdate);
    window.addEventListener("storage", loadChatSession);

    return () => {
      window.removeEventListener("diversion_chat_update", handleChatUpdate);
      window.removeEventListener("storage", loadChatSession);
    };
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Auto-hide teaser after 15 seconds if ignored
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTeaser(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  // Universal Pointer Drag Handler
  const startDragging = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button:not(.drag-trigger-btn)") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("form")
    ) {
      return;
    }

    e.preventDefault();
    const elem = widgetContainerRef.current;
    if (!elem) return;

    const rect = elem.getBoundingClientRect();
    const currentElemX = rect.left;
    const currentElemY = rect.top;

    dragTracker.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialElemX: currentElemX,
      initialElemY: currentElemY,
      hasMovedSignificantly: false,
      pointerId: e.pointerId,
    };

    setIsDragging(true);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - dragTracker.current.startX;
      const deltaY = moveEv.clientY - dragTracker.current.startY;

      if (Math.hypot(deltaX, deltaY) > 5) {
        dragTracker.current.hasMovedSignificantly = true;
      }

      const elemWidth = elem.offsetWidth || 280;
      const elemHeight = elem.offsetHeight || 380;

      const minX = 8;
      const maxX = Math.max(8, window.innerWidth - elemWidth - 8);
      const minY = 8;
      const maxY = Math.max(8, window.innerHeight - elemHeight - 8);

      const targetX = Math.min(Math.max(minX, dragTracker.current.initialElemX + deltaX), maxX);
      const targetY = Math.min(Math.max(minY, dragTracker.current.initialElemY + deltaY), maxY);

      setPosition({ x: targetX, y: targetY });
    };

    const onPointerUp = (upEv: PointerEvent) => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      try {
        if (dragTracker.current.pointerId !== null) {
          (e.currentTarget as HTMLElement).releasePointerCapture(dragTracker.current.pointerId);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, []);

  const handleStartConversation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasStartedChat(true);

    const updated = [...messages];
    if (guestName.trim()) {
      const introMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        sender: "guest",
        senderName: guestName.trim(),
        text:
          "Hello! My name is " +
          guestName.trim() +
          (guestPhone.trim() ? " (Contact: " + guestPhone.trim() + ")" : "") +
          ". I would like to ask a few questions.",
        timestamp: new Date().toISOString(),
        isRead: true,
      };
      updated.push(introMsg);
      setMessages(updated);
      saveChatSession(updated, guestName.trim(), guestPhone.trim());
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    if (!hasStartedChat) {
      setHasStartedChat(true);
    }

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "guest",
      senderName: guestName.trim() || "Guest",
      text,
      timestamp: new Date().toISOString(),
      isRead: true,
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputMessage("");
    saveChatSession(updatedMessages);

    // Front Desk Automated Smart Responder
    simulateFrontDeskReply(text, updatedMessages);
  };

  const simulateFrontDeskReply = (guestQuery: string, currentHistory: ChatMessage[]) => {
    setIsTyping(true);

    setTimeout(() => {
      const q = guestQuery.toLowerCase();
      let replyText = "";

      // Match against dynamic custom preset QAs first
      const matchedQA = presetQAs.find((qa) => {
        const qText = qa.question.toLowerCase();
        const kwList = qa.keywords
          ? qa.keywords.toLowerCase().split(",").map((k) => k.trim()).filter(Boolean)
          : [];
        if (q === qText || q.includes(qText) || qText.includes(q)) return true;
        return kwList.some((kw) => q.includes(kw));
      });

      if (matchedQA) {
        replyText = matchedQA.answer;
      } else if (q.includes("family") && (q.includes("4") || q.includes("5") || q.includes("6") || q.includes("rate"))) {
        replyText =
          "Family Rooms (Room 4, 5, 6) rates:\n• Mon–Thu: 1-2 pax ₱1,000 | 3 pax ₱1,200 | 4 pax ₱1,400 | 5 pax ₱1,500 | 6 pax ₱1,800 | 7 pax ₱2,000\n• Fri–Sat: 1-2 pax ₱1,200 | 3 pax ₱1,300 | 4 pax ₱1,500 | 5 pax ₱1,800 | 6 pax ₱2,000 | 7 pax ₱2,200";
      } else if (q.includes("availability") || q.includes("available") || q.includes("book")) {
        replyText =
          "We have family rooms, standard units, and the Private Villa available! Select dates on the booking tab to view live availability.";
      } else if (q.includes("villa") || q.includes("pool")) {
        replyText =
          "Private Villa features a private swimming pool, 3 bedrooms, living area, kitchen, and gazebo. Starts at ₱8,000/night for up to 10 pax!";
      } else if (q.includes("rate") || q.includes("price") || q.includes("how much") || q.includes("pax")) {
        replyText =
          "Rates:\n• Standard Rooms: ₱2,000\n• Family Rooms (4, 5, 6): ₱1,000 - ₱2,000\n• Big Family (0, 1, 2, 3): ₱2,000\n• Private Villa: ₱7k/8k + Extra Pax (Sun-Thu ₱400, Fri-Sat ₱5,000)";
      } else if (q.includes("check-in") || q.includes("checkout") || q.includes("time") || q.includes("hours")) {
        replyText =
          "Standard Nightly Check-in is 2:00 PM and Check-out is 12:00 PM (Noon). Flexible check-in is available for short stays.";
      } else if (q.includes("calle crisologo") || q.includes("distance") || q.includes("location") || q.includes("where")) {
        replyText =
          "We are located along Diversion Road, Barangay San Julian Norte, Vigan City — 5 mins away from historic Calle Crisologo!";
      } else if (q.includes("pet") || q.includes("pets") || q.includes("dog") || q.includes("cat")) {
        replyText =
          "Yes, we are pet-friendly! Small/medium well-behaved pets are welcome.";
      } else {
        replyText =
          "Thank you for contacting us! Our front desk officer is on duty and will attend to your inquiry shortly.";
      }

      const replyMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        sender: "front_desk",
        senderName: "Maria • Front Desk",
        text: replyText,
        timestamp: new Date().toISOString(),
        isRead: isOpen,
      };

      const finalMessages = [...currentHistory, replyMsg];
      setMessages(finalMessages);
      setIsTyping(false);

      try {
        const guestId = getGuestId();
        const allSessions: ChatSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const existingIndex = allSessions.findIndex((s) => s.id === guestId);
        if (existingIndex >= 0) {
          allSessions[existingIndex].messages = finalMessages;
          allSessions[existingIndex].lastMessage = replyText;
          allSessions[existingIndex].lastTimestamp = replyMsg.timestamp;
          if (!isOpen) {
            allSessions[existingIndex].unreadCountForGuest = (allSessions[existingIndex].unreadCountForGuest || 0) + 1;
            setUnreadCount((prev) => prev + 1);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
          window.dispatchEvent(new CustomEvent("diversion_chat_update", { detail: { sessionId: guestId } }));
        }
      } catch (e) {
        console.error("Error updating reply:", e);
      }
    }, 900);
  };

  const handleClearHistory = () => {
    if (window.confirm("Start fresh conversation? Your chat history will be cleared.")) {
      const resetMsgs = [INITIAL_WELCOME_MESSAGE];
      setMessages(resetMsgs);
      saveChatSession(resetMsgs);
      setUnreadCount(0);
    }
  };

  const resetPosition = () => {
    setPosition(null);
  };

  return (
    <div
      ref={widgetContainerRef}
      style={{
        position: "fixed",
        zIndex: 9999,
        touchAction: isDragging ? "none" : "auto",
        ...(position
          ? {
              left: position.x + "px",
              top: position.y + "px",
              right: "auto",
              bottom: "auto",
            }
          : {
              right: "16px",
              bottom: "16px",
            }),
      }}
      className="select-none flex flex-col items-end pointer-events-auto"
    >
      {/* Sleek Floating Chat Launcher Icon Button (When Closed) */}
      {!isOpen && (
        <button
          type="button"
          onPointerDown={startDragging}
          onClick={() => {
            if (!dragTracker.current.hasMovedSignificantly) {
              setIsOpen(true);
              setIsMinimized(false);
              setShowTeaser(false);
              setUnreadCount(0);
            }
          }}
          className={
            "drag-trigger-btn group relative w-12 h-12 sm:w-13 sm:h-13 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer overflow-hidden backdrop-blur-md " +
            "bg-gradient-to-br from-[#1A1009] via-[#2E1E14] to-[#1A1009] text-amber-300 hover:text-amber-100 " +
            "border-2 border-[#D4AF37] hover:border-[#F9E8B2] shadow-amber-950/60 hover:shadow-amber-500/30 hover:scale-110 active:scale-95 " +
            "animate-chat-glow " +
            (isDragging ? "cursor-grabbing opacity-90 scale-105 ring-2 ring-[#D4AF37]/50" : "cursor-grab")
          }
          title="Live Chat with Front Desk • Drag to reposition"
          aria-label="Open Live Chat"
        >
          {/* Ambient Pulsing Radar Glow */}
          <span className="absolute -inset-1 rounded-full bg-[#D4AF37] opacity-25 group-hover:opacity-50 blur-xs transition-opacity animate-pulse pointer-events-none" />

          {/* Animated Light Sweep Gleam Effect */}
          <span className="absolute inset-0 w-6 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-in-out pointer-events-none" />

          {/* Inner Gold Inset Ring */}
          <span className="absolute inset-[3px] rounded-full border border-amber-400/30 pointer-events-none" />

          {/* Chat Icon */}
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 group-hover:text-amber-100 transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 drop-shadow-[0_2px_4px_rgba(212,175,55,0.4)]" />

          {/* Online Radar Dot */}
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1A1009] shadow-xs" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#1A1009] animate-ping opacity-75" />

          {/* Unread Messages Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-600 to-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md border-2 border-[#1A1009] animate-chat-wiggle">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Compact Live Chat Window */}
      {isOpen && (
        <div
          className={
            "bg-[#FAF7F2] rounded-2xl border border-[#D4AF37]/80 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden w-[280px] sm:w-[300px] animate-chat-pop " +
            (isMinimized ? "h-11" : "h-[385px] max-h-[70vh]") +
            (isDragging ? " ring-2 ring-[#D4AF37]/60 shadow-3xl" : "")
          }
        >
          {/* Draggable Compact Window Header */}
          <div
            onPointerDown={startDragging}
            className={
              "bg-gradient-to-r from-[#1A1009] via-[#2F1E14] to-[#1A1009] text-white p-2 px-2.5 flex items-center justify-between border-b border-[#D4AF37]/30 select-none shrink-0 shadow-md relative overflow-hidden " +
              (isDragging ? "cursor-grabbing" : "cursor-grab")
            }
            title="Click & drag anywhere on this header to move chat"
          >
            <div className="flex items-center gap-2 min-w-0 pointer-events-none relative z-10">
              <div className="relative shrink-0">
                <VillaLogo size={22} variant="gold" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#180F09] animate-pulse" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-brand font-black text-[11px] text-[#FFF2CC] tracking-wide uppercase truncate">
                    Diversion Vigan
                  </span>
                  <span className="bg-[#D4AF37]/30 text-[#FCEEC5] text-[7.5px] font-bold px-1 py-0.2 rounded font-mono shrink-0">
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[8.5px] text-[#E6D7C3] leading-none mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">Maria • Front Desk</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0 ml-1 relative z-20">
              {position && (
                <button
                  type="button"
                  onClick={resetPosition}
                  className="p-1 text-[#E6D7C3] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                  title="Reset position"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-[#E6D7C3] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                title={isMinimized ? "Expand chat" : "Minimize chat"}
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#E6D7C3] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Action Navigation Strip */}
          {!isMinimized && (
            <div className="bg-[#24170E] px-2.5 py-1 border-b border-[#3D2616] flex items-center justify-between text-[9px] text-[#E5C158] shrink-0">
              <div className="flex items-center gap-1.5">
                <a
                  href="tel:+639175681408"
                  className="hover:text-white transition-colors flex items-center gap-0.5 font-semibold"
                  title="Call Front Desk directly"
                >
                  <Phone className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Call</span>
                </a>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage("What is your exact location and distance to Calle Crisologo?")}
                  className="hover:text-white transition-colors flex items-center gap-0.5 font-semibold cursor-pointer"
                >
                  <MapPin className="w-2.5 h-2.5 text-amber-400" />
                  <span>Map</span>
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage("What are the rates for family rooms and standard rooms?")}
                  className="hover:text-white transition-colors flex items-center gap-0.5 font-semibold cursor-pointer"
                >
                  <Calendar className="w-2.5 h-2.5 text-[#F3E5AB]" />
                  <span>Rates</span>
                </button>
              </div>

              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[#E6D7C3]/60 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          {/* Chat Body (When not minimized) */}
          {!isMinimized && (
            <>
              {/* Optional Guest Name/Phone Prompt if first time */}
              {!hasStartedChat && (
                <div className="bg-[#F6EEE3] p-2 border-b border-[#E6D7C3] space-y-1.5 animate-chat-pop shrink-0">
                  <div className="flex items-center gap-1 text-[10.5px] font-bold text-[#2C1E15]">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    <span>Connect with Vigan Front Desk:</span>
                  </div>
                  <form onSubmit={handleStartConversation} className="space-y-1">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-[#E6D7C3] bg-white text-[11px] text-[#2C1E15] outline-none focus:ring-1 focus:ring-[#B8860B]/40 shadow-2xs"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile number (Optional)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-[#E6D7C3] bg-white text-[11px] text-[#2C1E15] outline-none focus:ring-1 focus:ring-[#B8860B]/40 shadow-2xs"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:brightness-110 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      Start Live Conversation
                    </button>
                  </form>
                </div>
              )}

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[#FAF7F2]">
                <div className="text-center py-0.5">
                  <span className="text-[8.5px] text-[#786150] bg-[#EFE3D3]/70 px-2 py-0.2 rounded-full border border-[#E6D7C3] font-medium">
                    Diversion Road • Vigan City
                  </span>
                </div>

                {messages.map((msg) => {
                  const isGuest = msg.sender === "guest";
                  return (
                    <div
                      key={msg.id}
                      className={
                        "flex flex-col space-y-0.5 animate-chat-pop " +
                        (isGuest ? "items-end" : "items-start")
                      }
                    >
                      <div className="flex items-center gap-1 text-[8.5px] text-[#786150] px-1">
                        {isGuest ? (
                          <>
                            <span className="font-semibold text-stone-800">{msg.senderName}</span>
                            <User className="w-2 h-2 text-amber-800" />
                          </>
                        ) : (
                          <>
                            <Headphones className="w-2 h-2 text-[#B8860B]" />
                            <span className="font-bold text-[#2C1E15]">{msg.senderName}</span>
                          </>
                        )}
                      </div>

                      <div
                        className={
                          "max-w-[90%] p-2 rounded-xl text-[11px] leading-relaxed shadow-xs " +
                          (isGuest
                            ? "bg-gradient-to-br from-[#2C1E15] to-[#1A1009] text-[#FFFDF7] rounded-tr-xs border border-[#1A1009]"
                            : "bg-white text-[#2C1E15] rounded-tl-xs border border-[#E6D7C3]/90")
                        }
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>

                      <div className="flex items-center gap-0.5 text-[8px] text-[#A08875] px-1">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isGuest && <CheckCheck className="w-2.5 h-2.5 text-emerald-600" />}
                      </div>
                    </div>
                  );
                })}

                {/* Animated Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#786150] bg-white p-1.5 px-2.5 rounded-xl rounded-tl-xs border border-[#E6D7C3] w-28 shadow-2xs animate-chat-pop">
                    <div className="flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[9px] font-semibold text-[#786150]">Typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestion Chips */}
              <div className="p-1.5 bg-[#F6EEE3]/90 border-t border-[#E6D7C3] overflow-x-auto flex gap-1 shrink-0 no-scrollbar">
                {activeChips.map((chip: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="whitespace-nowrap bg-white hover:bg-amber-50 text-[#3D2616] hover:text-[#1A1009] border border-[#E6D7C3] hover:border-amber-400 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <div className="p-2 bg-white border-t border-[#E6D7C3] shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E6D7C3] bg-[#FAF7F2] text-[11px] text-[#2C1E15] outline-none focus:ring-1 focus:ring-[#B8860B]/40 focus:bg-white transition-all placeholder:text-[#A08875]"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:brightness-110 disabled:opacity-40 text-white p-1.5 rounded-lg shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 flex items-center justify-center shrink-0"
                    title="Send message"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </form>
                <div className="flex items-center justify-between mt-1 px-0.5 text-[8px] text-[#A08875]">
                  <span className="flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    +63 917 568 1408
                  </span>
                  <span>Vigan City</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
