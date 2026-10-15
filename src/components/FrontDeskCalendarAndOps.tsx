import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookingRecord, 
  BookingStatus, 
  RoomUnit, 
  StaffPermissions,
  PaymentMethod,
} from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  LogOut, 
  Sparkles, 
  Building2, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  Plus, 
  Printer, 
  X, 
  Check, 
  CreditCard, 
  Search, 
  Eye, 
  Lock, 
  Download,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Bed,
  Clock,
  Receipt,
  User,
  Info
} from 'lucide-react';

export type HousekeepingStatus = 'clean' | 'dirty' | 'cleaning' | 'maintenance' | 'dnd';

export interface RoomMaintenanceBlock {
  id: string;
  roomId: string;
  roomTitle: string;
  startDate: string;
  endDate: string;
  reason: string;
  blockedBy: string;
  createdAt: string;
}

export interface FrontDeskExtraCharge {
  id: string;
  bookingId: string;
  description: string;
  amount: number;
  addedAt: string;
  addedBy: string;
}

interface FrontDeskCalendarAndOpsProps {
  bookings: BookingRecord[];
  rooms: RoomUnit[];
  permissions: StaffPermissions;
  currentStaffName: string;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus, notes?: string) => void;
  onEditBooking?: (updatedBooking: BookingRecord) => void;
  onDeleteBooking?: (bookingId: string) => void;
  onOpenVoucher: (booking: BookingRecord) => void;
  onOpenSlipLightbox: (booking: BookingRecord) => void;
  onQuickWalkinForDate?: (roomId: string, dateStr: string) => void;
  onAddWalkinBooking?: (booking: BookingRecord) => void;
}

export const FrontDeskCalendarAndOps: React.FC<FrontDeskCalendarAndOpsProps> = ({
  bookings,
  rooms,
  permissions,
  currentStaffName,
  onUpdateBookingStatus,
  onEditBooking,
  onDeleteBooking,
  onOpenVoucher,
  onOpenSlipLightbox,
  onQuickWalkinForDate,
  onAddWalkinBooking,
}) => {
  // Active internal view tab
  const [opsSubTab, setOpsSubTab] = useState<'calendar' | 'arrivals' | 'departures' | 'inhouse' | 'housekeeping' | 'cashier' | 'audit'>('calendar');

  // Calendar navigation state (Default 15 Days View)
  const [calendarViewMode, setCalendarViewMode] = useState<'15days' | 'month'>('15days');
  const [calendarBaseDate, setCalendarBaseDate] = useState<Date>(() => new Date());

  // Room status / Housekeeping persistence
  const [housekeepingState, setHousekeepingState] = useState<Record<string, { status: HousekeepingStatus; notes: string; lastUpdated: string }>>(() => {
    try {
      const saved = localStorage.getItem('diversion_housekeeping_status');
      if (saved) return JSON.parse(saved);
    } catch {}
    const init: Record<string, { status: HousekeepingStatus; notes: string; lastUpdated: string }> = {};
    rooms.forEach(r => {
      init[r.id] = { status: 'clean', notes: 'Ready for guest check-in', lastUpdated: new Date().toISOString() };
    });
    return init;
  });

  useEffect(() => {
    localStorage.setItem('diversion_housekeeping_status', JSON.stringify(housekeepingState));
  }, [housekeepingState]);

  // Maintenance Blocks persistence
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<RoomMaintenanceBlock[]>(() => {
    try {
      const saved = localStorage.getItem('diversion_room_blocks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('diversion_room_blocks', JSON.stringify(maintenanceBlocks));
  }, [maintenanceBlocks]);

  // Extra charges persistence
  const [extraCharges, setExtraCharges] = useState<FrontDeskExtraCharge[]>(() => {
    try {
      const saved = localStorage.getItem('diversion_folio_charges');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('diversion_folio_charges', JSON.stringify(extraCharges));
  }, [extraCharges]);

  // Modals & Active Selections
  const [selectedBookingModal, setSelectedBookingModal] = useState<BookingRecord | null>(null);
  const [viewingCheckInDetailsBooking, setViewingCheckInDetailsBooking] = useState<BookingRecord | null>(null);
  const [isEditingBookingDetails, setIsEditingBookingDetails] = useState(false);
  const [isDeletingBookingConfirm, setIsDeletingBookingConfirm] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState<{ room: RoomUnit; dateStr: string } | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<BookingRecord | null>(null);
  const [checkOutTarget, setCheckOutTarget] = useState<BookingRecord | null>(null);
  const [newBlockModal, setNewBlockModal] = useState<{ roomId: string; dateStr: string } | null>(null);
  const [blockReason, setBlockReason] = useState('Deep cleaning & AC Maintenance');
  const [blockDays, setBlockDays] = useState(1);

  // Check-In Form States
  const [idTypeProvided, setIdTypeProvided] = useState('Driver License / PhilID');
  const [depositCollected, setDepositCollected] = useState(1000);
  const [checkInNotes, setCheckInNotes] = useState('');

  // Check-Out Form States
  const [inspectionResult, setInspectionResult] = useState<'clear' | 'damage_found'>('clear');
  const [depositRefunded, setDepositRefunded] = useState(true);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('gcash');
  const [checkOutNotes, setCheckOutNotes] = useState('');

  // Cashier Folio state
  const [selectedFolioBooking, setSelectedFolioBooking] = useState<BookingRecord | null>(null);
  const [newChargeDescription, setNewChargeDescription] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState<number>(150);

  // Search in sub-views
  const [opsSearch, setOpsSearch] = useState('');

  // Helper date calculations
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Generate date columns for calendar (15 days or 30 days)
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const count = calendarViewMode === '15days' ? 15 : 30;
    const start = new Date(calendarBaseDate);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [calendarBaseDate, calendarViewMode]);

  // Navigate calendar by 15 days
  const handlePrevDays = () => {
    const step = calendarViewMode === '15days' ? 15 : 30;
    const next = new Date(calendarBaseDate);
    next.setDate(next.getDate() - step);
    setCalendarBaseDate(next);
  };

  const handleNextDays = () => {
    const step = calendarViewMode === '15days' ? 15 : 30;
    const next = new Date(calendarBaseDate);
    next.setDate(next.getDate() + step);
    setCalendarBaseDate(next);
  };

  const handleToday = () => {
    setCalendarBaseDate(new Date());
  };

  // Fast matching booking for room and date
  const getBookingForRoomAndDate = (roomId: string, date: Date): BookingRecord | undefined => {
    const dStr = date.toISOString().split('T')[0];
    return bookings.find(b => {
      if (b.roomId !== roomId && !b.roomTitle.toLowerCase().includes(roomId.toLowerCase())) return false;
      if (b.status === 'Cancelled') return false;

      if (b.stayType === 'hourly') {
        return b.hourlyDate === dStr;
      }
      if (b.checkInDate && b.checkOutDate) {
        return dStr >= b.checkInDate && dStr < b.checkOutDate;
      }
      return false;
    });
  };

  // Check if room is blocked for maintenance on date
  const getBlockForRoomAndDate = (roomId: string, date: Date): RoomMaintenanceBlock | undefined => {
    const dStr = date.toISOString().split('T')[0];
    return maintenanceBlocks.find(b => {
      return b.roomId === roomId && dStr >= b.startDate && dStr <= b.endDate;
    });
  };

  // Today's Arrivals (Check-in list)
  const todayArrivals = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'Cancelled' || b.status === 'Completed') return false;
      if (b.stayType === 'hourly') return b.hourlyDate === todayStr;
      return b.checkInDate === todayStr;
    });
  }, [bookings, todayStr]);

  // Today's Departures (Check-out list)
  const todayDepartures = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'Cancelled' || b.status === 'Completed') return false;
      if (b.stayType === 'hourly') return b.hourlyDate === todayStr && b.status === 'Checked-In';
      return b.checkOutDate === todayStr;
    });
  }, [bookings, todayStr]);

  // Current In-House Guests
  const inHouseGuests = useMemo(() => {
    return bookings.filter(b => b.status === 'Checked-In');
  }, [bookings]);

  // Operational KPIs & Night Audit summary
  const auditMetrics = useMemo(() => {
    const totalRooms = rooms.length;
    const occupiedCount = inHouseGuests.length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
    
    let todayRevenue = 0;
    bookings.forEach(b => {
      if (b.status !== 'Cancelled') {
        if (b.createdAt.startsWith(todayStr)) {
          todayRevenue += b.amountPaidNow;
        }
      }
    });

    const pendingBalances = bookings
      .filter(b => b.status === 'Confirmed' || b.status === 'Checked-In')
      .reduce((sum, b) => sum + (b.remainingBalance || 0), 0);

    const dirtyRoomsCount = Object.values(housekeepingState).filter(h => h.status === 'dirty' || h.status === 'cleaning').length;
    const maintenanceCount = maintenanceBlocks.length;

    return {
      totalRooms,
      occupiedCount,
      vacantCount: Math.max(0, totalRooms - occupiedCount - maintenanceCount),
      occupancyRate,
      todayRevenue,
      pendingBalances,
      dirtyRoomsCount,
      maintenanceCount,
      arrivalsCount: todayArrivals.length,
      departuresCount: todayDepartures.length,
    };
  }, [rooms, inHouseGuests, bookings, todayStr, housekeepingState, maintenanceBlocks, todayArrivals, todayDepartures]);

  // Toggle housekeeping status
  const handleUpdateHousekeeping = (roomId: string, newStatus: HousekeepingStatus, notes?: string) => {
    setHousekeepingState(prev => ({
      ...prev,
      [roomId]: {
        status: newStatus,
        notes: notes || prev[roomId]?.notes || 'Updated by Front Desk',
        lastUpdated: new Date().toISOString(),
      }
    }));
  };

  // Perform 1-Click Guest Check-In
  const handleExecuteCheckIn = () => {
    if (!checkInTarget) return;
    const note = `[CHECK-IN by ${currentStaffName} at ${new Date().toLocaleTimeString()}]: ID: ${idTypeProvided}, Balance: ₱${checkInTarget.remainingBalance.toLocaleString()}, Security Dep: ₱${depositCollected}. ${checkInNotes}`;
    onUpdateBookingStatus(checkInTarget.id, 'Checked-In', note);
    if (checkInTarget.roomId) {
      handleUpdateHousekeeping(checkInTarget.roomId, 'clean', `In-House Guest: ${checkInTarget.guestName}`);
    }
    setCheckInTarget(null);
    setCheckInNotes('');
  };

  // Perform 1-Click Guest Check-Out
  const handleExecuteCheckOut = () => {
    if (!checkOutTarget) return;
    const note = `[CHECK-OUT by ${currentStaffName} at ${new Date().toLocaleTimeString()}]: Inspection: ${inspectionResult}, Deposit Refunded: ${depositRefunded ? 'Yes' : 'No'}, Paid via: ${settleMethod}. ${checkOutNotes}`;
    onUpdateBookingStatus(checkOutTarget.id, 'Completed', note);
    if (checkOutTarget.roomId) {
      handleUpdateHousekeeping(checkOutTarget.roomId, 'dirty', `Checked out by ${checkOutTarget.guestName}. Turnover required.`);
    }
    setCheckOutTarget(null);
    setCheckOutNotes('');
  };

  // Add Room Maintenance Block
  const handleCreateBlock = () => {
    if (!newBlockModal) return;
    const start = new Date(newBlockModal.dateStr);
    const end = new Date(start);
    end.setDate(start.getDate() + Math.max(1, blockDays) - 1);
    
    const targetRoom = rooms.find(r => r.id === newBlockModal.roomId);
    const newBlock: RoomMaintenanceBlock = {
      id: 'BLK-' + Date.now(),
      roomId: newBlockModal.roomId,
      roomTitle: targetRoom?.title || newBlockModal.roomId,
      startDate: newBlockModal.dateStr,
      endDate: end.toISOString().split('T')[0],
      reason: blockReason,
      blockedBy: currentStaffName,
      createdAt: new Date().toISOString(),
    };

    setMaintenanceBlocks(prev => [...prev, newBlock]);
    handleUpdateHousekeeping(newBlockModal.roomId, 'maintenance', `Blocked: ${blockReason}`);
    setNewBlockModal(null);
    setBlockReason('Deep cleaning & AC Maintenance');
  };

  // Remove block
  const handleRemoveBlock = (blockId: string, roomId: string) => {
    setMaintenanceBlocks(prev => prev.filter(b => b.id !== blockId));
    handleUpdateHousekeeping(roomId, 'clean', 'Maintenance completed. Ready for guests.');
  };

  // Add extra charge to folio
  const handleAddFolioCharge = () => {
    if (!selectedFolioBooking || !newChargeDescription.trim()) return;
    const charge: FrontDeskExtraCharge = {
      id: 'CHG-' + Date.now(),
      bookingId: selectedFolioBooking.id,
      description: newChargeDescription.trim(),
      amount: Number(newChargeAmount) || 0,
      addedAt: new Date().toISOString(),
      addedBy: currentStaffName,
    };
    setExtraCharges(prev => [...prev, charge]);
    setNewChargeDescription('');
    setNewChargeAmount(150);
  };

  // Total charges for selected booking
  const bookingCharges = useMemo(() => {
    if (!selectedFolioBooking) return [];
    return extraCharges.filter(c => c.bookingId === selectedFolioBooking.id);
  }, [selectedFolioBooking, extraCharges]);

  const bookingExtraChargesTotal = useMemo(() => {
    return bookingCharges.reduce((sum, c) => sum + c.amount, 0);
  }, [bookingCharges]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Front Desk Master Header & Subtabs */}
      <div className="bg-gradient-to-br from-[#1C120B] via-[#2A1B12] to-[#1C120B] rounded-3xl p-5 sm:p-7 text-white shadow-2xl border border-[#D4AF37]/50 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#D4AF37]/30 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/20 text-[#F9E8B2] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-[#D4AF37]/40">
              <Building2 className="w-3.5 h-3.5 text-[#E5C158]" />
              <span>Front Desk Operations &amp; Room Management</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400">
              Front Desk Command Center
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Real-time room availability matrix, rapid guest check-in/out desk, housekeeping status board, cashiering folios, and daily night audit.
            </p>
          </div>

          {/* Quick Stat Pill Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-black/40 border border-amber-500/40 rounded-2xl px-3.5 py-2 text-left backdrop-blur-md">
              <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-wider">Occupancy</div>
              <div className="text-lg font-serif font-black text-amber-200">
                {auditMetrics.occupancyRate}% <span className="text-xs font-sans text-stone-400 font-normal">({auditMetrics.occupiedCount}/{auditMetrics.totalRooms})</span>
              </div>
            </div>

            <div className="bg-black/40 border border-emerald-500/40 rounded-2xl px-3.5 py-2 text-left backdrop-blur-md">
              <div className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider">Arrivals Today</div>
              <div className="text-lg font-serif font-black text-emerald-300">
                {auditMetrics.arrivalsCount} <span className="text-xs font-sans text-stone-400 font-normal">Guests</span>
              </div>
            </div>

            <div className="bg-black/40 border border-sky-500/40 rounded-2xl px-3.5 py-2 text-left backdrop-blur-md">
              <div className="text-[10px] text-sky-300/80 font-bold uppercase tracking-wider">Departures Today</div>
              <div className="text-lg font-serif font-black text-sky-300">
                {auditMetrics.departuresCount} <span className="text-xs font-sans text-stone-400 font-normal">Guests</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 no-scrollbar">
          <button
            onClick={() => setOpsSubTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              opsSubTab === 'calendar'
                ? 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-stone-950 shadow-lg shadow-amber-500/20 font-black'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Room Availability Matrix</span>
          </button>

          <button
            onClick={() => setOpsSubTab('arrivals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              opsSubTab === 'arrivals'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Today's Check-Ins ({todayArrivals.length})</span>
          </button>

          <button
            onClick={() => setOpsSubTab('departures')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              opsSubTab === 'departures'
                ? 'bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Today's Check-Outs ({todayDepartures.length})</span>
          </button>

          <button
            onClick={() => setOpsSubTab('inhouse')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              opsSubTab === 'inhouse'
                ? 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-stone-950 shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>In-House Guests ({inHouseGuests.length})</span>
          </button>

          <button
            onClick={() => setOpsSubTab('housekeeping')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              opsSubTab === 'housekeeping'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Housekeeping Board</span>
            {auditMetrics.dirtyRoomsCount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                {auditMetrics.dirtyRoomsCount} Dirty
              </span>
            )}
          </button>

          <button
            onClick={() => setOpsSubTab('cashier')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              opsSubTab === 'cashier'
                ? 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-stone-950 shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Folio &amp; Cashiering</span>
          </button>

          <button
            onClick={() => setOpsSubTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              opsSubTab === 'audit'
                ? 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-stone-950 shadow-lg font-black'
                : 'bg-white/10 hover:bg-white/15 text-stone-200 border border-white/10'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Daily Run &amp; Audit</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CALENDAR AVAILABILITY MATRIX */}
      {opsSubTab === 'calendar' && (
        <div className="bg-white rounded-3xl border border-[#E6D7C3]/70 shadow-xl p-5 sm:p-7 space-y-6">
          {/* Calendar Controls Toolbar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#E6D7C3]/60 pb-5">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quick Jump Navigator */}
              <div className="flex items-center gap-1 bg-[#F9F5F0] p-1 rounded-2xl border border-[#E6D7C3]">
                <button
                  type="button"
                  onClick={handlePrevDays}
                  className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white rounded-xl text-[#2C1E15] text-xs font-bold transition-all cursor-pointer"
                  title="View Previous 15 Days"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev 15 Days</span>
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 bg-white hover:bg-amber-50 text-[#2C1E15] text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer border border-[#E6D7C3]/40"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextDays}
                  className="group flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B] hover:brightness-110 text-stone-950 text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer"
                  title="View Next 15 Days"
                >
                  <span>Next 15 Days</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Active Date Span Range */}
              <div className="text-xs sm:text-sm font-extrabold text-[#2C1E15] px-2 py-1 bg-amber-50/70 rounded-xl border border-amber-200/60">
                <span className="text-amber-800 font-bold uppercase text-[10px] block sm:inline sm:mr-1.5">
                  {calendarViewMode === '15days' ? '15 Days Window:' : '30 Days Window:'}
                </span>
                {calendarDates[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} —{' '}
                {calendarDates[calendarDates.length - 1]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>

              {/* View Switcher: 15-day vs 30-day */}
              <div className="flex items-center bg-[#F9F5F0] p-1 rounded-2xl border border-[#E6D7C3] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('15days')}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    calendarViewMode === '15days' ? 'bg-[#2C1E15] text-white shadow-xs' : 'text-[#786150] hover:text-[#2C1E15]'
                  }`}
                >
                  15 Days View
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('month')}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                    calendarViewMode === 'month' ? 'bg-[#2C1E15] text-white shadow-xs' : 'text-[#786150] hover:text-[#2C1E15]'
                  }`}
                >
                  30 Days View
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#786150]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block shadow-xs" /> Confirmed / In-House
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block shadow-xs" /> Pending Review
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-600 inline-block shadow-xs" /> Blocked / Maintenance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-stone-100 border border-stone-300 inline-block" /> Available
              </span>
            </div>
          </div>

          {/* Room Availability Matrix Grid */}
          <div className="overflow-x-auto border border-[#E6D7C3] rounded-2xl shadow-sm bg-white">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#2C1E15] text-white text-xs font-bold divide-x divide-white/10">
                  <th className="p-3 w-56 sticky left-0 z-20 bg-[#2C1E15] shadow-md">Accommodation Unit</th>
                  <th className="p-3 w-28 text-center text-[11px]">Readiness</th>
                  {calendarDates.map((date, idx) => {
                    const isToday = date.toISOString().split('T')[0] === todayStr;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <th
                        key={idx}
                        className={`p-2 text-center min-w-[48px] text-[11px] ${
                          isToday ? 'bg-[#D4AF37] text-[#1C120B] font-black' : isWeekend ? 'bg-[#3A281C]' : ''
                        }`}
                      >
                        <div className="uppercase text-[9px] opacity-80">
                          {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </div>
                        <div>{date.getDate()}</div>
                      </th>
                    );
                  })}
                  {/* Next 15 Days Quick Header Button */}
                  <th className="p-2 text-center w-12 bg-[#2C1E15]" title="Jump to Next 15 Days">
                    <button
                      type="button"
                      onClick={handleNextDays}
                      className="p-1.5 bg-[#D4AF37] hover:bg-[#F9E8B2] text-stone-950 rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center justify-center group"
                      title="Next 15 Days"
                      aria-label="Next 15 Days"
                    >
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D7C3]/60 text-xs">
                {rooms.map((room) => {
                  const roomHousekeeping = housekeepingState[room.id] || { status: 'clean', notes: '' };

                  return (
                    <tr key={room.id} className="hover:bg-[#FAF7F2] transition-colors divide-x divide-[#E6D7C3]/40">
                      {/* Room Details Row Header (Sticky) */}
                      <td className="p-3 sticky left-0 bg-white z-10 shadow-sm">
                        <div className="font-extrabold text-[#2C1E15] text-xs leading-snug">{room.title}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#786150] mt-0.5">
                          <span className="font-semibold text-amber-800">₱{room.pricing.nightly.toLocaleString()}/nt</span>
                          <span>•</span>
                          <span>Max {room.capacity.maxGuests} pax</span>
                        </div>
                      </td>

                      {/* Housekeeping Quick Badge */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus: Record<HousekeepingStatus, HousekeepingStatus> = {
                              clean: 'dirty',
                              dirty: 'cleaning',
                              cleaning: 'clean',
                              maintenance: 'clean',
                              dnd: 'clean'
                            };
                            handleUpdateHousekeeping(room.id, nextStatus[roomHousekeeping.status]);
                          }}
                          className={`text-[9.5px] font-black px-2 py-1 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs ${
                            roomHousekeeping.status === 'clean'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : roomHousekeeping.status === 'dirty'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                              : roomHousekeeping.status === 'cleaning'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                          title="Click to toggle readiness state"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            roomHousekeeping.status === 'clean' ? 'bg-emerald-500' :
                            roomHousekeeping.status === 'dirty' ? 'bg-amber-500' :
                            roomHousekeeping.status === 'cleaning' ? 'bg-sky-500' : 'bg-rose-500'
                          }`} />
                          <span className="uppercase">{roomHousekeeping.status}</span>
                        </button>
                      </td>

                      {/* Days Slots */}
                      {calendarDates.map((date, idx) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const booking = getBookingForRoomAndDate(room.id, date);
                        const block = getBlockForRoomAndDate(room.id, date);
                        const isToday = dateStr === todayStr;

                        if (booking) {
                          const isConfirmed = booking.status === 'Confirmed' || booking.status === 'Checked-In';
                          const isPending = booking.status === 'Pending Slip Review';

                          return (
                            <td
                              key={idx}
                              onClick={() => setSelectedBookingModal(booking)}
                              className={`p-1 text-center cursor-pointer transition-all hover:scale-105 hover:ring-2 hover:ring-amber-400 hover:z-10 relative select-none ${
                                isConfirmed
                                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold shadow-xs'
                                  : isPending
                                  ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold shadow-xs'
                                  : 'bg-stone-500 text-white'
                              }`}
                              title={`Click guest name ${booking.guestName} to pull up complete details & features card (${booking.id})`}
                              aria-label={`View complete details for guest ${booking.guestName}`}
                            >
                              <div className="text-[10px] leading-tight truncate px-1 font-black hover:underline tracking-tight">
                                {booking.guestName.split(' ')[0]}
                              </div>
                              <div className="text-[8px] opacity-90 truncate font-mono">
                                {booking.status === 'Checked-In' ? '🔑 In-House' : booking.id.slice(-4)}
                              </div>
                            </td>
                          );
                        }

                        if (block) {
                          return (
                            <td
                              key={idx}
                              onClick={() => handleRemoveBlock(block.id, room.id)}
                              className="p-1 text-center bg-rose-600 text-white cursor-pointer hover:bg-rose-700"
                              title={`Blocked: ${block.reason} • Click to Unblock`}
                            >
                              <div className="flex items-center justify-center">
                                <Lock className="w-3 h-3 text-white" />
                              </div>
                              <div className="text-[8px] truncate font-bold">Blocked</div>
                            </td>
                          );
                        }

                        // Empty Available Slot
                        return (
                          <td
                            key={idx}
                            onClick={() => setSelectedCellInfo({ room, dateStr })}
                            className={`p-1 text-center hover:bg-amber-100/80 cursor-pointer transition-colors group relative ${
                              isToday ? 'bg-amber-50/50' : ''
                            }`}
                            title={`Available on ${dateStr} • Click to Book / Block`}
                          >
                            <div className="text-[10px] text-stone-300 group-hover:text-amber-800 font-bold">
                              +
                            </div>
                          </td>
                        );
                      })}
                      {/* Quick Next 15 Days Advance Cell */}
                      <td
                        onClick={handleNextDays}
                        className="p-1 text-center bg-[#FAF7F2]/60 hover:bg-amber-100 cursor-pointer transition-colors group"
                        title="Click to advance to next 15 days"
                      >
                        <ChevronRight className="w-3.5 h-3.5 mx-auto text-amber-700/60 group-hover:text-amber-950 group-hover:translate-x-0.5 transition-transform" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-[#786150] flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E6D7C3]/60">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Click any reservation block to open quick actions (Check-in, Check-out, Folio, Voucher).</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Click any empty date slot to create instant Walk-in reservation or set Maintenance Block.</span>
              </span>
            </div>

            {/* Quick 15 Days Jump Action in Footer */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDays}
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-amber-50 text-[#2C1E15] font-bold text-xs rounded-xl border border-[#E6D7C3] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Prev 15 Days</span>
              </button>
              <button
                type="button"
                onClick={handleNextDays}
                className="group flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B] hover:brightness-110 text-stone-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>Next 15 Days</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TODAY'S ARRIVALS / CHECK-IN DESK */}
      {opsSubTab === 'arrivals' && (
        <div className="bg-white rounded-3xl border border-[#E6D7C3]/70 shadow-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6D7C3]/60 pb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2C1E15] flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-600" />
                <span>Today's Expected Arrivals ({todayArrivals.length})</span>
              </h3>
              <p className="text-xs text-[#786150] mt-1">
                Fast check-in registration, ID verification, balance due reminders, and deposit log.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search guest or Ref #..."
                value={opsSearch}
                onChange={(e) => setOpsSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {todayArrivals.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E6D7C3]">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <div className="text-base font-bold text-[#2C1E15]">No more pending arrivals for today!</div>
              <div className="text-xs text-[#786150] mt-1">All guests for today are checked in or no new check-ins scheduled.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayArrivals
                .filter(b => !opsSearch || b.guestName.toLowerCase().includes(opsSearch.toLowerCase()) || b.id.toLowerCase().includes(opsSearch.toLowerCase()))
                .map(booking => (
                  <div key={booking.id} className="bg-[#FAF7F2] border border-[#E6D7C3] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 hover:border-emerald-500/50 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono font-bold text-amber-800">{booking.id}</div>
                        <h4 className="text-lg font-serif font-black text-[#2C1E15]">{booking.guestName}</h4>
                        <div className="text-xs text-[#786150] font-medium">{booking.guestPhone} • {booking.guestEmail || 'No Email'}</div>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        booking.status === 'Checked-In'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-[#E6D7C3]/60 text-xs">
                      <div>
                        <span className="text-[#786150] block text-[10px] uppercase font-bold">Room</span>
                        <span className="font-bold text-[#2C1E15]">{booking.roomTitle}</span>
                      </div>
                      <div>
                        <span className="text-[#786150] block text-[10px] uppercase font-bold">Pax &amp; Nights</span>
                        <span className="font-bold text-[#2C1E15]">{booking.adultGuests + booking.childGuests} Guests • {booking.numberOfNights || 1} Night(s)</span>
                      </div>
                      <div>
                        <span className="text-[#786150] block text-[10px] uppercase font-bold">Total Stay</span>
                        <span className="font-bold text-[#2C1E15]">₱{booking.grandTotal.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[#786150] block text-[10px] uppercase font-bold">Balance Due</span>
                        <span className={`font-black ${booking.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {booking.remainingBalance > 0 ? `₱${booking.remainingBalance.toLocaleString()}` : 'Fully Settled ✓'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenVoucher(booking)}
                        className="px-3 py-2 bg-white hover:bg-stone-100 text-[#2C1E15] border border-[#E6D7C3] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Voucher</span>
                      </button>

                      {booking.status !== 'Checked-In' ? (
                        <button
                          type="button"
                          onClick={() => setCheckInTarget(booking)}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Check In Guest Now</span>
                        </button>
                      ) : (
                        <div className="flex-1 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold text-center">
                          ✓ Guest Already Checked-In
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: TODAY'S DEPARTURES / CHECK-OUT DESK */}
      {opsSubTab === 'departures' && (
        <div className="bg-white rounded-3xl border border-[#E6D7C3]/70 shadow-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6D7C3]/60 pb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2C1E15] flex items-center gap-2">
                <LogOut className="w-6 h-6 text-sky-600" />
                <span>Today's Expected Check-Outs ({todayDepartures.length})</span>
              </h3>
              <p className="text-xs text-[#786150] mt-1">
                Express check-out cashiering, final folio balance settlement, key return, and automatic room turnover flagging.
              </p>
            </div>
          </div>

          {todayDepartures.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E6D7C3]">
              <CheckCircle2 className="w-10 h-10 text-sky-600 mx-auto mb-2" />
              <div className="text-base font-bold text-[#2C1E15]">No departures scheduled for today.</div>
              <div className="text-xs text-[#786150] mt-1">All departing guests have checked out or have upcoming dates.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayDepartures.map(booking => (
                <div key={booking.id} className="bg-[#FAF7F2] border border-[#E6D7C3] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 hover:border-sky-500/50 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono font-bold text-amber-800">{booking.id}</div>
                      <h4 className="text-lg font-serif font-black text-[#2C1E15]">{booking.guestName}</h4>
                      <div className="text-xs text-[#786150] font-medium">{booking.roomTitle}</div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 uppercase">
                      Departing Today
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-[#E6D7C3]/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#786150] block text-[10px] uppercase font-bold">Remaining Balance</span>
                      <span className={`text-base font-black ${booking.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {booking.remainingBalance > 0 ? `₱${booking.remainingBalance.toLocaleString()}` : 'Fully Paid ✓'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFolioBooking(booking);
                        setOpsSubTab('cashier');
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#8B6B10] border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      View Folio
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCheckOutTarget(booking)}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Process Express Check-Out</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: IN-HOUSE GUESTS BOARD */}
      {opsSubTab === 'inhouse' && (
        <div className="bg-white rounded-3xl border border-[#E6D7C3]/70 shadow-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6D7C3]/60 pb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2C1E15] flex items-center gap-2">
                <Users className="w-6 h-6 text-[#D4AF37]" />
                <span>Current In-House Resident Guests ({inHouseGuests.length})</span>
              </h3>
              <p className="text-xs text-[#786150] mt-1">
                Active staying guests currently checked into Diversion Vigan Resort rooms.
              </p>
            </div>
          </div>

          {inHouseGuests.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E6D7C3]">
              <Users className="w-10 h-10 text-[#786150] mx-auto mb-2" />
              <div className="text-base font-bold text-[#2C1E15]">No in-house guests currently checked in.</div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E6D7C3] rounded-2xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#2C1E15] text-white font-bold">
                    <th className="p-3">Ref ID</th>
                    <th className="p-3">Guest Name</th>
                    <th className="p-3">Assigned Room</th>
                    <th className="p-3">Stay Period</th>
                    <th className="p-3">Pax</th>
                    <th className="p-3">Balance</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D7C3]/60">
                  {inHouseGuests.map(booking => (
                    <tr key={booking.id} className="hover:bg-[#FAF7F2] transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-800">{booking.id}</td>
                      <td className="p-3">
                        <div className="font-bold text-[#2C1E15]">{booking.guestName}</div>
                        <div className="text-[10px] text-[#786150]">{booking.guestPhone}</div>
                      </td>
                      <td className="p-3 font-semibold text-[#2C1E15]">{booking.roomTitle}</td>
                      <td className="p-3 text-[#786150]">
                        {booking.stayType === 'hourly'
                          ? `${booking.hourlyDate} (${booking.hourlyDurationHours}h)`
                          : `${booking.checkInDate} → ${booking.checkOutDate}`}
                      </td>
                      <td className="p-3 font-bold">{booking.adultGuests + booking.childGuests} Pax</td>
                      <td className="p-3">
                        <span className={`font-black ${booking.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {booking.remainingBalance > 0 ? `₱${booking.remainingBalance.toLocaleString()}` : 'Paid ✓'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFolioBooking(booking);
                            setOpsSubTab('cashier');
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Folio
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckOutTarget(booking)}
                          className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Check Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 5: HOUSEKEEPING & ROOM READINESS BOARD */}
      {opsSubTab === 'housekeeping' && (
        <div className="bg-white rounded-3xl border border-[#E6D7C3]/70 shadow-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6D7C3]/60 pb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2C1E15] flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
                <span>Housekeeping &amp; Room Readiness Management</span>
              </h3>
              <p className="text-xs text-[#786150] mt-1">
                Monitor and update live cleaning readiness across all {rooms.length} accommodation units.
              </p>
            </div>

            {/* Quick Bulk Action */}
            <button
              type="button"
              onClick={() => {
                const updated: Record<string, { status: HousekeepingStatus; notes: string; lastUpdated: string }> = {};
                rooms.forEach(r => {
                  updated[r.id] = { status: 'clean', notes: 'Bulk marked Clean & Ready', lastUpdated: new Date().toISOString() };
                });
                setHousekeepingState(updated);
              }}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Mark All Clean</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => {
              const hs = housekeepingState[room.id] || { status: 'clean', notes: 'Ready', lastUpdated: new Date().toISOString() };

              return (
                <div key={room.id} className="bg-[#FAF7F2] border border-[#E6D7C3] rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-serif font-black text-base text-[#2C1E15]">{room.title}</h4>
                      <div className="text-[11px] text-[#786150]">{room.category} • Max {room.capacity.maxGuests} Pax</div>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                      hs.status === 'clean' ? 'bg-emerald-100 text-emerald-800' :
                      hs.status === 'dirty' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      hs.status === 'cleaning' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {hs.status}
                    </span>
                  </div>

                  <div className="text-xs text-[#523A2A] bg-white p-2.5 rounded-xl border border-[#E6D7C3]/60 italic">
                    "{hs.notes || 'No housekeeping notes'}"
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateHousekeeping(room.id, 'clean', 'Cleaned & inspected for guest arrival')}
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        hs.status === 'clean' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      Clean
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateHousekeeping(room.id, 'cleaning', 'Cleaning in progress by housekeeping')}
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        hs.status === 'cleaning' ? 'bg-sky-600 text-white shadow-xs' : 'bg-sky-50 text-sky-800 border border-sky-200'
                      }`}
                    >
                      In-Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateHousekeeping(room.id, 'dirty', 'Needs housekeeping turnover')}
                      className={`py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        hs.status === 'dirty' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      Dirty
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 6: FOLIO & CASHIERING */}
      {opsSubTab === 'cashier' && (
        <div className="bg-white rounded-3xl border border-[#E6D7C3]/70 shadow-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6D7C3]/60 pb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2C1E15] flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-[#D4AF37]" />
                <span>Front Desk Folio &amp; Cashiering Billing</span>
              </h3>
              <p className="text-xs text-[#786150] mt-1">
                Post incidentals, room service, minibar, late check-out fees, and record cash/GCash settlements.
              </p>
            </div>

            {/* Selector for active reservation folio */}
            <div className="w-full sm:w-72">
              <select
                value={selectedFolioBooking?.id || ''}
                onChange={(e) => {
                  const b = bookings.find(item => item.id === e.target.value);
                  setSelectedFolioBooking(b || null);
                }}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl text-xs font-bold text-[#2C1E15] focus:ring-2 focus:ring-amber-500 outline-hidden"
              >
                <option value="">Select Guest Reservation Folio...</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.guestName} ({b.id}) - {b.roomTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedFolioBooking ? (
            <div className="text-center py-12 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E6D7C3]">
              <DollarSign className="w-10 h-10 text-amber-700 mx-auto mb-2" />
              <div className="text-base font-bold text-[#2C1E15]">Select a guest reservation to manage folio charges</div>
              <div className="text-xs text-[#786150] mt-1">Choose from the dropdown above or click "Folio" on any reservation.</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Guest Folio Header */}
              <div className="bg-gradient-to-r from-[#2C1E15] to-[#4A3222] text-white p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-amber-300 font-bold">{selectedFolioBooking.id}</div>
                  <h4 className="text-2xl font-serif font-bold text-amber-100">{selectedFolioBooking.guestName}</h4>
                  <div className="text-xs text-stone-300">{selectedFolioBooking.roomTitle} • {selectedFolioBooking.guestPhone}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-stone-300 uppercase font-bold">Total Bill (Stay + Extras)</div>
                    <div className="text-2xl font-serif font-black text-amber-300">
                      ₱{(selectedFolioBooking.grandTotal + bookingExtraChargesTotal).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Incidental Charge Form */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3] space-y-3">
                <h5 className="text-xs font-black uppercase text-[#2C1E15] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Post New Room Incidental Charge</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Charge description (e.g. San Mig Beer 2x, Extra Bed)"
                    value={newChargeDescription}
                    onChange={(e) => setNewChargeDescription(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 bg-white border border-[#E6D7C3] rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">₱</span>
                    <input
                      type="number"
                      placeholder="Amount"
                      value={newChargeAmount}
                      onChange={(e) => setNewChargeAmount(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-[#E6D7C3] rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFolioCharge}
                    className="py-2 bg-[#2C1E15] hover:bg-[#4A3222] text-amber-200 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    + Add Charge to Bill
                  </button>
                </div>
              </div>

              {/* Charges Breakdown Table */}
              <div className="border border-[#E6D7C3] rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2C1E15] text-white">
                    <tr>
                      <th className="p-3">Item / Service Description</th>
                      <th className="p-3">Posted By</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D7C3]/60">
                    <tr>
                      <td className="p-3 font-bold text-[#2C1E15]">Room Accommodation Base Stay</td>
                      <td className="p-3 text-[#786150]">Online Booking</td>
                      <td className="p-3 text-right font-black">₱{selectedFolioBooking.baseStayTotal.toLocaleString()}</td>
                    </tr>
                    {bookingCharges.map(chg => (
                      <tr key={chg.id} className="hover:bg-[#FAF7F2]">
                        <td className="p-3 font-semibold text-[#2C1E15]">{chg.description}</td>
                        <td className="p-3 text-[#786150]">{chg.addedBy}</td>
                        <td className="p-3 text-right font-bold text-[#2C1E15]">₱{chg.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAF7F2] font-black border-t border-[#E6D7C3]">
                    <tr>
                      <td colSpan={2} className="p-3 text-right uppercase">Deposit / Prepayment Paid:</td>
                      <td className="p-3 text-right text-emerald-700">- ₱{selectedFolioBooking.amountPaidNow.toLocaleString()}</td>
                    </tr>
                    <tr className="text-sm bg-amber-50 text-amber-950">
                      <td colSpan={2} className="p-3 text-right uppercase font-extrabold">Final Balance Due:</td>
                      <td className="p-3 text-right font-black text-rose-700">
                        ₱{Math.max(0, (selectedFolioBooking.grandTotal + bookingExtraChargesTotal) - selectedFolioBooking.amountPaidNow).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 7: NIGHT AUDIT & DAILY RUN SUMMARY */}
      {opsSubTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-[#E6D7C3]/70 shadow-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E6D7C3]/60 pb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-black text-[#2C1E15] flex items-center gap-2">
                <Printer className="w-6 h-6 text-[#D4AF37]" />
                <span>Daily Night Audit &amp; Handover Summary</span>
              </h3>
              <p className="text-xs text-[#786150] mt-1">
                Official daily balance close, room statistics, and front desk cashier reconciliation for {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-[#2C1E15] hover:bg-[#4A3222] text-amber-300 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Daily Audit Report</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3] space-y-1">
              <span className="text-[10px] text-[#786150] uppercase font-bold">Occupancy Rate</span>
              <div className="text-2xl font-serif font-bold text-[#2C1E15]">{auditMetrics.occupancyRate}%</div>
              <div className="text-[10px] text-[#786150]">{auditMetrics.occupiedCount} Occupied / {auditMetrics.vacantCount} Vacant</div>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3] space-y-1">
              <span className="text-[10px] text-[#786150] uppercase font-bold">Today's Collections</span>
              <div className="text-2xl font-serif font-bold text-emerald-700">₱{auditMetrics.todayRevenue.toLocaleString()}</div>
              <div className="text-[10px] text-[#786150]">Prepayments &amp; check-ins</div>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3] space-y-1">
              <span className="text-[10px] text-[#786150] uppercase font-bold">Unsettled Balances</span>
              <div className="text-2xl font-serif font-bold text-rose-700">₱{auditMetrics.pendingBalances.toLocaleString()}</div>
              <div className="text-[10px] text-[#786150]">Across all active reservations</div>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E6D7C3] space-y-1">
              <span className="text-[10px] text-[#786150] uppercase font-bold">Auditor on Duty</span>
              <div className="text-lg font-serif font-bold text-[#2C1E15]">{currentStaffName}</div>
              <div className="text-[10px] text-[#786150]">Session Verified ✓</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXPRESS CHECK-IN POPUP */}
      {checkInTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#D4AF37] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6D7C3] pb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                  Express Check-In
                </span>
                <h4 className="text-xl font-serif font-bold text-[#2C1E15] mt-1">{checkInTarget.guestName}</h4>
                <div className="text-xs text-[#786150]">{checkInTarget.roomTitle} • Ref #{checkInTarget.id}</div>
              </div>
              <button
                type="button"
                onClick={() => setCheckInTarget(null)}
                className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {checkInTarget.remainingBalance > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Balance Due Reminder</span>
                  </div>
                  <p className="text-[10px] text-amber-700 leading-tight">
                    This guest has a remaining balance of <strong className="text-amber-900 font-black">₱{checkInTarget.remainingBalance.toLocaleString()}</strong>. Please ensure the full payment is settled during this check-in process.
                  </p>
                </div>
              )}

              {checkInTarget.remainingBalance <= 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fully Paid</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-tight">
                    Guest has already settled all balances for this booking.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Guest Identification Document</label>
                <input
                  type="text"
                  value={idTypeProvided}
                  onChange={(e) => setIdTypeProvided(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Security Deposit Collected (PHP)</label>
                <input
                  type="number"
                  value={depositCollected}
                  onChange={(e) => setDepositCollected(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Staff Check-In Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Guest requested 2 extra pillows, car plate: ABC 1234"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckInTarget(null)}
                className="px-4 py-2 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCheckIn}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Check-In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXPRESS CHECK-OUT POPUP */}
      {checkOutTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sky-400 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6D7C3] pb-4">
              <div>
                <span className="text-[10px] font-bold text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded-md">
                  Express Check-Out
                </span>
                <h4 className="text-xl font-serif font-bold text-[#2C1E15] mt-1">{checkOutTarget.guestName}</h4>
                <div className="text-xs text-[#786150]">{checkOutTarget.roomTitle} • Balance: ₱{checkOutTarget.remainingBalance.toLocaleString()}</div>
              </div>
              <button
                type="button"
                onClick={() => setCheckOutTarget(null)}
                className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Room Inspection Status</label>
                <select
                  value={inspectionResult}
                  onChange={(e) => setInspectionResult(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl font-bold focus:ring-2 focus:ring-sky-500 outline-hidden"
                >
                  <option value="clear">✓ Clear - No damages or minibar issues</option>
                  <option value="damage_found">⚠️ Damage or Missing items reported</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Security Deposit Refund</label>
                <select
                  value={depositRefunded ? 'yes' : 'no'}
                  onChange={(e) => setDepositRefunded(e.target.value === 'yes')}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl font-bold focus:ring-2 focus:ring-sky-500 outline-hidden"
                >
                  <option value="yes">✓ Refund ₱1,000 Security Deposit to Guest</option>
                  <option value="no">Hold Deposit (Deductions applied)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Settlement Payment Method (If Balance Due)</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl font-bold focus:ring-2 focus:ring-sky-500 outline-hidden"
                >
                  <option value="gcash">GCash (Instant QR)</option>
                  <option value="front_desk">Cash at Front Desk</option>
                  <option value="card">Credit / Debit Card (Terminal)</option>
                  <option value="bdo">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Check-Out Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key returned, guest thanked for stay."
                  value={checkOutNotes}
                  onChange={(e) => setCheckOutNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckOutTarget(null)}
                className="px-4 py-2 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCheckOut}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Complete Check-Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLICKED AVAILABLE CELL QUICK ACTIONS */}
      {selectedCellInfo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#D4AF37] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6D7C3] pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase bg-amber-50 px-2 py-0.5 rounded-md">
                  Available Date Slot
                </span>
                <h4 className="text-xl font-serif font-bold text-[#2C1E15] mt-1">{selectedCellInfo.room.title}</h4>
                <div className="text-xs text-[#786150] font-semibold">{selectedCellInfo.dateStr}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCellInfo(null)}
                className="p-1 hover:bg-stone-100 rounded-xl text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (onQuickWalkinForDate) {
                    onQuickWalkinForDate(selectedCellInfo.room.id, selectedCellInfo.dateStr);
                  }
                  setSelectedCellInfo(null);
                }}
                className="w-full p-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Create Walk-In Reservation for Date</span>
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewBlockModal({ roomId: selectedCellInfo.room.id, dateStr: selectedCellInfo.dateStr });
                  setSelectedCellInfo(null);
                }}
                className="w-full p-3.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>Block Room (Maintenance / Hold)</span>
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE MAINTENANCE BLOCK */}
      {newBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-rose-400 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6D7C3] pb-3">
              <div>
                <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded-md">
                  Maintenance / Room Block
                </span>
                <h4 className="text-xl font-serif font-bold text-[#2C1E15] mt-1">Set Room Out of Order</h4>
                <div className="text-xs text-[#786150]">{newBlockModal.dateStr}</div>
              </div>
              <button
                type="button"
                onClick={() => setNewBlockModal(null)}
                className="p-1 hover:bg-stone-100 rounded-xl text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Reason for Block</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl font-bold focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C1E15] mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={blockDays}
                  onChange={(e) => setBlockDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E6D7C3] rounded-xl font-bold focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewBlockModal(null)}
                className="px-4 py-2 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBlock}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Confirm Block Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLICKED GUEST COMPLETE DETAILS & FEATURES POP-UP CARD */}
      {selectedBookingModal && (() => {
        const room = rooms.find(r => r.id === selectedBookingModal.roomId);
        const isNightly = selectedBookingModal.stayType === 'nightly';
        const isFullyPaid = selectedBookingModal.remainingBalance <= 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-[#D4AF37] shadow-2xl max-w-2xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Card Header */}
              <div className="bg-gradient-to-r from-[#2C1E15] via-[#3D291D] to-[#2C1E15] text-white p-5 sm:p-6 shrink-0 border-b border-[#D4AF37]/40 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-lg border border-amber-400/40">
                      {selectedBookingModal.id}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedBookingModal.status === 'Checked-In' 
                        ? 'bg-emerald-500 text-white shadow-xs' 
                        : selectedBookingModal.status === 'Confirmed' 
                        ? 'bg-amber-400 text-stone-950 font-black shadow-xs' 
                        : selectedBookingModal.status === 'Pending Slip Review'
                        ? 'bg-orange-500 text-white'
                        : selectedBookingModal.status === 'Cancelled'
                        ? 'bg-rose-600 text-white'
                        : 'bg-stone-300 text-stone-900'
                    }`}>
                      {selectedBookingModal.status === 'Checked-In' ? '🔑 In-House (Checked-In)' : selectedBookingModal.status}
                    </span>
                    <span className="text-[10px] font-medium text-stone-300">
                      Booked {new Date(selectedBookingModal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-amber-100 flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>{selectedBookingModal.guestName}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-300 pt-0.5">
                    <a 
                      href={`tel:${selectedBookingModal.guestPhone}`}
                      className="flex items-center gap-1 hover:text-amber-200 transition-colors font-medium"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>{selectedBookingModal.guestPhone}</span>
                    </a>
                    {selectedBookingModal.guestEmail && (
                      <a 
                        href={`mailto:${selectedBookingModal.guestEmail}`}
                        className="flex items-center gap-1 hover:text-amber-200 transition-colors font-medium"
                      >
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>{selectedBookingModal.guestEmail}</span>
                      </a>
                    )}
                    {selectedBookingModal.guestAddress && (
                      <span className="flex items-center gap-1 text-stone-400 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>{selectedBookingModal.guestAddress}</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBookingModal(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Close Card"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#2C1E15] bg-[#FCFAF7]">
                
                {/* 1. ROOM DETAILS & FEATURES PANEL */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E6D7C3] shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E6D7C3]/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-700" />
                      <h4 className="font-serif font-black text-sm text-[#2C1E15]">Accommodation Unit & Features</h4>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      {room?.category || 'Guest Accommodation'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    {room?.images && room.images.length > 0 && (
                      <img 
                        src={room.images[0]} 
                        alt={selectedBookingModal.roomTitle} 
                        className="w-full sm:w-28 h-24 sm:h-20 object-cover rounded-xl border border-[#E6D7C3] shrink-0 shadow-2xs" 
                      />
                    )}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-base font-serif font-bold text-[#2C1E15]">
                            {selectedBookingModal.roomTitle}
                          </div>
                          <div className="text-[11px] text-[#786150]">
                            {room?.subtitle || 'Standard & Deluxe Hotel Accommodation'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-amber-900">
                            ₱{room?.pricing?.nightly?.toLocaleString() || selectedBookingModal.baseRatePerUnit?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#786150] block">/ night</span>
                        </div>
                      </div>

                      {/* Room Spec Badges */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E6D7C3] flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate font-semibold">{room?.beds || 'Comfortable Beds'}</span>
                        </div>
                        <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E6D7C3] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="font-semibold">Max {room?.capacity?.maxGuests || 4} Pax</span>
                        </div>
                        <div className="p-2 bg-[#FAF7F2] rounded-xl border border-[#E6D7C3] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="font-semibold">{room?.sizeSqM ? `${room.sizeSqM} m²` : 'Spacious'}</span>
                        </div>
                      </div>

                      {/* Room Amenities & Features List */}
                      {room?.amenities && room.amenities.length > 0 && (
                        <div className="pt-2 border-t border-[#E6D7C3]/50">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#786150] mb-1.5">
                            Unit Features & Amenities
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {room.amenities.map((amenity, aIdx) => (
                              <span 
                                key={aIdx} 
                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#FAF7F2] text-[#523A2A] px-2 py-0.5 rounded-lg border border-[#E6D7C3]/80"
                              >
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{amenity}</span>
                              </span>
                            ))}
                            {(room.hasPool || room.category.includes('Villa')) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-800 px-2 py-0.5 rounded-lg border border-sky-200">
                                <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                                <span>Swimming Pool Access</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. STAY SCHEDULE & GUEST HEADCOUNT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="bg-white rounded-2xl p-4 border border-[#E6D7C3] shadow-xs space-y-2.5">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold border-b border-[#E6D7C3]/60 pb-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-amber-700" />
                      <span>Stay Schedule ({isNightly ? 'Nightly Stay' : 'Hourly Short Stay'})</span>
                    </div>

                    {isNightly ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-stone-100">
                          <span className="text-[#786150]">Check-In:</span>
                          <span className="font-bold text-[#2C1E15]">{selectedBookingModal.checkInDate} (2:00 PM)</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-stone-100">
                          <span className="text-[#786150]">Check-Out:</span>
                          <span className="font-bold text-[#2C1E15]">{selectedBookingModal.checkOutDate} (12:00 PM)</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[#786150]">Duration:</span>
                          <span className="font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {selectedBookingModal.numberOfNights || 1} Night{(selectedBookingModal.numberOfNights || 1) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-stone-100">
                          <span className="text-[#786150]">Stay Date:</span>
                          <span className="font-bold text-[#2C1E15]">{selectedBookingModal.hourlyDate}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-stone-100">
                          <span className="text-[#786150]">Target Start:</span>
                          <span className="font-bold text-[#2C1E15]">{selectedBookingModal.hourlyStartTime || '14:00'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[#786150]">Duration Block:</span>
                          <span className="font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {selectedBookingModal.hourlyDurationHours || 3} Hours
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-[#E6D7C3] shadow-xs space-y-2.5">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold border-b border-[#E6D7C3]/60 pb-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-700" />
                      <span>Guest Headcount & Breakdown</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-stone-100">
                        <span className="text-[#786150]">Adult Guests:</span>
                        <span className="font-bold text-[#2C1E15]">{selectedBookingModal.adultGuests} Adults</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-stone-100">
                        <span className="text-[#786150]">Children (Ages 0-10):</span>
                        <span className="font-bold text-[#2C1E15]">
                          {(selectedBookingModal.childGuests || 0) + (selectedBookingModal.child6to10Guests || 0) + (selectedBookingModal.child1to5Guests || 0)} Children
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[#786150]">Total Configured Pax:</span>
                        <span className="font-extrabold text-[#2C1E15] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E6D7C3]">
                          {selectedBookingModal.adultGuests + (selectedBookingModal.childGuests || 0)} Total Pax
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. SPECIAL REQUESTS CALLOUT */}
                {selectedBookingModal.specialRequests && (
                  <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-start gap-2.5 shadow-2xs">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-900 text-xs">Guest Special Requests / Preferences:</div>
                      <p className="text-amber-800 text-xs mt-0.5 leading-relaxed font-medium">
                        "{selectedBookingModal.specialRequests}"
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. FINANCIAL BREAKDOWN & PAYMENT DETAILS */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E6D7C3] shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E6D7C3]/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-serif font-black text-sm text-[#2C1E15]">Financial & Payment Breakdown</h4>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#786150] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E6D7C3]">
                      Method: {selectedBookingModal.paymentMethod?.toUpperCase()}
                    </span>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-stone-100">
                      <span className="text-[#786150]">Base Accommodation Stay:</span>
                      <span className="font-bold text-[#2C1E15]">
                        ₱{selectedBookingModal.baseStayTotal?.toLocaleString() || selectedBookingModal.baseRatePerUnit?.toLocaleString()}
                      </span>
                    </div>

                    {/* Add-ons List */}
                    {selectedBookingModal.addons && selectedBookingModal.addons.length > 0 && (
                      <div className="py-1 border-b border-stone-100 space-y-1">
                        <div className="text-[10px] font-bold text-[#786150] uppercase">Selected Extras & Services:</div>
                        {selectedBookingModal.addons.map((add, aIdx) => (
                          <div key={aIdx} className="flex justify-between items-center pl-2 text-[11px]">
                            <span className="text-stone-700">• {add.name} (x{add.quantity})</span>
                            <span className="font-medium text-[#2C1E15]">₱{add.cost.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedBookingModal.discountAmount > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-stone-100 text-emerald-700 font-semibold">
                        <span>Discount / Promo Applied:</span>
                        <span>-₱{selectedBookingModal.discountAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-1.5 border-b border-[#E6D7C3] text-sm">
                      <span className="font-bold text-[#2C1E15]">Grand Total:</span>
                      <span className="font-black text-[#2C1E15] text-base">₱{selectedBookingModal.grandTotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-stone-100">
                      <span className="text-[#786150]">Amount Paid to Date:</span>
                      <span className="font-bold text-emerald-700">₱{selectedBookingModal.amountPaidNow.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5">
                      <span className="font-bold text-[#2C1E15]">Remaining Balance:</span>
                      <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                        isFullyPaid 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                      }`}>
                        ₱{selectedBookingModal.remainingBalance.toLocaleString()} {isFullyPaid ? '(Zero Balance)' : '(Due at Front Desk)'}
                      </span>
                    </div>
                  </div>

                  {/* Payment Deposit Slip Preview if uploaded */}
                  {selectedBookingModal.paymentSlipUrl && (
                    <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={selectedBookingModal.paymentSlipUrl} 
                          alt="Slip" 
                          className="w-10 h-10 object-cover rounded-lg border border-amber-300"
                        />
                        <div>
                          <div className="font-bold text-xs text-amber-950">Payment Deposit Slip Attached</div>
                          <div className="text-[10px] text-amber-800 truncate max-w-[200px]">
                            {selectedBookingModal.paymentSlipFileName || 'Deposit receipt verified'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenSlipLightbox(selectedBookingModal)}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span>View Slip</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. STAFF NOTES & AUDIT REMARKS */}
                <div className="bg-white rounded-2xl p-4 border border-[#E6D7C3] shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E6D7C3]/60 pb-1.5">
                    <span className="font-bold text-[#2C1E15]">Front Desk Staff Notes & Check-In Log:</span>
                    <span className="text-[10px] text-[#786150] italic">Internal Records Only</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E6D7C3]/60 font-mono text-[11px] text-[#523A2A] whitespace-pre-wrap">
                    {selectedBookingModal.staffNotes || "No staff notes recorded for this reservation."}
                  </div>
                </div>

              </div>

              {/* Bottom Actions Toolbar */}
              <div className="p-4 sm:p-5 bg-white border-t border-[#E6D7C3] shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                
                {/* 1. View Voucher */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenVoucher(selectedBookingModal);
                    setSelectedBookingModal(null);
                  }}
                  className="p-2.5 bg-white hover:bg-stone-50 text-[#2C1E15] border border-[#E6D7C3] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-700" />
                  <span>View Voucher</span>
                </button>

                {/* 2. Open Cashier / Folio */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolioBooking(selectedBookingModal);
                    setOpsSubTab('cashier');
                    setSelectedBookingModal(null);
                  }}
                  className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                  <span>Billing Folio</span>
                </button>

                {/* 3. Edit Details */}
                <button
                  type="button"
                  onClick={() => {
                    setViewingCheckInDetailsBooking(selectedBookingModal);
                    setIsEditingBookingDetails(true);
                    setSelectedBookingModal(null);
                  }}
                  className="p-2.5 bg-[#FAF7F2] hover:bg-[#E6D7C3]/50 text-[#2C1E15] border border-[#E6D7C3] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>Edit Details</span>
                </button>

                {/* 4. Express Check-In / Check-Out */}
                {selectedBookingModal.status !== 'Checked-In' && selectedBookingModal.status !== 'Completed' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInTarget(selectedBookingModal);
                      setSelectedBookingModal(null);
                    }}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Check-In</span>
                  </button>
                ) : selectedBookingModal.status === 'Checked-In' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckOutTarget(selectedBookingModal);
                      setSelectedBookingModal(null);
                    }}
                    className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Check-Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedBookingModal(null)}
                    className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Completed</span>
                  </button>
                )}

              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: BOOKING DETAILS, EDIT & DELETE */}
      {viewingCheckInDetailsBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#D4AF37] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[#E6D7C3] pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-amber-100 text-amber-800">
                  Booking & Check-In Details
                </span>
                <h4 className="text-xl font-serif font-black text-[#2C1E15] mt-1">{viewingCheckInDetailsBooking.guestName}</h4>
                <div className="text-xs text-[#786150]">{viewingCheckInDetailsBooking.roomTitle} • #{viewingCheckInDetailsBooking.id}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingCheckInDetailsBooking(null);
                  setIsEditingBookingDetails(false);
                  setIsDeletingBookingConfirm(false);
                }}
                className="p-1 hover:bg-stone-100 rounded-xl text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDeletingBookingConfirm ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Permanently Delete Booking?</h3>
                  <p className="text-xs text-[#786150] mt-1">
                    Are you sure you want to delete reservation <strong className="text-[#2C1E15]">{viewingCheckInDetailsBooking.id}</strong> for <strong className="text-[#2C1E15]">{viewingCheckInDetailsBooking.guestName}</strong>?
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeletingBookingConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteBooking) {
                        onDeleteBooking(viewingCheckInDetailsBooking.id);
                      }
                      setViewingCheckInDetailsBooking(null);
                      setIsDeletingBookingConfirm(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : isEditingBookingDetails ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (onEditBooking) {
                    onEditBooking(viewingCheckInDetailsBooking);
                  }
                  setIsEditingBookingDetails(false);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-bold text-[#2C1E15] mb-1">Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={viewingCheckInDetailsBooking.guestName}
                    onChange={(e) => setViewingCheckInDetailsBooking({ ...viewingCheckInDetailsBooking, guestName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">Guest Phone *</label>
                    <input
                      type="text"
                      required
                      value={viewingCheckInDetailsBooking.guestPhone}
                      onChange={(e) => setViewingCheckInDetailsBooking({ ...viewingCheckInDetailsBooking, guestPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">Status *</label>
                    <select
                      value={viewingCheckInDetailsBooking.status}
                      onChange={(e) => setViewingCheckInDetailsBooking({ ...viewingCheckInDetailsBooking, status: e.target.value as BookingStatus })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs font-bold outline-none"
                    >
                      <option value="Pending Slip Review">Pending Slip Review</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Checked-In">Checked-In</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">Grand Total (₱)</label>
                    <input
                      type="number"
                      value={viewingCheckInDetailsBooking.grandTotal}
                      onChange={(e) => {
                        const gt = Number(e.target.value);
                        const rem = Math.max(0, gt - (viewingCheckInDetailsBooking.amountPaidNow || 0));
                        setViewingCheckInDetailsBooking({ ...viewingCheckInDetailsBooking, grandTotal: gt, remainingBalance: rem });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#2C1E15] mb-1">Amount Paid Now (₱)</label>
                    <input
                      type="number"
                      value={viewingCheckInDetailsBooking.amountPaidNow}
                      onChange={(e) => {
                        const paid = Number(e.target.value);
                        const rem = Math.max(0, (viewingCheckInDetailsBooking.grandTotal || 0) - paid);
                        setViewingCheckInDetailsBooking({ ...viewingCheckInDetailsBooking, amountPaidNow: paid, remainingBalance: rem });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2C1E15] mb-1">Staff Notes / Check-In Remarks</label>
                  <textarea
                    rows={2}
                    value={viewingCheckInDetailsBooking.staffNotes || ''}
                    onChange={(e) => setViewingCheckInDetailsBooking({ ...viewingCheckInDetailsBooking, staffNotes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-[#FAF7F2] text-xs outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E6D7C3]">
                  <button
                    type="button"
                    onClick={() => setIsEditingBookingDetails(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#2C1E15] hover:bg-[#523A2A] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E6D7C3] space-y-2">
                  <div className="font-bold text-[#2C1E15]">Check-In / Staff Notes Log:</div>
                  <div className="text-[#523A2A] whitespace-pre-wrap font-mono text-[11px] bg-white p-2.5 rounded-lg border border-[#E6D7C3]/60">
                    {viewingCheckInDetailsBooking.staffNotes || "No check-in notes recorded yet."}
                  </div>
                </div>

                {viewingCheckInDetailsBooking.specialRequests && (
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-900">Guest Special Requests:</div>
                    <div className="text-amber-800 text-[11px]">
                      {viewingCheckInDetailsBooking.specialRequests}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E6D7C3]">
                  <div>
                    <span className="text-[#786150] block text-[10px] uppercase font-bold">Status</span>
                    <span className="font-bold text-[#2C1E15]">{viewingCheckInDetailsBooking.status}</span>
                  </div>
                  <div>
                    <span className="text-[#786150] block text-[10px] uppercase font-bold">Remaining Balance</span>
                    <span className={`font-bold ${viewingCheckInDetailsBooking.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₱{viewingCheckInDetailsBooking.remainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#E6D7C3]">
                  <button
                    type="button"
                    onClick={() => setIsEditingBookingDetails(true)}
                    className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Edit Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeletingBookingConfirm(true)}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Booking</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingCheckInDetailsBooking(null);
                      setIsEditingBookingDetails(false);
                      setIsDeletingBookingConfirm(false);
                    }}
                    className="w-full py-2.5 bg-[#2C1E15] hover:bg-[#523A2A] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
