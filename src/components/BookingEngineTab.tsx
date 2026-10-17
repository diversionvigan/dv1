import { ModernBackButton } from './ModernBackButton';
import { registerGuestAccount } from '../utils/guestAuth';
import { formatLocalDate, getNextDayStr, getLocalDateToday, getLocalDateTomorrow } from '../utils/dateUtils';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  RoomUnit, 
  StayType, 
  BookingAddonItem, 
  PaymentOption, 
  PaymentMethod, 
  BookingRecord 
} from '../types';
import { 
  Eye,
  EyeOff,
  KeyRound,
  Users, 
  Plus, 
  Minus, 
  Check, 
  Copy, 
  Upload, 
  AlertCircle, 
  CreditCard, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Trash2, 
  Receipt,
  DollarSign,
  ArrowLeft,
  Info,
  Waves,
  Sparkles,
  Wind,
  Wifi,
  Car,
  UtensilsCrossed,
  Lock,
  Coffee,
  ChevronDown,
  X
} from 'lucide-react';
import { VillaLogo } from './VillaLogo';
import { INITIAL_BOOKINGS } from '../data/roomsData';
const FALLBACK_ROOM_IMAGE = 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=80';

// Max extra pax allowed per room according to specifications:
// Eligible Rooms (Max to add: 1 extra pax): Room 0, 1, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16
// Eligible Rooms (Max to add: 2 extra pax): Room 11, 2, 3
// Private Villa (Max to add: 10 extra pax): Private Villa
// Other Rooms: Max to add: 0 (strictly limited to standard capacity)
export const getRoomMaxExtraPax = (room: RoomUnit): number => {
  if (room.id === 'private-villa-pool' || (room.roomNumber || room.title).toLowerCase().includes('private villa')) {
    return 10;
  }
  const eligible1 = ['0', '1', '4', '5', '6', '7', '8', '9', '10', '12', '13', '14', '15', '16', '18'];
  const eligible2 = ['11', '2', '3'];
  const match = (room.roomNumber || room.title).match(/\d+/);
  const numStr = match ? match[0] : room.id.replace('room-', '');
  if (eligible2.includes(numStr)) return 2;
  if (eligible1.includes(numStr)) return 1;
  return 0;
};

// Base standard capacity before extra pax
export const getRoomBaseCapacity = (room: RoomUnit): number => {
  if (room.id === 'private-villa-pool' || (room.roomNumber || room.title).toLowerCase().includes('private villa')) {
    return 10;
  }
  if (room.id === 'room-0' || room.id === 'room-1' || room.id === 'room-12' || room.id === 'room-18' || room.id === 'room-7') return 8;
  if (room.id === 'room-2' || room.id === 'room-3') return 10;
  if (room.id === 'room-4' || room.id === 'room-5' || room.id === 'room-6') return 7;
  if (room.id === 'room-14' || room.id === 'room-15' || room.id === 'room-16') return 5;
  if (room.id === 'room-8' || room.id === 'room-9' || room.id === 'room-10') return 3;
  if (room.id === 'room-11') return 2;
  return room.capacity?.maxGuests || 3;
};

// Max total accommodation including allowable extra pax
export const getRoomMaxAccommodation = (room: RoomUnit): number => {
  if (room.id === 'private-villa-pool' || (room.roomNumber || room.title).toLowerCase().includes('private villa')) {
    return 20; // 10 Standard + 10 Extra Pax
  }
  const maxExtra = getRoomMaxExtraPax(room);
  const baseCap = getRoomBaseCapacity(room);
  const declaredMax = room.capacity?.maxGuests || 0;
  return Math.max(baseCap + maxExtra, declaredMax);
};

interface BookingEngineTabProps {
  rooms: RoomUnit[];
  availableAddons: BookingAddonItem[];
  existingBookings?: BookingRecord[];
  preselectedRoomId?: string;
  preselectedStayType?: StayType;
  preselectedGuests?: number;
  preselectedCheckIn?: string;
  preselectedCheckOut?: string;
  onBookingCreated: (booking: BookingRecord) => void;
  onBack?: () => void;
}

export const BookingEngineTab: React.FC<BookingEngineTabProps> = ({
  rooms,
  availableAddons,
  existingBookings,
  preselectedRoomId,
  preselectedStayType,
  preselectedGuests,
  preselectedCheckIn,
  preselectedCheckOut,
  onBookingCreated,
  onBack,
}) => {
  // Step 1: Room Selection
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    preselectedRoomId ? [preselectedRoomId] : []
  );
  const [preferredRoomNumber, setPreferredRoomNumber] = useState<string>('Any Available');

  // Dropdown selection states for Room Number and Pax Rate under Accommodation Unit
  const [selectedRoomNumberFilter, setSelectedRoomNumberFilter] = useState<string>(
    preselectedRoomId || ''
  );

  // Step 2: Stay Type & Schedule
  const [stayType, setStayType] = useState<StayType>(
    preselectedStayType || 'nightly'
  );

  // Today and Tomorrow default dates
  const todayStr = useMemo(() => getLocalDateToday(), []);
  const tomorrowStr = useMemo(() => getLocalDateTomorrow(), []);

  const availableDateOptions = useMemo(() => {
    const list: { dateStr: string; label: string }[] = [];
    for (let i = 0; i < 180; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = formatLocalDate(d);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
      list.push({ dateStr, label: i === 0 ? `Today (${label})` : label });
    }
    return list;
  }, []);

  const [checkInDate, setCheckInDate] = useState<string>(preselectedCheckIn || '');
  const [checkOutDate, setCheckOutDate] = useState<string>(preselectedCheckOut || '');

  const [hourlyDate, setHourlyDate] = useState<string>(todayStr);
  const [hourlyStartTime, setHourlyStartTime] = useState<string>('14:00');
  const [hourlyDuration, setHourlyDuration] = useState<3 | 6 | 12>(3);

  const [calendarNotice, setCalendarNotice] = useState<string>('');
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth() + 1);

  // Auto-scroll to room selection if search params are provided
  useEffect(() => {
    if (preselectedGuests || preselectedCheckIn || preselectedCheckOut) {
      setTimeout(() => {
        const el = document.getElementById('booking-step-2');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [preselectedGuests, preselectedCheckIn, preselectedCheckOut]);

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysCount = lastDay.getDate();
    let startingDayOfWeek = firstDay.getDay() - 1; // Mon = 0, Sun = 6
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysCount; d++) {
      const mStr = String(month).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push(`${year}-${mStr}-${dStr}`);
    }
    return days;
  };

  const [currentBookingStep, setCurrentBookingStep] = useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(1);
  const [inspectRoom, setInspectRoom] = useState<RoomUnit | null>(null);
  const [adultGuests, setAdultGuests] = useState<number>(preselectedGuests || 2);
  const [child6to10Guests, setChild6to10Guests] = useState<number>(0);
  const [child1to5Guests, setChild1to5Guests] = useState<number>(0);
  const [pwdGuests, setPwdGuests] = useState<number>(0);

  const childGuests = child6to10Guests + child1to5Guests;

  // Step 3: Add-ons state with quantity map
  const [addonQuantities, setAddonQuantities] = useState<{ [addonId: string]: number }>({
    breakfast_set: 0,
    extra_pad: 0,
    extra_pax: 0,
    billiards_darts: 0,
    tour_van: 0,
  });

  // Track extra pax per room (max 1 for eligible rooms: Room 0, 1, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15)
  const [roomExtraPaxMap, setRoomExtraPaxMap] = useState<{ [roomId: string]: number }>({});
  // Track selected pax quantity per room unit / villa
  const [roomPaxQuantityMap, setRoomPaxQuantityMap] = useState<{ [roomId: string]: number }>({});
  // Track selected child pax quantity (4-10 years old) per room unit
  const [roomChildPaxMap, setRoomChildPaxMap] = useState<{ [roomId: string]: number }>({});
  // Track declared PWD pax per room unit (requires confirmation ID upon check-in)
  const [roomPwdPaxMap, setRoomPwdPaxMap] = useState<{ [roomId: string]: number }>({});
  // Track optional services & extras per room card
  const [roomExtrasMap, setRoomExtrasMap] = useState<{ [roomId: string]: { [addonId: string]: number } }>({});
  const [expandedExtrasRoomIds, setExpandedExtrasRoomIds] = useState<{ [roomId: string]: boolean }>({});

  // Step 4: Guest Contact Details & Registration
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestAddress, setGuestAddress] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestUsername, setGuestUsername] = useState<string>('');
  const [guestPassword, setGuestPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ [field: string]: string }>({});

  // Step 5: Payment Option (100% Full vs 40% Partial Downpayment)
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('partial_40');

  // Step 6: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');

  // Step 7: Mandatory Payment Slip Upload
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [slipUploadError, setSlipUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper copy states
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Update room when preselected props change
  useEffect(() => {
    if (preselectedRoomId) {
      setSelectedRoomIds([preselectedRoomId]);
      setSelectedRoomNumberFilter(preselectedRoomId);
    }
    if (preselectedStayType) {
      setStayType(preselectedStayType);
    }
  }, [preselectedRoomId, preselectedStayType]);

  const selectedRooms = useMemo(() => {
    return rooms.filter((r) => selectedRoomIds.includes(r.id));
  }, [rooms, selectedRoomIds]);

  const selectedRoom: RoomUnit | null = selectedRooms[0] || null;

  // Grouped room choices with quantities (multipliers)
  const selectedRoomsGrouped = useMemo(() => {
    const map = new Map<string, { category: string; count: number; roomNumbers: string[]; rooms: typeof rooms }>();
    selectedRooms.forEach((r) => {
      const cat = r.category || r.title;
      const rn = r.roomNumber || r.title.split("–")[0].trim();
      const existing = map.get(cat);
      if (existing) {
        existing.count += 1;
        existing.roomNumbers.push(rn);
        existing.rooms.push(r);
      } else {
        map.set(cat, {
          category: cat,
          count: 1,
          roomNumbers: [rn],
          rooms: [r],
        });
      }
    });
    return Array.from(map.values());
  }, [selectedRooms]);

  // Total pax headcount (sum of pax + child pax + pwd pax across selected rooms)
  const totalPax = useMemo(() => {
    if (selectedRooms.length > 0) {
      const sum = selectedRooms.reduce((acc, r) => {
        const p = roomPaxQuantityMap[r.id] || getRoomBaseCapacity(r);
        const c = roomChildPaxMap[r.id] || 0;
        const pwd = roomPwdPaxMap[r.id] || 0;
        return acc + p + c + pwd;
      }, 0);
      if (sum > 0) return sum;
    }
    return Math.max(1, adultGuests + child6to10Guests + child1to5Guests + pwdGuests);
  }, [selectedRooms, roomPaxQuantityMap, roomChildPaxMap, roomPwdPaxMap, adultGuests, child6to10Guests, child1to5Guests, pwdGuests]);

  // Synchronize total adult guests, children, and PWD from selected rooms
  useEffect(() => {
    if (selectedRooms.length > 0) {
      let totalAdult = 0;
      let totalChildren = 0;
      let totalPwd = 0;
      selectedRooms.forEach((r) => {
        const p = roomPaxQuantityMap[r.id] || getRoomBaseCapacity(r);
        const c = roomChildPaxMap[r.id] || 0;
        const pwd = roomPwdPaxMap[r.id] || 0;
        totalAdult += p;
        totalChildren += c;
        totalPwd += pwd;
      });
      setAdultGuests(totalAdult);
      setChild6to10Guests(totalChildren);
      setPwdGuests(totalPwd);
    }
  }, [selectedRooms, roomPaxQuantityMap, roomChildPaxMap, roomPwdPaxMap]);

  // Compute booked dates for currently selected room unit(s)
  const bookedDatesSet = useMemo(() => {
    const set = new Set<string>();
    const list = existingBookings || [];

    list.forEach((b) => {
      // Check if this booking matches any of the currently selected accommodation units (or all units if none selected)
      const matchesRoom =
        selectedRoomIds.length === 0 ||
        selectedRoomIds.includes(b.roomId) ||
        selectedRooms.some(
          (r) =>
            r.id === b.roomId ||
            (r.roomNumber && b.roomTitle && b.roomTitle.toLowerCase().includes(r.roomNumber.toLowerCase()))
        );

      if (matchesRoom && b.status !== 'Cancelled') {
        if (b.stayType === 'nightly' && b.checkInDate && b.checkOutDate) {
          const [sy, sm, sd] = b.checkInDate.split('-').map(Number);
          const [ey, em, ed] = b.checkOutDate.split('-').map(Number);
          const cur = new Date(sy, sm - 1, sd, 12, 0, 0);
          const end = new Date(ey, em - 1, ed, 12, 0, 0);
          while (cur < end) {
            const yStr = cur.getFullYear();
            const mStr = String(cur.getMonth() + 1).padStart(2, '0');
            const dStr = String(cur.getDate()).padStart(2, '0');
            set.add(`${yStr}-${mStr}-${dStr}`);
            cur.setDate(cur.getDate() + 1);
          }
        } else if (b.hourlyDate) {
          set.add(b.hourlyDate);
        }
      }
    });

    return set;
  }, [existingBookings, selectedRoomIds, selectedRooms]);

  // Helper to check room booking status for selected dates and overall
  const getRoomBookingInfo = useCallback(
    (room: RoomUnit) => {
      const list = existingBookings || [];
      const roomBookings = list.filter((b) => {
        if (b.status === 'Cancelled') return false;
        if (b.roomId === room.id) return true;
        if (
          room.roomNumber &&
          (b.roomId === room.roomNumber || (b.roomTitle && b.roomTitle.toLowerCase().includes(room.roomNumber.toLowerCase())))
        ) {
          return true;
        }
        if (
          room.roomNumbers &&
          room.roomNumbers.some(
            (rn) => b.roomId === rn || (b.roomTitle && b.roomTitle.toLowerCase().includes(rn.toLowerCase()))
          )
        ) {
          return true;
        }
        return false;
      });

      if (roomBookings.length === 0) {
        return {
          isBookedForSelectedDates: false,
          hasAnyBooking: false,
          bookedDatesSummary: '',
          bookings: [] as BookingRecord[],
        };
      }

      let isBookedForSelectedDates = false;
      const dateSummaries: string[] = [];

      roomBookings.forEach((b) => {
        if (b.stayType === 'nightly' && b.checkInDate && b.checkOutDate) {
          dateSummaries.push(`${b.checkInDate} to ${b.checkOutDate}`);
          if (stayType === 'nightly') {
            const sStart = checkInDate;
            const sEnd = checkOutDate || checkInDate;
            if (sStart && sEnd) {
              // Overlaps if booking start < stay end && booking end > stay start
              if (b.checkInDate < sEnd && b.checkOutDate > sStart) {
                isBookedForSelectedDates = true;
              }
            }
          } else if (stayType === 'hourly') {
            if (hourlyDate && hourlyDate >= b.checkInDate && hourlyDate < b.checkOutDate) {
              isBookedForSelectedDates = true;
            }
          }
        } else if (b.hourlyDate) {
          dateSummaries.push(b.hourlyDate);
          if (stayType === 'nightly') {
            const sStart = checkInDate;
            const sEnd = checkOutDate || checkInDate;
            if (sStart && sEnd) {
              if (b.hourlyDate >= sStart && b.hourlyDate < sEnd) {
                isBookedForSelectedDates = true;
              }
            }
          } else if (stayType === 'hourly') {
            if (hourlyDate === b.hourlyDate) {
              isBookedForSelectedDates = true;
            }
          }
        }
      });

      return {
        isBookedForSelectedDates,
        hasAnyBooking: roomBookings.length > 0,
        bookedDatesSummary: dateSummaries.join(', '),
        bookings: roomBookings,
      };
    },
    [existingBookings, stayType, checkInDate, checkOutDate, hourlyDate]
  );

  // Automatically deselect any room that is booked or has a red highlight (existing bookings) so it cannot remain chosen
  useEffect(() => {
    setSelectedRoomIds((prev) => {
      const availableOnly = prev.filter((id) => {
        const room = rooms.find((r) => r.id === id);
        if (!room) return false;
        const bInfo = getRoomBookingInfo(room);
        // Block both specific overlap and general "booked" status
        return !bInfo.isBookedForSelectedDates && !bInfo.hasAnyBooking;
      });
      if (availableOnly.length !== prev.length) {
        return availableOnly;
      }
      return prev;
    });
  }, [checkInDate, checkOutDate, hourlyDate, stayType, rooms, getRoomBookingInfo]);

  // Compute number of nights for nightly stays
  const calculatedNights = useMemo(() => {
    if (stayType !== 'nightly') return 1;
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }, [stayType, checkInDate, checkOutDate]);

  // Helper: format rate display range dynamically from room.paxRates
  const formatRateDisplay = (room: RoomUnit) => {
    if (!room) return { weekdayStr: '', weekendStr: '' };
    if (room.paxRates && room.paxRates.length > 0) {
      const wDayMin = Math.min(...room.paxRates.map((t) => t.weekdayRate));
      const wDayMax = Math.max(...room.paxRates.map((t) => t.weekdayRate));
      const wEndMin = Math.min(...room.paxRates.map((t) => t.weekendRate));
      const wEndMax = Math.max(...room.paxRates.map((t) => t.weekendRate));

      const weekdayStr = wDayMin === wDayMax ? `₱${wDayMin.toLocaleString()}` : `₱${wDayMin.toLocaleString()} – ₱${wDayMax.toLocaleString()}`;
      const weekendStr = wEndMin === wEndMax ? `₱${wEndMin.toLocaleString()}` : `₱${wEndMin.toLocaleString()} – ₱${wEndMax.toLocaleString()}`;

      return { weekdayStr, weekendStr };
    }
    return {
      weekdayStr: room.weekdayRateDisplay || `₱${room.pricing?.nightly?.toLocaleString() || '1,000'}`,
      weekendStr: room.weekendRateDisplay || `₱${((room.pricing?.nightly || 1000) + 200).toLocaleString()}`,
    };
  };

  // Helper: Get exact rate for a single night given date, room, and guest breakdown
  const getNightlyRateForDate = (
    date: Date,
    room: RoomUnit,
    adults: number,
    kids6to10: number = 0,
    toddlers1to5: number = 0
  ): number => {
    const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    // Sun to Thu: 0, 1, 2, 3, 4 | Fri to Sat: 5, 6
    const isWeekend = day === 5 || day === 6;

    const effectiveKids6to10 = roomChildPaxMap[room.id] !== undefined ? roomChildPaxMap[room.id] : kids6to10;

    if (room.id === 'private-villa-pool' || (room.roomNumber || room.title).toLowerCase().includes('private villa')) {
      // Mon to Fri: 1, 2, 3, 4, 5 (Monday to Friday) -> ₱8,000 base (1-10 pax)
      // Sat to Sun: 6, 0 (Saturday to Sunday) -> ₱10,000 base (1-10 pax)
      const isSatSun = day === 6 || day === 0;
      const isFriSatSun = day === 5 || day === 6 || day === 0;
      const baseVillaRate = isSatSun ? 10000 : 8000;

      // 3 yrs below (sneak-in) are free of charge
      const effectiveAdults = roomPaxQuantityMap[room.id] ? roomPaxQuantityMap[room.id] : adults;
      const effectiveKids = roomPaxQuantityMap[room.id] ? effectiveKids6to10 : effectiveKids6to10;

      let extraAdultFee = 0;
      let extraChildFee = 0;

      if (roomPaxQuantityMap[room.id]) {
        const totalPax = roomPaxQuantityMap[room.id];
        const extraPax = Math.max(0, totalPax - 10);
        extraAdultFee = extraPax * 500;
        extraChildFee = effectiveKids * (isFriSatSun ? 400 : 300);
      } else {
        const totalCount = effectiveAdults + effectiveKids;
        if (totalCount > 10) {
          if (effectiveAdults >= 10) {
            const extraAdults = effectiveAdults - 10;
            const extraKids = effectiveKids;
            extraAdultFee = extraAdults * 500;
            extraChildFee = extraKids * (isFriSatSun ? 400 : 300);
          } else {
            const baseKidsCount = 10 - effectiveAdults;
            const extraKids = Math.max(0, effectiveKids - baseKidsCount);
            extraChildFee = extraKids * (isFriSatSun ? 400 : 300);
          }
        }
      }

      return baseVillaRate + extraAdultFee + extraChildFee;
    }

    // Room 0 to 13 and 14 to 16 tier calculations:
    let baseRate = room.pricing.nightly;
    if (room.paxRates && room.paxRates.length > 0) {
      const effectiveAdults = roomPaxQuantityMap[room.id] || Math.max(1, adults);
      const tier = room.paxRates.find((t) => effectiveAdults <= t.pax);
      if (tier) {
        baseRate = isWeekend ? tier.weekendRate : tier.weekdayRate;
      } else {
        const lastTier = room.paxRates[room.paxRates.length - 1];
        const lastRate = isWeekend ? lastTier.weekendRate : lastTier.weekdayRate;
        const extraPaxCount = effectiveAdults - lastTier.pax;
        const extraFeePerPax = room.extraPaxFee !== undefined ? room.extraPaxFee : (isWeekend ? 350 : 300);
        baseRate = lastRate + extraPaxCount * extraFeePerPax;
      }
    }

    // Additional Pax Policy for Room 0 to 13 and 14 to 16:
    // 1-5 yrs: Free
    // 4-10 yrs: P200 Per Pax (Sun-Thu) | P250 Per Pax (Fri-Sat)
    const child6to10Rate = isWeekend ? 250 : 200;
    const additionalKidsFee = effectiveKids6to10 * child6to10Rate;

    return baseRate + additionalKidsFee;
  };

  // Night-by-night breakdown with day names and rates (summed across all selected room units)
  const nightlyBreakdown = useMemo(() => {
    if (!selectedRooms || selectedRooms.length === 0 || stayType !== 'nightly') return [];
    const list: {
      dateStr: string;
      label: string;
      isWeekend: boolean;
      rate: number;
      baseRateSum: number;
      child6to10Cost: number;
    }[] = [];
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    const cur = new Date(start);
    while (cur < end) {
      const dateStr = formatLocalDate(cur);
      const day = cur.getDay();
      const isWeekend = day === 5 || day === 6;
      const label = cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const rate = selectedRooms.reduce(
        (sum, r) => sum + getNightlyRateForDate(cur, r, adultGuests, child6to10Guests, child1to5Guests),
        0
      );
      const childRatePerPax = isWeekend ? 250 : 200;
      const child6to10Cost = child6to10Guests * childRatePerPax;
      const baseRateSum = Math.max(0, rate - child6to10Cost);

      list.push({ dateStr, label, isWeekend, rate, baseRateSum, child6to10Cost });
      cur.setDate(cur.getDate() + 1);
    }

    // Safety fallback if checkInDate >= checkOutDate
    if (list.length === 0) {
      const cur = new Date(checkInDate);
      const day = cur.getDay();
      const isWeekend = day === 5 || day === 6;
      const label = cur.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const rate = selectedRooms.reduce(
        (sum, r) => sum + getNightlyRateForDate(cur, r, adultGuests, child6to10Guests, child1to5Guests),
        0
      );
      const childRatePerPax = isWeekend ? 250 : 200;
      const child6to10Cost = child6to10Guests * childRatePerPax;
      const baseRateSum = Math.max(0, rate - child6to10Cost);
      list.push({ dateStr: checkInDate, label, isWeekend, rate, baseRateSum, child6to10Cost });
    }

    return list;
  }, [selectedRooms, stayType, checkInDate, checkOutDate, adultGuests, child6to10Guests, child1to5Guests, roomPaxQuantityMap]);

  // Base stay cost computation (multiplied and summed across all selected rooms)
  const baseStayRate = useMemo(() => {
    if (!selectedRooms || selectedRooms.length === 0) return 0;
    if (stayType === 'nightly') {
      return nightlyBreakdown.reduce((sum, item) => sum + item.rate, 0);
    } else {
      return selectedRooms.reduce((roomSum, r) => {
        let rRate = 0;
        if (hourlyDuration === 3) rRate = r.pricing.hourly3hr || 500;
        else if (hourlyDuration === 6) rRate = r.pricing.hourly6hr || 800;
        else rRate = r.pricing.hourly12hr || 1100;
        return roomSum + rRate;
      }, 0);
    }
  }, [selectedRooms, stayType, nightlyBreakdown, hourlyDuration]);

  // Room type cost breakdown with multipliers for the stay summary
  const roomTypesBreakdown = useMemo(() => {
    return selectedRoomsGrouped.map((group) => {
      let groupCost = 0;
      group.rooms.forEach((r) => {
        if (stayType === 'nightly') {
          const start = new Date(checkInDate);
          const end = new Date(checkOutDate);
          const cur = new Date(start);
          while (cur < end) {
            groupCost += getNightlyRateForDate(cur, r, adultGuests, child6to10Guests, child1to5Guests);
            cur.setDate(cur.getDate() + 1);
          }
          if (start >= end) {
            groupCost += getNightlyRateForDate(start, r, adultGuests, child6to10Guests, child1to5Guests);
          }
        } else {
          if (hourlyDuration === 3) groupCost += r.pricing.hourly3hr || 500;
          else if (hourlyDuration === 6) groupCost += r.pricing.hourly6hr || 800;
          else groupCost += r.pricing.hourly12hr || 1100;
        }
      });
      return {
        category: group.category,
        count: group.count,
        roomNumbers: group.roomNumbers,
        totalCost: groupCost,
        avgPerRoom: group.count > 0 ? Math.round(groupCost / group.count) : 0,
      };
    });
  }, [selectedRoomsGrouped, stayType, checkInDate, checkOutDate, hourlyDuration, adultGuests, child6to10Guests, child1to5Guests, roomPaxQuantityMap]);

  // Dynamic single-pax rate info for Extra Pax based on calendar date day (Sunday to Monday ₱300, Friday to Saturday ₱350)
  const extraPaxCalendarRateInfo = useMemo(() => {
    const weekdayRate = 300;
    const weekendRate = 350;

    if (stayType === 'nightly') {
      if (nightlyBreakdown.length > 0) {
        if (nightlyBreakdown.length === 1) {
          const item = nightlyBreakdown[0];
          const rate = item.isWeekend ? weekendRate : weekdayRate;
          return {
            rate,
            unitLabel: `₱${rate.toLocaleString()} / extra pax / night`,
            dayDesc: item.isWeekend ? 'Friday to Saturday rate (₱350)' : 'Sunday to Monday rate (₱300)',
            fullLabel: `₱${rate.toLocaleString()} / night (${item.label})`,
            isMixed: false,
          };
        }

        const weekendCount = nightlyBreakdown.filter((n) => n.isWeekend).length;
        const weekdayCount = nightlyBreakdown.length - weekendCount;

        if (weekendCount === nightlyBreakdown.length) {
          return {
            rate: weekendRate,
            unitLabel: `₱${weekendRate.toLocaleString()} / extra pax / night`,
            dayDesc: 'Friday to Saturday rate (₱350)',
            fullLabel: `₱${weekendRate.toLocaleString()} / night (${weekendCount} Weekend nights)`,
            isMixed: false,
          };
        }

        if (weekdayCount === nightlyBreakdown.length) {
          return {
            rate: weekdayRate,
            unitLabel: `₱${weekdayRate.toLocaleString()} / extra pax / night`,
            dayDesc: 'Sunday to Monday rate (₱300)',
            fullLabel: `₱${weekdayRate.toLocaleString()} / night (${weekdayCount} Weekday nights)`,
            isMixed: false,
          };
        }

        const totalPerPax = nightlyBreakdown.reduce((sum, n) => sum + (n.isWeekend ? weekendRate : weekdayRate), 0);
        return {
          rate: totalPerPax,
          unitLabel: `₱${weekdayRate.toLocaleString()} (Sun–Mon) & ₱${weekendRate.toLocaleString()} (Fri–Sat)`,
          dayDesc: `${weekdayCount}x Sun–Thu (@₱${weekdayRate.toLocaleString()}) + ${weekendCount}x Fri–Sat (@₱${weekendRate.toLocaleString()})`,
          fullLabel: `₱${totalPerPax.toLocaleString()} per pax (${nightlyBreakdown.length} nights: ${weekdayCount}x ₱${weekdayRate.toLocaleString()} + ${weekendCount}x ₱${weekendRate.toLocaleString()})`,
          isMixed: true,
        };
      }

      // If nightlyBreakdown is empty, parse checkInDate directly
      const parts = checkInDate.split('-').map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(checkInDate);
      const isW = d.getDay() === 5 || d.getDay() === 6;
      const rate = isW ? weekendRate : weekdayRate;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        rate,
        unitLabel: `₱${rate.toLocaleString()} / extra pax / night`,
        dayDesc: isW ? `${dayName} (Friday to Saturday rate ₱350)` : `${dayName} (Sunday to Monday rate ₱300)`,
        fullLabel: `₱${rate.toLocaleString()} / night (${dayName})`,
        isMixed: false,
      };
    } else {
      // Hourly stay
      const parts = hourlyDate.split('-').map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(hourlyDate);
      const isW = d.getDay() === 5 || d.getDay() === 6;
      const rate = isW ? weekendRate : weekdayRate;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        rate,
        unitLabel: `₱${rate.toLocaleString()} / extra pax`,
        dayDesc: isW ? `${dayName} (Friday to Saturday rate ₱350)` : `${dayName} (Sunday to Monday rate ₱300)`,
        fullLabel: `₱${rate.toLocaleString()} / pax (${dayName})`,
        isMixed: false,
      };
    }
  }, [stayType, nightlyBreakdown, checkInDate, hourlyDate]);

  // Dynamic single-pax rate info for Private Villa Extra Child Pax based on calendar date day (Monday to Thursday ₱300, Friday to Sunday ₱400)
  const extraPaxChildVillaRateInfo = useMemo(() => {
    const weekdayRate = 300; // Monday to Thursday
    const weekendRate = 400; // Friday to Sunday

    if (stayType === 'nightly') {
      if (nightlyBreakdown.length > 0) {
        const friSatSunCount = nightlyBreakdown.filter((n) => {
          const d = new Date(n.dateStr).getDay();
          return d === 5 || d === 6 || d === 0;
        }).length;
        const monThuCount = nightlyBreakdown.length - friSatSunCount;

        if (friSatSunCount === nightlyBreakdown.length) {
          return {
            rate: weekendRate,
            unitLabel: `₱${weekendRate.toLocaleString()} / child / night`,
            dayDesc: 'Friday to Sunday rate (₱400)',
            fullLabel: `₱${weekendRate.toLocaleString()} / night (${friSatSunCount} Fri–Sun nights)`,
            isMixed: false,
          };
        }

        if (monThuCount === nightlyBreakdown.length) {
          return {
            rate: weekdayRate,
            unitLabel: `₱${weekdayRate.toLocaleString()} / child / night`,
            dayDesc: 'Monday to Thursday rate (₱300)',
            fullLabel: `₱${weekdayRate.toLocaleString()} / night (${monThuCount} Mon–Thu nights)`,
            isMixed: false,
          };
        }

        const totalPerChild = nightlyBreakdown.reduce((sum, n) => {
          const d = new Date(n.dateStr).getDay();
          const isFriSatSun = d === 5 || d === 6 || d === 0;
          return sum + (isFriSatSun ? weekendRate : weekdayRate);
        }, 0);

        return {
          rate: totalPerChild,
          unitLabel: `₱${weekdayRate.toLocaleString()} (Mon–Thu) & ₱${weekendRate.toLocaleString()} (Fri–Sun)`,
          dayDesc: `${monThuCount}x Mon–Thu (@₱${weekdayRate.toLocaleString()}) + ${friSatSunCount}x Fri–Sun (@₱${weekendRate.toLocaleString()})`,
          fullLabel: `₱${totalPerChild.toLocaleString()} per child (${nightlyBreakdown.length} nights: ${monThuCount}x ₱${weekdayRate.toLocaleString()} + ${friSatSunCount}x ₱${weekendRate.toLocaleString()})`,
          isMixed: true,
        };
      }

      const parts = checkInDate.split('-').map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(checkInDate);
      const day = d.getDay();
      const isFriSatSun = day === 5 || day === 6 || day === 0;
      const rate = isFriSatSun ? weekendRate : weekdayRate;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        rate,
        unitLabel: `₱${rate.toLocaleString()} / child / night`,
        dayDesc: isFriSatSun ? `${dayName} (Friday to Sunday rate ₱400)` : `${dayName} (Monday to Thursday rate ₱300)`,
        fullLabel: `₱${rate.toLocaleString()} / night (${dayName})`,
        isMixed: false,
      };
    } else {
      const parts = hourlyDate.split('-').map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(hourlyDate);
      const day = d.getDay();
      const isFriSatSun = day === 5 || day === 6 || day === 0;
      const rate = isFriSatSun ? weekendRate : weekdayRate;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        rate,
        unitLabel: `₱${rate.toLocaleString()} / child`,
        dayDesc: isFriSatSun ? `${dayName} (Friday to Sunday rate ₱400)` : `${dayName} (Monday to Thursday rate ₱300)`,
        fullLabel: `₱${rate.toLocaleString()} / child (${dayName})`,
        isMixed: false,
      };
    }
  }, [stayType, nightlyBreakdown, checkInDate, hourlyDate]);

  // Addon cost calculation helper function (handles Sunday to Monday ₱300, Friday to Saturday ₱350, Private Villa Adult ₱500, Private Villa Child ₱400/₱500, Infant ₱0)
  const getAddonCost = useCallback(
    (addon: BookingAddonItem, qty: number) => {
      if (qty <= 0) return 0;
      if (addon.id === 'extra_pax_adult_villa') {
        // Monday to Friday: ₱500 / night, Saturday to Sunday: ₱500 / night
        const adultRate = 500;
        if (stayType === 'nightly') {
          return adultRate * qty * calculatedNights;
        } else {
          return adultRate * qty;
        }
      }
      if (addon.id === 'extra_pax_child_villa') {
        // Monday to Thursday: ₱300 / night, Friday to Sunday: ₱400 / night
        const weekdayRate = 300;
        const weekendRate = 400;
        if (stayType === 'nightly') {
          if (nightlyBreakdown.length > 0) {
            return nightlyBreakdown.reduce((sum, item) => {
              const d = new Date(item.dateStr).getDay();
              const isFriSatSun = d === 5 || d === 6 || d === 0;
              const childRate = isFriSatSun ? weekendRate : weekdayRate;
              return sum + childRate * qty;
            }, 0);
          }
          const parts = checkInDate.split('-').map(Number);
          const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(checkInDate);
          const day = d.getDay();
          const isFriSatSun = day === 5 || day === 6 || day === 0;
          return (isFriSatSun ? weekendRate : weekdayRate) * qty * calculatedNights;
        } else {
          const parts = hourlyDate.split('-').map(Number);
          const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(hourlyDate);
          const day = d.getDay();
          const isFriSatSun = day === 5 || day === 6 || day === 0;
          return (isFriSatSun ? weekendRate : weekdayRate) * qty;
        }
      }
      if (addon.id === 'extra_pax_infant_villa') {
        // 3 yrs & below free of charge (sneak-in)
        return 0;
      }
      if (addon.isPerNight && stayType === 'nightly') {
        return addon.price * qty * calculatedNights;
      }
      return addon.price * qty;
    },
    [stayType, calculatedNights, nightlyBreakdown, checkInDate, hourlyDate]
  );

  // Add-ons total cost computation
  const addonsTotal = useMemo(() => {
    let sum = 0;
    availableAddons.forEach((addon) => {
      const qty = addonQuantities[addon.id] || 0;
      if (qty > 0) {
        sum += getAddonCost(addon, qty);
      }
    });
    return sum;
  }, [availableAddons, addonQuantities, getAddonCost]);

  // Grand Total & Payment Split
  const grandTotal = useMemo(() => {
    const total = baseStayRate + addonsTotal;
    return total > 0 ? total : 0;
  }, [baseStayRate, addonsTotal]);

  const amountPayableNow = useMemo(() => {
    if (paymentOption === 'full') {
      return grandTotal;
    } else {
      // 40% partial downpayment
      return Math.round(grandTotal * 0.4);
    }
  }, [paymentOption, grandTotal]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, grandTotal - amountPayableNow);
  }, [grandTotal, amountPayableNow]);

  // Addon adjust helper
  const handleAdjustAddon = (addonId: string, delta: number) => {
    setAddonQuantities((prev) => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [addonId]: next };
    });
  };

  // Applicable services & extras for room cards (excludes villa extra pax which are handled via pax selectors)
  const roomApplicableAddons = useMemo(() => {
    return availableAddons.filter((a) => !a.id.startsWith('extra_pax_'));
  }, [availableAddons]);

  // Adjust an extra for a specific room card
  const handleAdjustRoomExtra = (roomId: string, addonId: string, delta: number) => {
    setRoomExtrasMap((prev) => {
      const roomMap = prev[roomId] || {};
      const currentQty = roomMap[addonId] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      const updatedRoomMap = { ...roomMap, [addonId]: nextQty };
      if (nextQty === 0) {
        delete updatedRoomMap[addonId];
      }
      return { ...prev, [roomId]: updatedRoomMap };
    });

    if (delta > 0 && !selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds((prev) => [...prev, roomId]);
    }
  };

  // Set explicit extra quantity for a specific room card
  const handleSetRoomExtraQuantity = (roomId: string, addonId: string, qty: number) => {
    const nextQty = Math.max(0, qty);
    setRoomExtrasMap((prev) => {
      const roomMap = prev[roomId] || {};
      const updatedRoomMap = { ...roomMap, [addonId]: nextQty };
      if (nextQty === 0) {
        delete updatedRoomMap[addonId];
      }
      return { ...prev, [roomId]: updatedRoomMap };
    });

    if (nextQty > 0 && !selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds((prev) => [...prev, roomId]);
    }
  };

  // Toggle expand/collapse of the extras drawer for a room card
  const toggleExpandRoomExtras = (roomId: string) => {
    setExpandedExtrasRoomIds((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  // Synchronize aggregate addon quantities from per-room extras and global presets
  useEffect(() => {
    const aggregated: { [addonId: string]: number } = {};
    selectedRoomIds.forEach((rId) => {
      const roomMap = roomExtrasMap[rId];
      if (roomMap) {
        Object.entries(roomMap).forEach(([addonId, qty]) => {
          if (qty > 0) {
            aggregated[addonId] = (aggregated[addonId] || 0) + qty;
          }
        });
      }
    });

    setAddonQuantities((prev) => {
      const merged = { ...prev, ...aggregated };
      roomApplicableAddons.forEach((item) => {
        merged[item.id] = aggregated[item.id] || 0;
      });
      return merged;
    });
  }, [roomExtrasMap, selectedRoomIds, roomApplicableAddons]);

  // Set explicit addon quantity (used for quick presets)
  const handleSetAddonQuantity = (addonId: string, quantity: number) => {
    const nextVal = Math.max(0, quantity);
    setAddonQuantities((prev) => ({
      ...prev,
      [addonId]: nextVal,
    }));

    if (selectedRooms.length > 0) {
      if (selectedRooms.length === 1) {
        setRoomExtrasMap((prev) => ({
          ...prev,
          [selectedRooms[0].id]: {
            ...(prev[selectedRooms[0].id] || {}),
            [addonId]: nextVal,
          },
        }));
      } else {
        const perRoom = Math.floor(nextVal / selectedRooms.length);
        const rem = nextVal % selectedRooms.length;
        setRoomExtrasMap((prev) => {
          const updated = { ...prev };
          selectedRooms.forEach((r, idx) => {
            const roomQty = perRoom + (idx < rem ? 1 : 0);
            updated[r.id] = {
              ...(updated[r.id] || {}),
              [addonId]: roomQty,
            };
          });
          return updated;
        });
      }
    }
  };

  // Set individual pax quantity for a room or villa
  const handleSetRoomPaxQuantity = (roomId: string, paxQty: number) => {
    const roomObj = rooms.find((r) => r.id === roomId);
    if (!roomObj) return;

    const baseCap = getRoomBaseCapacity(roomObj);
    const maxAllowedExtra = getRoomMaxExtraPax(roomObj);
    const extraNeeded = Math.max(0, Math.min(paxQty - baseCap, maxAllowedExtra));

    setRoomPaxQuantityMap((prev) => ({ ...prev, [roomId]: paxQty }));

    setRoomExtraPaxMap((prev) => {
      const updated = { ...prev };
      if (extraNeeded > 0) {
        updated[roomId] = extraNeeded;
      } else {
        delete updated[roomId];
      }

      const activeRoomIds = !selectedRoomIds.includes(roomId)
        ? [...selectedRoomIds, roomId]
        : selectedRoomIds;

      if (!selectedRoomIds.includes(roomId)) {
        setSelectedRoomIds(activeRoomIds);
        setSelectedRoomNumberFilter(roomId);
      }

      return updated;
    });
  };

  // Helper to find the best recommended room for a given total guest count
  const getRecommendedRoom = useCallback(
    (guestCount: number, roomList: RoomUnit[], currentSelectedId?: string): RoomUnit | null => {
      if (!roomList || roomList.length === 0) return null;

      // 1. Filter available (unbooked) rooms for selected dates
      const availableRooms = roomList.filter((r) => {
        const info = getRoomBookingInfo(r);
        return !(info.isBookedForSelectedDates || info.hasAnyBooking);
      });

      const pool = availableRooms.length > 0 ? availableRooms : roomList;

      // 2. Candidate rooms that can accommodate all guests
      const fittingRooms = pool.filter((r) => getRoomMaxAccommodation(r) >= guestCount);

      if (fittingRooms.length > 0) {
        // If currently selected room fits reasonably well, retain it
        if (currentSelectedId) {
          const current = fittingRooms.find((r) => r.id === currentSelectedId);
          if (current) {
            const currentExcess = getRoomMaxAccommodation(current) - guestCount;
            if (currentExcess >= 0 && currentExcess <= 2) {
              return current;
            }
          }
        }

        // Sort by closest fit (least excess), base capacity coverage, then price
        fittingRooms.sort((a, b) => {
          const maxA = getRoomMaxAccommodation(a);
          const maxB = getRoomMaxAccommodation(b);
          const excessA = maxA - guestCount;
          const excessB = maxB - guestCount;

          const baseA = getRoomBaseCapacity(a);
          const baseB = getRoomBaseCapacity(b);
          const baseFitA = baseA >= guestCount ? 0 : 1;
          const baseFitB = baseB >= guestCount ? 0 : 1;

          if (baseFitA !== baseFitB) return baseFitA - baseFitB;
          if (excessA !== excessB) return excessA - excessB;

          const priceA = a.pricing?.nightly || 1000;
          const priceB = b.pricing?.nightly || 1000;
          return priceA - priceB;
        });

        return fittingRooms[0];
      }

      // If no room fits all guests, recommend the highest capacity room
      const sortedByCapacity = [...pool].sort(
        (a, b) => getRoomMaxAccommodation(b) - getRoomMaxAccommodation(a)
      );
      return sortedByCapacity[0] || null;
    },
    [getRoomBookingInfo]
  );

  // Auto-recommend and select room for configured guest breakdown
  const autoRecommendRoomForGuests = useCallback(
    (adults: number, children: number, pwd: number, forceSelect: boolean = true) => {
      const totalCount = Math.max(1, adults + children + pwd);
      const currentSelectedId = selectedRoomIds.length > 0 ? selectedRoomIds[0] : undefined;
      const recommended = getRecommendedRoom(totalCount, rooms, currentSelectedId);
      if (!recommended) return null;

      if (forceSelect) {
        setSelectedRoomIds([recommended.id]);
        setSelectedRoomNumberFilter(recommended.id);

        const maxAcc = getRoomMaxAccommodation(recommended);
        const targetAdult = Math.min(maxAcc, Math.max(1, adults));
        handleSetRoomPaxQuantity(recommended.id, targetAdult);

        const remChild = Math.min(Math.max(0, maxAcc - targetAdult), children);
        setRoomChildPaxMap((prev) => ({ ...prev, [recommended.id]: remChild }));

        const remPwd = Math.min(Math.max(0, maxAcc - targetAdult - remChild), pwd);
        setRoomPwdPaxMap((prev) => ({ ...prev, [recommended.id]: remPwd }));
      }

      return recommended;
    },
    [rooms, selectedRoomIds, getRecommendedRoom, handleSetRoomPaxQuantity]
  );

  // Memoized recommended room based on current configured guests & date availability
  const recommendedRoom = useMemo(() => {
    const totalCount = Math.max(1, adultGuests + child6to10Guests + pwdGuests);
    const currentId = selectedRoomIds.length > 0 ? selectedRoomIds[0] : undefined;
    return getRecommendedRoom(totalCount, rooms, currentId);
  }, [adultGuests, child6to10Guests, pwdGuests, rooms, selectedRoomIds, getRecommendedRoom]);

  // Display rooms list: place auto-selected / recommended room on the first of the list
  const displayRooms = useMemo(() => {
    const targetRoomId = recommendedRoom?.id || (selectedRoomIds.length > 0 ? selectedRoomIds[0] : null);
    if (!targetRoomId) return rooms;

    return [...rooms].sort((a, b) => {
      if (a.id === targetRoomId) return -1;
      if (b.id === targetRoomId) return 1;
      return 0;
    });
  }, [rooms, recommendedRoom, selectedRoomIds]);

  // Auto recommend initial room selection if none preselected
  useEffect(() => {
    if (!preselectedRoomId && selectedRoomIds.length === 0 && rooms.length > 0) {
      autoRecommendRoomForGuests(adultGuests, child6to10Guests, pwdGuests, true);
    }
  }, [preselectedRoomId, rooms.length]);

  // Handlers for adjusting top-level guest headcount and automatically recommending the best room selection
  const handleUpdateAdultGuests = (newAdults: number) => {
    const val = Math.max(1, newAdults);
    setAdultGuests(val);
    autoRecommendRoomForGuests(val, child6to10Guests, pwdGuests, true);
  };

  const handleUpdateChildGuests = (newChildren: number) => {
    const val = Math.max(0, newChildren);
    setChild6to10Guests(val);
    autoRecommendRoomForGuests(adultGuests, val, pwdGuests, true);
  };

  const handleUpdatePwdGuests = (newPwd: number) => {
    const val = Math.max(0, newPwd);
    setPwdGuests(val);
    autoRecommendRoomForGuests(adultGuests, child6to10Guests, val, true);
  };

  // Toggle or cycle extra pax for an individual room (capped by max to add: 1 or 2)
  const handleToggleRoomExtraPax = (roomId: string, maxAllowed: number = 1) => {
    const roomObj = rooms.find((r) => r.id === roomId);
    const baseCap = roomObj ? getRoomBaseCapacity(roomObj) : 2;

    setRoomExtraPaxMap((prev) => {
      const current = prev[roomId] || 0;
      // Cycle: 0 -> 1 -> (if maxAllowed >= 2) 2 -> ... -> 0
      const nextVal = current >= maxAllowed ? 0 : current + 1;
      const updated = { ...prev };
      if (nextVal > 0) {
        updated[roomId] = nextVal;
      } else {
        delete updated[roomId];
      }

      // Synchronize roomPaxQuantityMap
      setRoomPaxQuantityMap((prevPax) => ({
        ...prevPax,
        [roomId]: baseCap + nextVal,
      }));

      const activeRoomIds = nextVal > 0 && !selectedRoomIds.includes(roomId)
        ? [...selectedRoomIds, roomId]
        : selectedRoomIds;

      if (nextVal > 0 && !selectedRoomIds.includes(roomId)) {
        setSelectedRoomIds(activeRoomIds);
        setSelectedRoomNumberFilter(roomId);
      }

      return updated;
    });
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Mandatory Slip File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlipUploadError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (< 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSlipUploadError('Payment slip file exceeds 10MB limit. Please upload a smaller image.');
        return;
      }

      setSlipFile(file);
      const preview = URL.createObjectURL(file);
      setSlipPreviewUrl(preview);

      // Read file and upload permanently to backend server
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64, name: file.name, folder: 'slip' })
            });
            const data = await res.json();
            if (data.success && data.url) {
              setSlipPreviewUrl(data.url);
            }
          } catch (uploadErr) {
            console.error('Failed to permanently store slip image:', uploadErr);
          }
        }
      };
      reader.readAsDataURL(file);
      
      if (formErrors.paymentSlip) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.paymentSlip;
          return next;
        });
      }
    }
  };

  const handleRemoveSlip = () => {
    setSlipFile(null);
    if (slipPreviewUrl) {
      if (slipPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(slipPreviewUrl);
      }
      setSlipPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  // Handle Form Submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!guestName.trim()) {
      errors.guestName = 'Please enter guest full name';
    }

    if (!guestAddress.trim()) {
      errors.guestAddress = 'Please enter guest address';
    }

    if (!guestPhone.trim()) {
      errors.guestPhone = 'Compulsory: Active mobile phone number is required for SMS check-in details';
    } else if (guestPhone.trim().length < 7) {
      errors.guestPhone = 'Please enter a valid phone number (e.g. 0917 568 1408)';
    }

    if (selectedRoomIds.length === 0) {
      errors.room = 'Please select at least one accommodation unit to proceed with your booking.';
    } else {
      const bookedUnits = selectedRooms.filter((r) => {
        const bInfo = getRoomBookingInfo(r);
        return bInfo.isBookedForSelectedDates || bInfo.hasAnyBooking;
      });
      if (bookedUnits.length > 0) {
        errors.room = `The following room(s) are already booked or reserved and cannot be chosen: ${bookedUnits.map((r) => r.roomNumber || r.title).join(', ')}. Please choose available units.`;
      }
    }

    // MANDATORY SLIP VALIDATION
    if (!slipFile && !slipPreviewUrl) {
      errors.paymentSlip = 'MANDATORY: You must upload a screenshot or photo of your payment deposit slip before submitting.';
      setSlipUploadError('Payment slip is required to lock this reservation.');
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      
      // Directional Guide: Find the first section with an error and scroll to it
      let targetId = "";
      let directionMsg = "";
      
      if (errors.room) {
        targetId = "booking-step-2";
        directionMsg = "Please select an accommodation unit first.";
      } else if (errors.guestName || errors.guestAddress || errors.guestPhone) {
        targetId = "booking-step-4";
        directionMsg = "Please complete your guest contact details.";
      } else if (errors.paymentSlip) {
        targetId = "booking-step-7";
        directionMsg = "Please upload your payment deposit slip to confirm.";
      }
      
      if (targetId) {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }

      if (directionMsg) {
        setCalendarNotice(`Required: ${directionMsg}`);
        setTimeout(() => setCalendarNotice(''), 6000);
      }

      return;
    }

    setFormErrors({});

    // Ensure slip URL is permanently saved to server
    let finalSlipUrl = slipPreviewUrl || undefined;
    if (slipFile && (!finalSlipUrl || finalSlipUrl.startsWith('blob:'))) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(slipFile);
        });
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, name: slipFile.name, folder: 'slip' }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          finalSlipUrl = uploadData.url;
          setSlipPreviewUrl(uploadData.url);
        }
      } catch (err) {
        console.error('Permanent slip upload error:', err);
      }
    }

    const formattedRoomTitle = selectedRoomsGrouped.length > 0
      ? selectedRoomsGrouped
          .map((g) => `${g.count > 1 ? `${g.count}x ` : ""}${g.category} (${g.roomNumbers.join(", ")})`)
          .join(" + ")
      : selectedRoom ? selectedRoom.title : 'Accommodation Unit';

    // Build confirmed booking record
    const newBooking: BookingRecord = {
      id: `DV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      roomId: selectedRoomIds.join(","),
      roomTitle: formattedRoomTitle,
      stayType: stayType,
      checkInDate: stayType === 'nightly' ? checkInDate : undefined,
      checkOutDate: stayType === 'nightly' ? checkOutDate : undefined,
      numberOfNights: stayType === 'nightly' ? calculatedNights : undefined,
      hourlyDate: stayType === 'hourly' ? hourlyDate : undefined,
      hourlyStartTime: stayType === 'hourly' ? hourlyStartTime : undefined,
      hourlyDurationHours: stayType === 'hourly' ? hourlyDuration : undefined,
      adultGuests: adultGuests,
      childGuests: childGuests,
      child6to10Guests: child6to10Guests,
      child1to5Guests: child1to5Guests,
      addons: availableAddons
        .filter((addon) => (addonQuantities[addon.id] || 0) > 0)
        .map((addon) => {
          const qty = addonQuantities[addon.id];
          const cost = getAddonCost(addon, qty);
          return {
            id: addon.id,
            name: addon.name,
            quantity: qty,
            cost: cost,
          };
        }),
      baseRatePerUnit: Math.round(baseStayRate / (stayType === 'nightly' ? calculatedNights : 1)),
      baseStayTotal: baseStayRate,
      addonsTotal: addonsTotal,
      discountAmount: 0,
      grandTotal: grandTotal,
      paymentOption: paymentOption,
      amountPaidNow: amountPayableNow,
      remainingBalance: remainingBalance,
      paymentMethod: paymentMethod,
      paymentSlipUrl: finalSlipUrl,
      paymentSlipFileName: slipFile?.name || 'payment_slip.jpg',
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestAddress: guestAddress.trim(),
      guestEmail: guestEmail.trim() || undefined,
      guestUsername: guestUsername.trim() || undefined,
      guestPassword: guestPassword.trim() || undefined,
      status: 'Pending Slip Review',
      staffNotes: `Online reservation for ${formattedRoomTitle}. Occupancy: ${totalPax} pax.${Object.values(roomPwdPaxMap).reduce((a, b) => a + b, 0) > 0 ? ` Declared PWD: ${Object.values(roomPwdPaxMap).reduce((a, b) => a + b, 0)} Pax (Confirmation ID required upon check-in).` : ''} Payment: ${paymentOption === 'partial_40' ? '40% Partial Downpayment' : '100% Full Payment'}. Slip attached.`,
    };

    // Automatic Guest Account Registration upon reservation
    try {
      registerGuestAccount({
        username: guestUsername.trim() || (guestPhone.trim() ? `guest_${guestPhone.replace(/[^0-9]/g, "").slice(-4)}` : `guest_${Date.now().toString().slice(-4)}`),
        password: guestPassword.trim() || undefined,
        fullName: guestName.trim(),
        phone: guestPhone.trim(),
        email: guestEmail.trim() || undefined,
        bookingId: newBooking.id,
      });

      const storedIds: string[] = JSON.parse(localStorage.getItem("diversion_vigan_my_booking_ids") || "[]");
      if (!storedIds.includes(newBooking.id)) {
        storedIds.unshift(newBooking.id);
        localStorage.setItem("diversion_vigan_my_booking_ids", JSON.stringify(storedIds));
      }
    } catch (e) {
      console.error("Error storing automatic guest registration:", e);
    }

    onBookingCreated(newBooking);
  };

  return (
    <div id="book-now" className="space-y-8 scroll-mt-24">
      {/* Modern Animated Back Button */}
      {onBack && (
        <div className="flex items-center justify-between gap-4">
          <ModernBackButton 
            onClick={onBack}
            label="Back to Main Page"
            sublabel="Explore accommodations & resort"
          />
        </div>
      )}
      


      {/* 4-Step Booking Procedure Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3] shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E6D7C3]/60 pb-3 gap-2">
          <div>
            <div className="text-[10px] font-bold text-[#8B6B10] uppercase tracking-[0.18em]">Easy Reservation Guide</div>
            <h3 className="font-serif font-bold text-xl text-[#2C1E15]">Diversion Vigan Booking Procedure</h3>
          </div>
          <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
            Step {currentBookingStep} of 4 Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { step: 1, title: 'Dates, Rooms, Guests & Extras', desc: 'Check-in, rooms, pax & extras' },
            { step: 2, title: 'Guest Details', desc: 'Contact & phone registration' },
            { step: 3, title: 'Payment Terms', desc: '40% downpayment or full payment' },
            { step: 4, title: 'Slip & Voucher', desc: 'Upload payment slip & get voucher' },
          ].map((item) => {
            const isActive = currentBookingStep === item.step;
            const isAccessible = item.step <= maxReachedStep;
            return (
              <div
                key={`proc-step-${item.step}`}
                onClick={() => {
                  if (isAccessible) {
                    setCurrentBookingStep(item.step);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }
                }}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-1 transition-all ${
                  isActive
                    ? 'bg-[#2C1E15] text-white border-[#2C1E15] shadow-md ring-2 ring-amber-500/50 cursor-pointer'
                    : isAccessible
                    ? 'bg-white text-[#2C1E15] border-[#E6D7C3] hover:border-amber-400 cursor-pointer'
                    : 'bg-[#FAF7F2] text-[#786150] border-[#E6D7C3]/50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-6 h-6 rounded-full font-extrabold text-xs flex items-center justify-center ${
                    isActive ? 'bg-amber-400 text-[#2C1E15]' : 'bg-[#2C1E15] text-amber-300'
                  }`}>
                    {item.step}
                  </span>
                  <span className={`text-[9px] uppercase font-bold ${isActive ? 'text-amber-200' : 'text-[#786150]'}`}>Step {item.step}</span>
                </div>
                <div>
                  <div className={`font-bold text-xs leading-snug ${isActive ? 'text-white' : 'text-[#2C1E15]'}`}>{item.title}</div>
                  <div className={`text-[10px] leading-tight ${isActive ? 'text-amber-100/80' : 'text-[#786150]'}`}>{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className={`grid grid-cols-1 ${currentBookingStep === 3 ? 'lg:grid-cols-12' : ''} gap-8 items-start`}>
        
        {/* Left Column: Interactive Booking Engine Form */}
        <div className={`${currentBookingStep === 3 ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-8`}>
          
          <form onSubmit={handleSubmitBooking} className="space-y-8">
            
            {/* STEP 1 VIEW: Dates, Rooms, Guests & Add-Ons */}
            {currentBookingStep === 1 && (
              <div className="space-y-8 animate-in fade-in duration-300">
             <div id="booking-step-1" className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-7 border border-[#E6D7C3] shadow-lg space-y-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E6D7C3] pb-4 gap-3">
                 <div className="flex items-center gap-3">
                   <span className="w-8 h-8 rounded-full bg-[#2C1E15] text-white font-bold flex items-center justify-center text-sm">
                     1
                   </span>
                   <div>
                     <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Dates of Stay &amp; Rooms &amp; Guests</h3>
                     <p className="text-xs text-[#786150]">Select your check-in, check-out, and guest occupancy</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <button
                     type="button"
                     onClick={() => setStayType('nightly')}
                     className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                       stayType === 'nightly' ? 'bg-[#2C1E15] text-white shadow-xs' : 'bg-white text-[#786150] border border-[#E6D7C3]'
                     }`}
                   >
                     Nightly Stay
                   </button>
                   <button
                     type="button"
                     onClick={() => setStayType('hourly')}
                     className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                       stayType === 'hourly' ? 'bg-[#2C1E15] text-white shadow-xs' : 'bg-white text-[#786150] border border-[#E6D7C3]'
                     }`}
                   >
                     Hourly / Short Rest
                   </button>
                 </div>
               </div>

               {stayType === 'nightly' ? (
                 <div className="space-y-6">
                   {/* Top Summary Bar as in calendar.png */}
                   <div className="bg-white p-4 rounded-2xl border border-[#E6D7C3] grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                     <div>
                       <span className="text-[10px] font-bold text-[#786150] uppercase tracking-wider block">Dates of Stay</span>
                       <span className="font-serif font-bold text-[#2C1E15] text-sm">Nightly Reservation</span>
                     </div>
                     <div>
                       <span className="text-[10px] font-bold text-[#786150] uppercase tracking-wider block mb-0.5">Check-in</span>
                       <select
                         value={checkInDate}
                         onChange={(e) => {
                           const newIn = e.target.value;
                           setCheckInDate(newIn);
                           if (newIn && (!checkOutDate || checkOutDate <= newIn)) {
                             const d = new Date(newIn);
                             d.setDate(d.getDate() + 1);
                             setCheckOutDate(d.toISOString().split('T')[0]);
                           }
                         }}
                         className="w-full bg-[#FAF7F2] border border-[#E6D7C3] rounded-lg px-2 py-1 text-xs font-bold text-[#2C1E15] outline-none cursor-pointer"
                       >
                         <option value="">Select check-in</option>
                         {availableDateOptions.map((opt) => (
                           <option key={"ci-opt-" + opt.dateStr} value={opt.dateStr}>
                             {opt.label}
                           </option>
                         ))}
                       </select>
                     </div>
                     <div>
                       <span className="text-[10px] font-bold text-[#786150] uppercase tracking-wider block mb-0.5">Check-out</span>
                       <select
                         value={checkOutDate}
                         onChange={(e) => setCheckOutDate(e.target.value)}
                         className="w-full bg-[#FAF7F2] border border-[#E6D7C3] rounded-lg px-2 py-1 text-xs font-bold text-[#2C1E15] outline-none cursor-pointer"
                       >
                         <option value="">Select check-out</option>
                         {availableDateOptions
                           .filter((opt) => !checkInDate || opt.dateStr > checkInDate)
                           .map((opt) => (
                             <option key={"ci-opt-" + opt.dateStr} value={opt.dateStr}>
                               {opt.label}
                             </option>
                           ))}
                       </select>
                     </div>
                     <div>
                       <span className="text-[10px] font-bold text-[#786150] uppercase tracking-wider block">Duration</span>
                       <span className="font-bold text-[#2C1E15]">{calculatedNights + 1}D, {calculatedNights}N</span>
                     </div>
                   </div>

                   {/* Dual-Column Layout: Dual-Month Calendar on Left, Rooms & Guests Panel on Right matching calendar.png */}
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                     
                     {/* Left: Dual Month Calendar View */}
                     <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-[#E6D7C3] shadow-xs space-y-6">
                       
                       {/* Month Navigation & Headers */}
                       <div className="flex items-center justify-between px-2">
                         <button
                           type="button"
                           onClick={() => {
                             const d = new Date(calendarYear, calendarMonth - 2, 1);
                             setCalendarYear(d.getFullYear());
                             setCalendarMonth(d.getMonth() + 1);
                           }}
                           className="p-1.5 rounded-lg border border-[#E6D7C3] hover:bg-[#FAF7F2] text-[#2C1E15] cursor-pointer"
                           title="Previous Month"
                         >
                           ‹
                         </button>
                         <div className="text-center font-serif font-bold text-sm text-[#2C1E15] uppercase tracking-wider">
                           {new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                           {' & '}
                           {new Date(calendarMonth === 12 ? calendarYear + 1 : calendarYear, calendarMonth === 12 ? 0 : calendarMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                         </div>
                         <button
                           type="button"
                           onClick={() => {
                             const d = new Date(calendarYear, calendarMonth, 1);
                             setCalendarYear(d.getFullYear());
                             setCalendarMonth(d.getMonth() + 1);
                           }}
                           className="p-1.5 rounded-lg border border-[#E6D7C3] hover:bg-[#FAF7F2] text-[#2C1E15] cursor-pointer"
                           title="Next Month"
                         >
                           ›
                         </button>
                       </div>

                       {/* Side-by-Side Dual Month Grids */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         
                         {/* Month 1 */}
                          {(() => {
                            const mYear = calendarYear;
                            const mMonth = calendarMonth;
                            const days = getDaysInMonth(mYear, mMonth);
                            const monthName = new Date(mYear, mMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
                            
                            return (
                              <div className="space-y-3">
                                <div className="text-center font-bold text-xs text-[#2C1E15] tracking-wider">{monthName}</div>
                                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#786150]">
                                  <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {days.map((dateStr, idx) => {
                                    if (!dateStr) return <div key={`empty-1-${idx}`} />;
                                    const [y, m, d] = dateStr.split('-').map(Number);
                                    const isToday = dateStr === todayStr;
                                    const isPast = dateStr < todayStr;
                                    const isCheckIn = dateStr === checkInDate;
                                    const isCheckOut = dateStr === checkOutDate;
                                    const isInRange = dateStr > checkInDate && dateStr < checkOutDate;

                                    return (
                                      <button
                                        key={`cal-1-${dateStr}`}
                                        type="button"
                                        disabled={isPast}
                                        onClick={() => {
                                          if (dateStr < checkInDate || !checkInDate) {
                                            setCheckInDate(dateStr);
                                            setCheckOutDate(getNextDayStr(dateStr, 1));
                                          } else {
                                            setCheckOutDate(dateStr);
                                          }
                                        }}
                                        className={`h-10 rounded-xl text-center flex items-center justify-center transition-all cursor-pointer ${
                                          isCheckIn || isCheckOut
                                            ? 'bg-[#2C1E15] text-white font-bold ring-2 ring-amber-500 shadow-sm'
                                            : isInRange
                                            ? 'bg-[#F5EBE6] text-[#2C1E15] font-semibold'
                                            : isToday
                                            ? 'bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 border border-amber-300 shadow-xs'
                                            : isPast
                                            ? 'bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed'
                                            : 'bg-[#FAF7F2] hover:bg-[#E6D7C3]/50 text-[#2C1E15] font-medium'
                                        }`}
                                      >
                                        <span className="text-xs font-bold">{d}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Month 2 */}
                          {(() => {
                            const mYear = calendarMonth === 12 ? calendarYear + 1 : calendarYear;
                            const mMonth = calendarMonth === 12 ? 1 : calendarMonth + 1;
                            const days = getDaysInMonth(mYear, mMonth);
                            const monthName = new Date(mYear, mMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
                            
                            return (
                              <div className="space-y-3">
                                <div className="text-center font-bold text-xs text-[#2C1E15] tracking-wider">{monthName}</div>
                                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#786150]">
                                  <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {days.map((dateStr, idx) => {
                                    if (!dateStr) return <div key={`empty-2-${idx}`} />;
                                    const [y, m, d] = dateStr.split('-').map(Number);
                                    const isToday = dateStr === todayStr;
                                    const isPast = dateStr < todayStr;
                                    const isCheckIn = dateStr === checkInDate;
                                    const isCheckOut = dateStr === checkOutDate;
                                    const isInRange = dateStr > checkInDate && dateStr < checkOutDate;

                                    return (
                                      <button
                                        key={`cal-2-${dateStr}`}
                                        type="button"
                                        disabled={isPast}
                                        onClick={() => {
                                          if (dateStr < checkInDate || !checkInDate) {
                                            setCheckInDate(dateStr);
                                            setCheckOutDate(getNextDayStr(dateStr, 1));
                                          } else {
                                            setCheckOutDate(dateStr);
                                          }
                                        }}
                                        className={`h-10 rounded-xl text-center flex items-center justify-center transition-all cursor-pointer ${
                                          isCheckIn || isCheckOut
                                            ? 'bg-[#2C1E15] text-white font-bold ring-2 ring-amber-500 shadow-sm'
                                            : isInRange
                                            ? 'bg-[#F5EBE6] text-[#2C1E15] font-semibold'
                                            : isToday
                                            ? 'bg-amber-100 text-amber-950 font-black ring-2 ring-amber-400 border border-amber-300 shadow-xs'
                                            : isPast
                                            ? 'bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed'
                                            : 'bg-[#FAF7F2] hover:bg-[#E6D7C3]/50 text-[#2C1E15] font-medium'
                                        }`}
                                      >
                                        <span className="text-xs font-bold">{d}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                        </div>

                      </div>

                      {/* Right: Guest Headcount & Occupancy Panel */}
                     <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#E6D7C3] shadow-xs space-y-5">
                       <div className="border-b border-[#E6D7C3]/60 pb-3">
                         <h4 className="font-serif font-bold text-base text-[#2C1E15]">Guests</h4>
                         <p className="text-[11px] text-[#786150]">Configure guest occupancy for your stay</p>
                       </div>

                       <div className="space-y-4">
                         <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E6D7C3]/60 space-y-3.5">
                           {/* Adults Counter: 10+ years */}
                           <div className="flex items-center justify-between gap-2">
                             <div>
                               <span className="text-xs font-bold text-[#2C1E15] block uppercase tracking-wider">ADULTS</span>
                               <span className="text-[10px] text-[#786150] font-medium">10+ years</span>
                             </div>
                             <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-[#E6D7C3]">
                               <button
                                 type="button"
                                 onClick={() => handleUpdateAdultGuests(adultGuests - 1)}
                                 disabled={adultGuests <= 1}
                                 className="w-6 h-6 rounded-lg bg-[#FAF7F2] text-[#2C1E15] font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer hover:bg-stone-200"
                               >
                                 -
                               </button>
                               <span className="w-6 text-center text-xs font-bold">{adultGuests}</span>
                               <button
                                 type="button"
                                 onClick={() => handleUpdateAdultGuests(adultGuests + 1)}
                                 className="w-6 h-6 rounded-lg bg-[#2C1E15] text-white font-bold flex items-center justify-center cursor-pointer hover:bg-[#4A3525]"
                               >
                                 +
                               </button>
                             </div>
                           </div>

                           {/* Children Counter: 0-3+ years */}
                           <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#E6D7C3]/50">
                             <div>
                               <span className="text-xs font-bold text-[#2C1E15] block uppercase tracking-wider">CHILDREN</span>
                               <span className="text-[10px] text-[#786150] font-medium">0-3+ years</span>
                             </div>
                             <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-[#E6D7C3]">
                               <button
                                 type="button"
                                 onClick={() => handleUpdateChildGuests(child6to10Guests - 1)}
                                 disabled={child6to10Guests <= 0}
                                 className="w-6 h-6 rounded-lg bg-[#FAF7F2] text-[#2C1E15] font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer hover:bg-stone-200"
                               >
                                 -
                               </button>
                               <span className="w-6 text-center text-xs font-bold">{child6to10Guests}</span>
                               <button
                                 type="button"
                                 onClick={() => handleUpdateChildGuests(child6to10Guests + 1)}
                                 className="w-6 h-6 rounded-lg bg-[#2C1E15] text-white font-bold flex items-center justify-center cursor-pointer hover:bg-[#4A3525]"
                               >
                                 +
                               </button>
                             </div>
                           </div>

                           {/* PWD Pax Counter */}
                           <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#E6D7C3]/50">
                             <div>
                               <span className="text-xs font-bold text-[#2C1E15] block uppercase tracking-wider">PWD PAX</span>
                               <span className="text-[9.5px] text-amber-800 font-semibold block leading-tight">
                                 Confirmation ID upon check-in
                                </span>
                             </div>
                             <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-[#E6D7C3]">
                               <button
                                 type="button"
                                 onClick={() => handleUpdatePwdGuests(pwdGuests - 1)}
                                 disabled={pwdGuests <= 0}
                                 className="w-6 h-6 rounded-lg bg-[#FAF7F2] text-[#2C1E15] font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer hover:bg-stone-200"
                               >
                                 -
                               </button>
                               <span className="w-6 text-center text-xs font-bold">{pwdGuests}</span>
                               <button
                                 type="button"
                                 onClick={() => handleUpdatePwdGuests(pwdGuests + 1)}
                                 className="w-6 h-6 rounded-lg bg-[#2C1E15] text-white font-bold flex items-center justify-center cursor-pointer hover:bg-[#4A3525]"
                               >
                                 +
                               </button>
                             </div>
                           </div>
                         </div>

                         {/* Live Total Configured Occupancy Badge */}
                         <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                           <span className="font-semibold text-amber-900">Total Configured Pax:</span>
                           <span className="font-bold text-[#2C1E15] bg-white px-2 py-0.5 rounded-lg border border-amber-300">
                             {adultGuests + child6to10Guests + pwdGuests} Guests
                           </span>
                         </div>

                         {/* Auto-Recommended Room Callout */}
                         {recommendedRoom && (
                           <div className="p-3 bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 rounded-xl border border-amber-300 shadow-2xs space-y-1.5 animate-in fade-in duration-200">
                             <div className="flex items-center justify-between gap-1.5">
                               <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                 <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                                 <span>Auto-Recommended Room</span>
                               </span>
                               <span className="text-[9px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-wider">
                                 Auto-Selected
                               </span>
                             </div>
                             <div className="flex items-center justify-between text-xs font-bold text-[#2C1E15]">
                               <span className="truncate">{recommendedRoom.roomNumber || recommendedRoom.title}</span>
                               <span className="text-[11px] text-amber-800 font-extrabold shrink-0 ml-1">
                                 {recommendedRoom.category}
                               </span>
                             </div>
                             <p className="text-[10.5px] text-[#786150] leading-tight">
                               Best fit for your group of <strong>{adultGuests + child6to10Guests + pwdGuests} guests</strong> (Capacity: {getRoomMaxAccommodation(recommendedRoom)} Pax).
                             </p>
                           </div>
                         )}

                         {/* IATA Code Selector */}
                         <div className="space-y-1 pt-1">
                           <label className="block text-[10px] font-bold text-[#786150] uppercase tracking-wider">IATA Code</label>
                           <select className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-white text-xs font-medium text-[#2C1E15] outline-none">
                             <option value="">Select or leave blank</option>
                             <option value="AGENCY">Travel Agency Code</option>
                             <option value="CORP">Corporate Partner Code</option>
                           </select>
                         </div>

                       </div>

                     </div>

                   </div>

                 </div>
               ) : (
                 /* Hourly Schedule Inputs */
                 <div className="space-y-4">
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     <div>
                       <label className="block text-xs font-bold text-[#2C1E15] mb-1">Date of Stay</label>
                       <input
                         type="date"
                         value={hourlyDate}
                         min={todayStr}
                         onChange={(e) => setHourlyDate(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none"
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-[#2C1E15] mb-1">Target Start Time</label>
                       <input
                         type="time"
                         value={hourlyStartTime}
                         onChange={(e) => setHourlyStartTime(e.target.value)}
                         className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none"
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-[#2C1E15] mb-1">Duration Block</label>
                       <select
                         value={hourlyDuration}
                         onChange={(e) => setHourlyDuration(Number(e.target.value) as 3 | 6 | 12)}
                         className="w-full px-3 py-2 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-semibold outline-none"
                       >
                         <option value={3}>3 Hours Wash-up</option>
                         <option value={6}>6 Hours Short Stay</option>
                       </select>
                     </div>
                   </div>

                   <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                     <span>Selected Rate for {hourlyDuration} Hours:</span>
                     <span className="font-bold text-sm">
                       ₱{(selectedRoom ? (hourlyDuration === 3 
                         ? selectedRoom.pricing.hourly3hr 
                         : selectedRoom.pricing.hourly6hr || 800) : (hourlyDuration === 3 ? 500 : 800))?.toLocaleString()}
                     </span>
                   </div>
                 </div>
               )}

             </div>

            {/* STEP 1: Select Accommodation Unit (Dropdown Option for all rooms) */}
            <div id="booking-step-2" className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3]/60 shadow-lg space-y-5">
              <div className="flex items-center justify-between border-b border-[#E6D7C3]/40 pb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Select Room</h3>
                    <p className="text-xs text-[#786150]">Choose your preferred room from the dropdown menu</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                  {selectedRoom ? (
                    <>
                      {recommendedRoom?.id === selectedRoom.id && (
                        <Sparkles className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
                      )}
                      <span>
                        {recommendedRoom?.id === selectedRoom.id ? 'Auto-Recommended: ' : ''}
                        {selectedRoom.roomNumber || selectedRoom.category}
                      </span>
                    </>
                  ) : (
                    'No Unit Selected'
                  )}
                </span>
              </div>

              {/* Room Selection Dropdown */}
              <div className="space-y-4">
                <div>
                  <div className="mb-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#2C1E15] uppercase tracking-wider">
                        Accommodation Unit (All Rooms) — Multiple Choices Allowed
                      </label>
                      <p className="text-[11px] text-[#786150]">
                        Choose your pax and click the room number to see the actual rate • <span className="text-red-700 font-bold inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span> Highlighted in red = Already Booked</span>
                      </p>
                    </div>
                  </div>

                  {/* Multiple Choice Interactive Room Number Grid View */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 mb-3 p-1.5 sm:p-2.5 bg-[#FAF7F2] rounded-2xl border border-[#E6D7C3]/80">
                    {displayRooms.map((room) => {
                      const isSelected = selectedRoomIds.includes(room.id);
                      const bookingInfo = getRoomBookingInfo(room);
                      const isBookedForDates = bookingInfo.isBookedForSelectedDates;
                      const hasAnyBooking = bookingInfo.hasAnyBooking;
                      const roomUnitName = room.roomNumber || room.title.split("–")[0].trim();
                      const capText = (room.id === 'room-0' || room.id === 'room-1' || room.id === 'room-12' || room.id === 'room-18' || room.id === 'room-7')
                        ? '8 Pax'
                        : (room.id === 'room-2' || room.id === 'room-3')
                        ? '10 Pax'
                        : (room.id === 'room-4' || room.id === 'room-5' || room.id === 'room-6')
                        ? '7 Pax'
                        : (room.id === 'room-8' || room.id === 'room-9' || room.id === 'room-10')
                        ? (room.capacity?.recommended || '3 Pax')
                        : (room.id === 'room-11')
                        ? '2 Pax'
                        : (room.capacity?.recommended || `${room.capacity?.maxGuests || 3} Pax`);
                      const maxExtraPax = getRoomMaxExtraPax(room);
                      const baseCap = getRoomBaseCapacity(room);
                      const maxAcc = getRoomMaxAccommodation(room);
                      const isEligibleForExtraPax = maxExtraPax > 0;
                      const currentRoomExtraPax = roomExtraPaxMap[room.id] || 0;
                      const currentPaxQuantity = roomPaxQuantityMap[room.id] || (currentRoomExtraPax > 0 ? baseCap + currentRoomExtraPax : baseCap);
                      const currentChildQuantity = roomChildPaxMap[room.id] || 0;
                      const currentPwdQuantity = roomPwdPaxMap[room.id] || 0;
                      const totalCombinedPax = currentPaxQuantity + currentChildQuantity + currentPwdQuantity;

                      const roomExtras = roomExtrasMap[room.id] || {};
                      const roomExtrasTotalQty = Object.values(roomExtras).reduce((a, b) => a + b, 0);
                      const roomExtrasTotalCost = Object.entries(roomExtras).reduce((acc, [extraId, qty]) => {
                        const item = availableAddons.find((a) => a.id === extraId);
                        return acc + (item ? getAddonCost(item, qty) : 0);
                      }, 0);
                      const isExtrasExpanded = !!expandedExtrasRoomIds[room.id];

                      const isEffectivelyBooked = isBookedForDates || hasAnyBooking;
                      const isRecommended = recommendedRoom?.id === room.id;

                      const toggleRoomSelection = () => {
                        if (isSelected) {
                          const remainingIds = selectedRoomIds.filter((id) => id !== room.id);
                          setSelectedRoomIds(remainingIds);
                          if (roomExtraPaxMap[room.id]) {
                            setRoomExtraPaxMap((prev) => {
                              const updated = { ...prev };
                              delete updated[room.id];
                              return updated;
                            });
                          }
                          if (roomChildPaxMap[room.id]) {
                            setRoomChildPaxMap((prev) => {
                              const updated = { ...prev };
                              delete updated[room.id];
                              return updated;
                            });
                          }
                          if (roomPwdPaxMap[room.id]) {
                            setRoomPwdPaxMap((prev) => {
                              const updated = { ...prev };
                              delete updated[room.id];
                              return updated;
                            });
                          }
                          if (roomExtrasMap[room.id]) {
                            setRoomExtrasMap((prev) => {
                              const updated = { ...prev };
                              delete updated[room.id];
                              return updated;
                            });
                          }
                        } else {
                          // Automatically apply the configured pax (Adults, Children, PWD) to the chosen room card
                          const targetAdult = Math.min(maxAcc, Math.max(1, roomPaxQuantityMap[room.id] || adultGuests || baseCap));
                          handleSetRoomPaxQuantity(room.id, targetAdult);

                          const targetChild = Math.min(
                            Math.max(0, maxAcc - targetAdult),
                            roomChildPaxMap[room.id] !== undefined ? roomChildPaxMap[room.id] : child6to10Guests
                          );
                          if (targetChild > 0) {
                            setRoomChildPaxMap((prev) => ({ ...prev, [room.id]: targetChild }));
                          }

                          const targetPwd = Math.min(
                            Math.max(0, maxAcc - targetAdult - targetChild),
                            roomPwdPaxMap[room.id] !== undefined ? roomPwdPaxMap[room.id] : pwdGuests
                          );
                          if (targetPwd > 0) {
                            setRoomPwdPaxMap((prev) => ({ ...prev, [room.id]: targetPwd }));
                          }

                          setSelectedRoomIds([...selectedRoomIds, room.id]);
                        }
                      };

                      // Completely prevent clicks and pointer events for booked rooms in the grid
                      const handleGridClick = (e: React.MouseEvent) => {
                        if (isEffectivelyBooked) {
                          e.preventDefault();
                          e.stopPropagation();
                          const reason = isBookedForDates 
                            ? `already booked for ${stayType === 'nightly' ? `${checkInDate} to ${checkOutDate}` : hourlyDate}`
                            : `reserved/booked`;
                          setCalendarNotice(`Unavailable: ${roomUnitName} is ${reason}. Booked rooms cannot be chosen.`);
                          setTimeout(() => setCalendarNotice(''), 5000);
                          return;
                        }
                        toggleRoomSelection();
                      };

                      return (
                        <div
                          key={`unit-choice-${room.id}`}
                          role="button"
                          tabIndex={isEffectivelyBooked ? -1 : 0}
                          aria-disabled={isEffectivelyBooked}
                          onClick={handleGridClick}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleRoomSelection();
                            }
                          }}
                          className={`w-full p-2.5 sm:p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-2.5 select-none shadow-2xs overflow-hidden ${
                            isEffectivelyBooked
                              ? "bg-red-50 text-red-950 border-2 border-red-500 ring-2 ring-red-300 opacity-80 cursor-not-allowed"
                              : isSelected
                              ? "bg-[#2C1E15] text-white border-[#2C1E15] shadow-xs ring-2 ring-amber-500/40 cursor-pointer"
                              : isRecommended
                              ? "bg-amber-50/40 text-[#2C1E15] border-amber-400 ring-2 ring-amber-300/80 hover:bg-[#FDFBF7] cursor-pointer"
                              : "bg-white text-[#2C1E15] border-[#E6D7C3] hover:border-amber-400 hover:bg-[#FDFBF7] cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                isEffectivelyBooked
                                  ? "bg-red-600 text-white font-black"
                                  : isSelected
                                  ? "bg-amber-400 text-[#2C1E15]"
                                  : "border border-[#C8B29E] bg-[#FDFBF7]"
                              }`}
                            >
                              {isEffectivelyBooked ? "✕" : isSelected ? "✓" : ""}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`font-bold text-xs sm:text-sm truncate ${isEffectivelyBooked ? "text-red-950 font-black" : ""}`}>
                                    {roomUnitName}
                                  </span>
                                  {isRecommended && !isEffectivelyBooked && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 border border-amber-500 text-[8.5px] font-black text-[#2C1E15] shadow-xs uppercase tracking-wider shrink-0">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-950 shrink-0" />
                                      <span>Recommended</span>
                                    </span>
                                  )}
                                  {/* View Room Button - Prominent inside card header */}
                                  {!isEffectivelyBooked && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInspectRoom(room);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 border border-amber-300 text-[9px] font-black text-amber-900 hover:bg-amber-200 hover:border-amber-400 transition-all cursor-pointer shadow-2xs active:scale-95 ml-1 whitespace-nowrap"
                                    >
                                      <Eye className="w-2.5 h-2.5" />
                                      <span>VIEW ROOM</span>
                                    </button>
                                  )}
                                  {isEffectivelyBooked && (
                                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-red-600 text-white shadow-xs shrink-0 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                      Booked
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? "bg-amber-900/60 text-amber-200 border border-amber-500/30"
                                    : isEffectivelyBooked
                                    ? "bg-red-200/80 text-red-900 border border-red-300"
                                    : "bg-amber-50 text-amber-900 border border-amber-200"
                                }`}>
                                  {room.category}
                                </span>
                              </div>
                              <span className={`text-[10px] block mt-0.5 font-semibold ${isSelected ? "text-stone-300" : isEffectivelyBooked ? "text-red-800" : "text-[#786150]"}`}>
                                {room.id === 'private-villa-pool'
                                  ? 'Good for 10 Pax (Max 20 Pax)'
                                  : (room.id === 'room-14' || room.id === 'room-15' || room.id === 'room-16')
                                  ? `Good for 4–5 Pax (Max ${maxAcc} Pax)`
                                  : (room.id === 'room-8' || room.id === 'room-9' || room.id === 'room-10')
                                  ? `Good for 3 Pax (Max ${maxAcc} Pax)`
                                  : (room.id === 'room-11')
                                  ? `Max ${maxAcc} Pax`
                                  : `Good for ${capText.replace(/^(good for|Good for)\s*/i, '')} (Max ${maxAcc} Pax)`}
                              </span>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className={`text-[9.5px] italic font-bold ${isSelected ? "text-amber-200/90" : isEffectivelyBooked ? "text-red-700" : "text-[#8B6B10]"}`}>
                                  1-3 years old: FREE (w/out bed)
                                </span>
                                <span className={`text-[9.5px] font-medium flex items-center gap-1 ${isSelected ? "text-amber-200/90" : isEffectivelyBooked ? "text-stone-400" : "text-[#786150]"}`}>
                                  • <span className="font-semibold text-amber-700 dark:text-amber-300">PWD Pax:</span> Confirmation ID upon check-in
                                </span>
                              </div>
                              {isEffectivelyBooked ? (
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-red-700 bg-red-100/90 px-2 py-0.5 rounded-md border border-red-300">
                                  <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                                  <span>{isBookedForDates ? `Already Booked for ${stayType === 'nightly' ? `${checkInDate} → ${checkOutDate}` : hourlyDate}` : 'This unit is currently reserved/booked'}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Card Footer: Pax / Occupancy Selector inside each room card */}
                          <div className="pt-2 border-t border-[#E6D7C3]/30 w-full">
                            {isEffectivelyBooked ? (
                              <div className="flex items-center justify-between gap-2 w-full py-1.5 px-3 bg-red-100/90 rounded-xl border border-red-300 text-red-900 text-xs font-bold flex-wrap">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                  <span className="truncate">Unit is already booked or reserved</span>
                                </div>
                                <span className="text-[10px] uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full font-black shrink-0">
                                  Unavailable
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full">
                                {/* Pax Selector with Pax Rate beside it */}
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold transition-all shrink-0 max-w-full ${
                                    isSelected
                                      ? "bg-amber-950/70 border-amber-400/50 text-amber-100"
                                      : "bg-[#FAF7F2] border-[#E6D7C3] text-[#2C1E15]"
                                  }`}
                                  title={`Select Pax / Occupancy for ${roomUnitName}`}
                                >
                                  <Users className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : "text-amber-800"} shrink-0`} />
                                  <span className={`text-[10px] font-bold ${isSelected ? "text-amber-200" : "text-[#786150]"} uppercase shrink-0`}>
                                    Pax:
                                  </span>
                                  <select
                                    value={currentPaxQuantity}
                                    onChange={(e) => {
                                      const selectedPax = Number(e.target.value);
                                      handleSetRoomPaxQuantity(room.id, selectedPax);
                                      const overflow = selectedPax + currentChildQuantity + currentPwdQuantity - maxAcc;
                                      if (overflow > 0) {
                                        let rem = overflow;
                                        if (currentPwdQuantity > 0) {
                                          const redPwd = Math.min(rem, currentPwdQuantity);
                                          setRoomPwdPaxMap((prev) => ({ ...prev, [room.id]: Math.max(0, currentPwdQuantity - redPwd) }));
                                          rem -= redPwd;
                                        }
                                        if (rem > 0 && currentChildQuantity > 0) {
                                          const redChild = Math.min(rem, currentChildQuantity);
                                          setRoomChildPaxMap((prev) => ({ ...prev, [room.id]: Math.max(0, currentChildQuantity - redChild) }));
                                        }
                                      }
                                    }}
                                    className={`rounded px-1.5 py-0.5 text-xs font-bold outline-none cursor-pointer border shrink-0 ${
                                      isSelected
                                        ? "bg-[#2C1E15] text-amber-200 border-amber-500/40"
                                        : "bg-white text-[#2C1E15] border-[#E6D7C3]"
                                    }`}
                                  >
                                    {Array.from({ length: maxAcc }, (_, i) => i + 1).map((paxNum) => (
                                      <option key={paxNum} value={paxNum} className="bg-white text-[#2C1E15]">
                                        {paxNum} Pax
                                      </option>
                                    ))}
                                  </select>
                                  <span className={`text-[11px] font-mono font-bold ml-0.5 sm:ml-1 pl-1 sm:pl-1.5 border-l shrink-0 whitespace-nowrap ${isSelected ? "border-amber-400/40 text-amber-300" : "border-[#E6D7C3] text-[#2C1E15]"}`}>
                                    {(() => {
                                      const isW = nightlyBreakdown.length > 0 ? nightlyBreakdown[0].isWeekend : false;
                                      let calculatedRate = room.pricing?.nightly || 1000;

                                      if (room.id === 'private-villa-pool' || (room.roomNumber || room.title).toLowerCase().includes('private villa')) {
                                        const checkDay = nightlyBreakdown.length > 0 ? new Date(nightlyBreakdown[0].dateStr).getDay() : new Date().getDay();
                                        const isSatSun = checkDay === 6 || checkDay === 0;
                                        const baseVilla = isSatSun ? 10000 : 8000;
                                        const extraPax = Math.max(0, currentPaxQuantity - 10);
                                        calculatedRate = baseVilla + extraPax * 500;
                                      } else if (room.paxRates && room.paxRates.length > 0) {
                                        const tier = room.paxRates.find((t) => currentPaxQuantity <= t.pax) || room.paxRates[room.paxRates.length - 1];
                                        calculatedRate = isW ? tier.weekendRate : tier.weekdayRate;
                                      }

                                      return `₱${calculatedRate.toLocaleString()}/nt`;
                                    })()}
                                  </span>
                                </div>

                                {/* Child Pax Selector with Child Rate beside it */}
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold transition-all shrink-0 max-w-full ${
                                    isSelected
                                      ? "bg-amber-950/70 border-amber-400/50 text-amber-100"
                                      : "bg-[#FAF7F2] border-[#E6D7C3] text-[#2C1E15]"
                                  }`}
                                  title={`Children rate: 4–10 years old. 1–3 years old: FREE (sneak-in without bed). Total occupancy max pax is adults + children + PWD up to ${maxAcc}.`}
                                >
                                  <span className={`text-[10px] font-bold ${isSelected ? "text-amber-200" : "text-[#786150]"} uppercase shrink-0`}>
                                    Children:
                                  </span>
                                  <select
                                    value={roomChildPaxMap[room.id] || 0}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setRoomChildPaxMap((prev) => ({ ...prev, [room.id]: val }));
                                      if (currentPaxQuantity + val + currentPwdQuantity > maxAcc) {
                                        const adjustedPax = Math.max(1, maxAcc - val - currentPwdQuantity);
                                        handleSetRoomPaxQuantity(room.id, adjustedPax);
                                      }
                                    }}
                                    className={`rounded px-1.5 py-0.5 text-xs font-bold outline-none cursor-pointer border shrink-0 ${
                                      isSelected
                                        ? "bg-[#2C1E15] text-amber-200 border-amber-500/40"
                                        : "bg-white text-[#2C1E15] border-[#E6D7C3]"
                                    }`}
                                  >
                                    {Array.from({ length: Math.max(1, maxAcc) }, (_, i) => i).map((num) => (
                                      <option key={num} value={num} className="bg-white text-[#2C1E15]">
                                        {num} {num === 1 ? 'Child' : 'Children'}
                                      </option>
                                    ))}
                                  </select>
                                  <span className={`text-[11px] font-mono font-bold ml-0.5 sm:ml-1 pl-1 sm:pl-1.5 border-l flex items-center gap-1 shrink-0 whitespace-nowrap ${
                                    isSelected ? "border-amber-400/40 text-amber-300" : "border-[#E6D7C3] text-[#2C1E15]"
                                  }`}>
                                    {(() => {
                                      const isVilla = room.id === 'private-villa-pool' || (room.roomNumber || room.title).toLowerCase().includes('private villa');
                                      const isW = nightlyBreakdown.length > 0 ? nightlyBreakdown[0].isWeekend : false;
                                      const checkDay = nightlyBreakdown.length > 0 ? new Date(nightlyBreakdown[0].dateStr).getDay() : new Date().getDay();
                                      const isSatSun = checkDay === 6 || checkDay === 0;
                                      const childUnitRate = isVilla ? (isSatSun ? 500 : 400) : (isW ? 250 : 200);
                                      const childCount = roomChildPaxMap[room.id] || 0;

                                      return (
                                        <span>
                                          {childCount > 0
                                            ? `+₱${(childCount * childUnitRate).toLocaleString()}/nt`
                                            : `₱${childUnitRate.toLocaleString()}/nt`}
                                          <span className={`text-[9px] font-sans font-normal ml-0.5 opacity-80 ${isSelected ? "text-amber-200" : "text-[#786150]"}`}>
                                            (4–10y)
                                          </span>
                                        </span>
                                      );
                                    })()}
                                  </span>
                                </div>

                                {/* PWD Pax Selector with Note */}
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold transition-all shrink-0 max-w-full ${
                                    isSelected
                                      ? "bg-amber-950/70 border-amber-400/50 text-amber-100"
                                      : "bg-[#FAF7F2] border-[#E6D7C3] text-[#2C1E15]"
                                  }`}
                                  title={`Select PWD Pax for ${roomUnitName}. Confirmation ID required upon check-in. Total occupancy is adults + children + PWD up to ${maxAcc}.`}
                                >
                                  <span className={`text-[10px] font-bold ${isSelected ? "text-amber-200" : "text-[#786150]"} uppercase shrink-0`}>
                                    PWD:
                                  </span>
                                  <select
                                    value={roomPwdPaxMap[room.id] || 0}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setRoomPwdPaxMap((prev) => ({ ...prev, [room.id]: val }));
                                      if (currentPaxQuantity + currentChildQuantity + val > maxAcc) {
                                        const adjustedPax = Math.max(1, maxAcc - currentChildQuantity - val);
                                        handleSetRoomPaxQuantity(room.id, adjustedPax);
                                      }
                                    }}
                                    className={`rounded px-1.5 py-0.5 text-xs font-bold outline-none cursor-pointer border shrink-0 ${
                                      isSelected
                                        ? "bg-[#2C1E15] text-amber-200 border-amber-500/40"
                                        : "bg-white text-[#2C1E15] border-[#E6D7C3]"
                                    }`}
                                  >
                                    {Array.from({ length: Math.max(1, maxAcc) }, (_, i) => i).map((num) => (
                                      <option key={num} value={num} className="bg-white text-[#2C1E15]">
                                        {num} {num === 1 ? 'PWD' : 'PWD'}
                                      </option>
                                    ))}
                                  </select>
                                  <span className={`text-[9.5px] italic font-medium ml-0.5 sm:ml-1 pl-1 sm:pl-1.5 border-l shrink-0 whitespace-nowrap ${
                                    currentPwdQuantity > 0
                                      ? isSelected
                                        ? "border-amber-400/40 text-amber-300 font-bold"
                                        : "border-[#E6D7C3] text-amber-900 font-bold"
                                      : isSelected
                                      ? "border-amber-400/40 text-stone-300 opacity-90"
                                      : "border-[#E6D7C3] text-[#786150]"
                                  }`}>
                                    ID upon check-in
                                  </span>
                                </div>

                                {/* Total Combined Pax Indicator: pax plus child pax plus pwd pax until reach to max pax */}
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all shrink-0 whitespace-nowrap sm:ml-auto ${
                                    totalCombinedPax >= maxAcc
                                      ? isSelected
                                        ? "bg-amber-400 text-[#2C1E15] border-amber-300 shadow-2xs"
                                        : "bg-amber-100 text-amber-950 border-amber-300 shadow-2xs"
                                      : isSelected
                                      ? "bg-amber-950/70 border-amber-400/40 text-amber-200"
                                      : "bg-[#FAF7F2] border-[#E6D7C3] text-[#523A2A]"
                                  }`}
                                  title={`Total occupancy: ${currentPaxQuantity} Pax + ${currentChildQuantity} Child + ${currentPwdQuantity} PWD = ${totalCombinedPax} Pax (Max: ${maxAcc})`}
                                >
                                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Total:</span>
                                  <span className="font-extrabold">{totalCombinedPax}/{maxAcc} Max Pax</span>
                                  {totalCombinedPax >= maxAcc && (
                                    <span className="text-[9px] uppercase tracking-wider font-black bg-amber-900 text-amber-100 px-1 py-0.2 rounded">
                                      Max
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Optional Services & Enhancements (Without the words add-ons) */}
                            {!isEffectivelyBooked && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`pt-2 border-t w-full transition-all ${
                                  isSelected ? "border-amber-500/30" : "border-[#E6D7C3]/50"
                                }`}
                              >
                                {/* Expand/Collapse Toggle Bar */}
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandRoomExtras(room.id)}
                                    className={`flex items-center gap-1.5 text-xs font-bold py-1 px-2 rounded-lg transition-all cursor-pointer ${
                                      isSelected
                                        ? "text-amber-200 hover:bg-amber-900/50"
                                        : "text-[#523A2A] hover:bg-amber-50"
                                    }`}
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span className="font-semibold">Optional Services & Extras</span>
                                    {roomExtrasTotalQty > 0 ? (
                                      <span className="bg-amber-500 text-[#2C1E15] text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                        {roomExtrasTotalQty} selected
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-normal opacity-75 hidden min-[400px]:inline">
                                        (Breakfast, Extra Bed, Tours...)
                                      </span>
                                    )}
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                                        isExtrasExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>

                                  {roomExtrasTotalCost > 0 && (
                                    <span
                                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                                        isSelected
                                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                                          : "bg-amber-50 text-amber-950 border border-amber-200"
                                      }`}
                                    >
                                      +₱{roomExtrasTotalCost.toLocaleString()}
                                    </span>
                                  )}
                                </div>

                                {/* Expanded Services Panel */}
                                {isExtrasExpanded && (
                                  <div
                                    className={`mt-2 p-2 sm:p-2.5 rounded-xl space-y-2 border text-xs animate-in fade-in duration-200 ${
                                      isSelected
                                        ? "bg-amber-950/40 border-amber-500/30 text-amber-100"
                                        : "bg-[#FAF7F2] border-[#E6D7C3] text-[#2C1E15]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[10.5px] font-bold pb-1 border-b border-current/15">
                                      <span className="opacity-80">Room Inclusions & Services:</span>
                                      <span className="text-[10px] opacity-75">Click + to include</span>
                                    </div>

                                    <div className="space-y-1.5">
                                      {roomApplicableAddons.map((item) => {
                                        const itemQty = (roomExtrasMap[room.id] || {})[item.id] || 0;
                                        const itemCost = getAddonCost(item, itemQty);

                                        return (
                                          <div
                                            key={`room-extra-${room.id}-${item.id}`}
                                            className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border transition-all ${
                                              itemQty > 0
                                                ? isSelected
                                                  ? "bg-amber-900/60 border-amber-400/50 shadow-2xs"
                                                  : "bg-white border-amber-300 shadow-2xs"
                                                : isSelected
                                                ? "bg-stone-900/40 border-stone-800"
                                                : "bg-white/70 border-stone-200/80"
                                            }`}
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-[11px] truncate">
                                                  {item.name}
                                                </span>
                                                <span
                                                  className={`text-[9.5px] px-1.5 py-0.2 rounded font-medium ${
                                                    isSelected
                                                      ? "bg-amber-950/80 text-amber-200"
                                                      : "bg-stone-100 text-stone-700"
                                                  }`}
                                                >
                                                  {item.unitLabel}
                                                </span>
                                              </div>
                                              {item.id === "breakfast_set" && totalCombinedPax > 0 && itemQty !== totalCombinedPax && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleSetRoomExtraQuantity(
                                                      room.id,
                                                      item.id,
                                                      totalCombinedPax
                                                    )
                                                  }
                                                  className="text-[9.5px] text-amber-600 dark:text-amber-300 hover:underline font-bold mt-0.5 block cursor-pointer"
                                                >
                                                  + Preset for all {totalCombinedPax} Pax
                                                </button>
                                              )}
                                            </div>

                                            {/* Stepper Controls */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              {itemCost > 0 && (
                                                <span
                                                  className={`text-[10.5px] font-mono font-bold mr-1 ${
                                                    isSelected ? "text-amber-300" : "text-[#2C1E15]"
                                                  }`}
                                                >
                                                  ₱{itemCost.toLocaleString()}
                                                </span>
                                              )}
                                              <div
                                                className={`flex items-center rounded-lg border overflow-hidden ${
                                                  isSelected
                                                    ? "bg-stone-900 border-amber-500/40"
                                                    : "bg-stone-50 border-[#E6D7C3]"
                                                }`}
                                              >
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleAdjustRoomExtra(room.id, item.id, -1)
                                                  }
                                                  disabled={itemQty === 0}
                                                  className="w-6 h-6 flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500 hover:text-black transition-colors cursor-pointer"
                                                >
                                                  <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-6 text-center text-xs font-bold">
                                                  {itemQty}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleAdjustRoomExtra(room.id, item.id, 1)
                                                  }
                                                  className="w-6 h-6 flex items-center justify-center font-bold text-xs hover:bg-amber-500 hover:text-black transition-colors cursor-pointer"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>



                  {/* Active Selected Rooms Multi-Choice Chips */}
                  {selectedRooms.length > 1 && (
                    <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <span>Multiple Units Selected:</span>
                          <span className="bg-amber-900 text-amber-100 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                            {selectedRooms.length} Rooms
                          </span>
                        </span>
                        <span className="text-[11px] text-amber-800 font-medium">
                          Up to {selectedRooms.reduce((acc, r) => acc + (r.capacity?.maxGuests || 2), 0)} Total Pax
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRooms.map((r) => {
                          const hasExtraPax = !!roomExtraPaxMap[r.id];
                          return (
                            <span
                              key={`chip-selected-${r.id}`}
                              className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-300 text-xs font-bold text-[#2C1E15] shadow-2xs"
                            >
                              <span>{r.roomNumber || r.title.split("–")[0].trim()}</span>
                              <span className="text-[10px] text-[#786150] font-normal">({r.category})</span>
                              {hasExtraPax && (
                                <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                                  +1 Extra Pax
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const remainingIds = selectedRoomIds.filter((id) => id !== r.id);
                                  setSelectedRoomIds(remainingIds);
                                  if (roomExtraPaxMap[r.id]) {
                                    setRoomExtraPaxMap((prev) => {
                                      const updated = { ...prev };
                                      delete updated[r.id];
                                      return updated;
                                    });
                                  }
                                }}
                                className="text-amber-800 hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                                title="Remove unit"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ACCOMMODATION SELECTION SUMMARY */}
                  <div className="mt-3 p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E6D7C3] space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#2C1E15] text-amber-300 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs sm:text-sm text-[#2C1E15]">
                            Accommodation Selection Summary
                          </h5>
                          <p className="text-[10.5px] text-[#786150]">
                            Live summary of your chosen room units and occupancy
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold bg-[#2C1E15] text-amber-200 px-2.5 py-1 rounded-full">
                        {selectedRooms.length} {selectedRooms.length === 1 ? 'Unit' : 'Units'} Selected
                      </span>
                    </div>

                    {selectedRooms.length === 0 ? (
                      <div className="text-xs bg-white p-3 rounded-xl border border-dashed border-[#E6D7C3] text-center text-[#786150]">
                        No accommodation units selected yet. Tap any room in the grid above to select.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedRooms.map((r, idx) => {
                            const roomUnitName = r.roomNumber || r.title.split('–')[0].trim();
                            const baseCap = getRoomBaseCapacity(r);
                            const maxCap = getRoomMaxAccommodation(r);
                            const extraPaxCount = roomExtraPaxMap[r.id] || 0;
                            const assignedPax = roomPaxQuantityMap[r.id] || (extraPaxCount > 0 ? baseCap + extraPaxCount : baseCap);

                            const isW = nightlyBreakdown.length > 0 ? nightlyBreakdown[0].isWeekend : false;
                            let calculatedRate = r.pricing?.nightly || 1000;
                            if (r.id === 'private-villa-pool' || (r.roomNumber || r.title).toLowerCase().includes('private villa')) {
                              const checkDay = nightlyBreakdown.length > 0 ? new Date(nightlyBreakdown[0].dateStr).getDay() : new Date().getDay();
                              const isSatSun = checkDay === 6 || checkDay === 0;
                              const baseVilla = isSatSun ? 10000 : 8000;
                              const extraPax = Math.max(0, assignedPax - 10);
                              calculatedRate = baseVilla + extraPax * 500;
                            } else if (r.paxRates && r.paxRates.length > 0) {
                              const tier = r.paxRates.find((t) => assignedPax <= t.pax) || r.paxRates[r.paxRates.length - 1];
                              calculatedRate = isW ? tier.weekendRate : tier.weekdayRate;
                            }

                            const roomExtras = roomExtrasMap[r.id] || {};
                            const roomExtrasQty = Object.values(roomExtras).reduce((a, b) => a + b, 0);
                            const roomExtrasCost = Object.entries(roomExtras).reduce((acc, [eId, q]) => {
                              const item = availableAddons.find((a) => a.id === eId);
                              return acc + (item ? getAddonCost(item, q) : 0);
                            }, 0);

                            return (
                              <div
                                key={`accom-summary-card-${r.id}-${idx}`}
                                className="bg-white p-2.5 rounded-xl border border-[#E6D7C3]/80 flex flex-col justify-between gap-1.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <span className="font-bold text-xs text-[#2C1E15]">{roomUnitName}</span>
                                  </div>
                                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                                    {r.category}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-[#786150] pt-1 border-t border-[#E6D7C3]/40">
                                  <span className="font-medium">
                                    Occupancy: <strong className="text-[#2C1E15]">{assignedPax} Pax{roomChildPaxMap[r.id] ? ` + ${roomChildPaxMap[r.id]} Child` : ''}{roomPwdPaxMap[r.id] ? ` + ${roomPwdPaxMap[r.id]} PWD` : ''}</strong>{' '}
                                    <span className="opacity-75">({assignedPax + (roomChildPaxMap[r.id] || 0) + (roomPwdPaxMap[r.id] || 0)}/{maxCap} Max)</span>
                                    {extraPaxCount > 0 && (
                                      <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">
                                        +{extraPaxCount} Extra
                                      </span>
                                    )}
                                    {roomPwdPaxMap[r.id] > 0 && (
                                      <span className="ml-1 text-[9.5px] bg-amber-100 text-amber-950 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                                        {roomPwdPaxMap[r.id]} PWD (ID upon check-in)
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-bold text-xs text-[#2C1E15] font-mono">
                                    ₱{calculatedRate.toLocaleString()}<span className="text-[9px] font-normal text-[#786150]">/nt</span>
                                  </span>
                                </div>

                                {roomExtrasQty > 0 && (
                                  <div className="flex items-center justify-between text-[10.5px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                                    <span>Optional Services:</span>
                                    <span className="font-bold font-mono">+{roomExtrasQty} items (+₱{roomExtrasCost.toLocaleString()})</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary Totals Bar */}
                        <div className="bg-[#2C1E15] text-white p-2.5 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-300 font-bold">Total Capacity:</span>
                            <span className="font-medium text-stone-200">
                              {selectedRooms.reduce((sum, r) => sum + (roomPaxQuantityMap[r.id] || getRoomBaseCapacity(r)) + (roomChildPaxMap[r.id] || 0) + (roomPwdPaxMap[r.id] || 0), 0)} Guests
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-stone-300 text-[11px]">Accommodation Rate:</span>
                            <span className="font-bold font-mono text-sm text-amber-300">
                              ₱{selectedRooms.reduce((total, r) => {
                                const isW = nightlyBreakdown.length > 0 ? nightlyBreakdown[0].isWeekend : false;
                                const assignedPax = roomPaxQuantityMap[r.id] || getRoomBaseCapacity(r);
                                if (r.id === 'private-villa-pool' || (r.roomNumber || r.title).toLowerCase().includes('private villa')) {
                                  const checkDay = nightlyBreakdown.length > 0 ? new Date(nightlyBreakdown[0].dateStr).getDay() : new Date().getDay();
                                  const isSatSun = checkDay === 6 || checkDay === 0;
                                  const baseVilla = isSatSun ? 10000 : 8000;
                                  const extraPax = Math.max(0, assignedPax - 10);
                                  return total + baseVilla + extraPax * 500;
                                }
                                if (r.paxRates && r.paxRates.length > 0) {
                                  const tier = r.paxRates.find((t) => assignedPax <= t.pax) || r.paxRates[r.paxRates.length - 1];
                                  return total + (isW ? tier.weekendRate : tier.weekdayRate);
                                }
                                return total + (r.pricing?.nightly || 1000);
                              }, 0).toLocaleString()}
                              <span className="text-[10px] font-normal text-amber-100/80">/night</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {formErrors.room && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{formErrors.room}</span>
                    </div>
                  )}
                </div>



                {/* Selected Room Highlight Summary */}
                {selectedRoom ? (
                  <div className="p-4.5 rounded-2xl bg-[#F5EBE6] border border-[#E6D7C3] space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#2C1E15] uppercase tracking-wide">
                            {selectedRooms.length > 1
                              ? `${selectedRooms.length} Units: ${selectedRooms.map((r) => r.roomNumber || r.title.split("–")[0].trim()).join(", ")}`
                              : selectedRoom.title}
                          </span>
                          {selectedRooms.some((r) => r.hasPool) && (
                            <span className="bg-[#FAF7F2] text-[#2C1E15] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/50 flex items-center gap-1 shadow-xs">
                              <Waves className="w-3 h-3 text-[#D4AF37]" />
                              <span>With Swimming Pool</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#786150]">
                          {selectedRooms.length > 1
                            ? `Combined capacity: Up to ${selectedRooms.reduce((acc, r) => acc + (r.capacity?.maxGuests || 2), 0)} Pax • ${selectedRooms.reduce((acc, r) => acc + r.sizeSqM, 0)} sq.m. total`
                            : `${selectedRoom.beds} • ${selectedRoom.capacity.recommended} • ${selectedRoom.sizeSqM} sq.m.`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {selectedRooms.length > 1 ? (
                          <div className="bg-[#2C1E15] text-amber-200 px-3 py-1.5 rounded-xl border border-[#2C1E15] font-bold text-xs">
                            {selectedRooms.length} Accommodation Units Booked
                          </div>
                        ) : (
                          <>
                            <div className="bg-white px-3 py-1.5 rounded-xl border border-[#E6D7C3]">
                              <span className="text-[#786150]">Sun–Thu: </span>
                              <span className="font-bold text-[#2C1E15]">{formatRateDisplay(selectedRoom).weekdayStr}</span>
                            </div>
                            <div className="bg-white px-3 py-1.5 rounded-xl border border-[#E6D7C3]">
                              <span className="text-[#786150]">Fri–Sat: </span>
                              <span className="font-bold text-amber-800">{formatRateDisplay(selectedRoom).weekendStr}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Standard Amenities List */}
                    <div className="pt-2 border-t border-[#E6D7C3]/50">
                      <span className="text-[11px] font-bold text-[#523A2A] uppercase tracking-wider block mb-1.5">
                        Included Room & Property Amenities:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRoom.amenities.map((amenity, idx) => (
                          <span
                            key={`amenity-${idx}`}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                              amenity.includes('Swimming Pool')
                                ? 'bg-[#FAF7F2] border-[#D4AF37] text-[#2C1E15] font-bold shadow-xs'
                                : 'bg-white border-[#E6D7C3]/80 text-[#2C1E15]'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#8B6B10] shrink-0" />
                            <span>{amenity}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Official Pax Rate Sheet Table for Selected Room */}
                    {selectedRoom.paxRates && selectedRoom.paxRates.length > 0 && (
                      <div className="pt-2 border-t border-[#E6D7C3]/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-[#523A2A] uppercase tracking-wider">
                            Rate Breakdown by Guest Count (Pax):
                          </span>
                          <span className="text-[10px] text-[#786150]">
                            Current selection: <strong>{totalPax} Pax</strong>
                          </span>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-[#E6D7C3] bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#2C1E15] text-white text-[11px] uppercase tracking-wider">
                              <tr>
                                <th className="py-2 px-3 font-bold">Occupancy / Pax</th>
                                <th className="py-2 px-3 font-bold">Rate (Mon to Thu)</th>
                                <th className="py-2 px-3 font-bold">Rate (Fri to Sun)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6D7C3]/40">
                              {selectedRoom.paxRates.map((tier, idx) => {
                                const isActive = 
                                  (idx === 0 && totalPax <= tier.pax) ||
                                  (totalPax === tier.pax) ||
                                  (idx === selectedRoom.paxRates!.length - 1 && totalPax >= tier.pax);
                                return (
                                  <tr
                                    key={`tier-${idx}`}
                                    className={`transition-colors ${
                                      isActive ? 'bg-amber-100/70 font-bold text-[#2C1E15]' : 'text-[#523A2A] hover:bg-gray-50'
                                    }`}
                                  >
                                    <td className="py-2 px-3 flex items-center gap-1.5">
                                      {isActive && <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0"></span>}
                                      <span>{tier.paxLabel}</span>
                                    </td>
                                    <td className="py-2 px-3 text-[#2C1E15]">₱{tier.weekdayRate.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-amber-900">₱{tier.weekendRate.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {selectedRoom.id === 'private-villa-pool' ? (
                          <p className="text-[11px] text-[#786150] mt-1.5 italic">
                            * Base rate covers 1 to 10 pax. Extra guests beyond 10 pax: +₱{(selectedRoom.extraPaxFee ?? 500).toLocaleString()} per extra pax / night. Extra pad: +₱{(selectedRoom.extraPadFee ?? 400).toLocaleString()}.
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#786150] mt-1.5 italic">
                            * Extra pax fee: ₱{(selectedRoom.extraPaxFee ?? 300).toLocaleString()} per pax / night beyond base occupancy. {selectedRoom.extraPadFee ? `Extra bed / pad fee: ₱${selectedRoom.extraPadFee.toLocaleString()}.` : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentBookingStep(2);
                  setMaxReachedStep(Math.max(maxReachedStep, 2));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-[#2C1E15] text-amber-200 font-bold text-sm rounded-xl shadow-lg hover:bg-[#523A2A] transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Proceed to Step 2: Guest Details →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 VIEW: Guest Details */}
        {currentBookingStep === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* STEP 4: Guest Contact Details & My Booking Registration */}
            <div id="booking-step-4" className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3]/60 shadow-lg space-y-5">
              <div className="flex items-center justify-between border-b border-[#E6D7C3]/40 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#2C1E15] text-white font-bold flex items-center justify-center text-sm">
                    2
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Guest Contact Details</h3>
                    <p className="text-xs text-[#786150]">Required for booking confirmation and automatic guest account registration</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#2C1E15] mb-1">
                    Full Name <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan De La Cruz"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                  />
                  {formErrors.guestName && (
                    <span className="text-xs text-rose-600 font-medium block mt-1">
                      {formErrors.guestName}
                    </span>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-[#2C1E15] mb-1">
                    Address <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123 Vigan St., Ilocos Sur"
                    value={guestAddress}
                    onChange={(e) => setGuestAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                  />
                  {formErrors.guestAddress && (
                    <span className="text-xs text-rose-600 font-medium block mt-1">
                      {formErrors.guestAddress}
                    </span>
                  )}
                </div>

                {/* Active Mobile Number */}
                <div>
                  <label className="block text-xs font-bold text-[#2C1E15] mb-1">
                    Active mobile number <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0917 123 4567"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                  />
                  {formErrors.guestPhone && (
                    <span className="text-xs text-rose-600 font-medium block mt-1">
                      {formErrors.guestPhone}
                    </span>
                  )}
                </div>

                {/* My Booking Registration */}
                <div className="pt-3 border-t border-[#E6D7C3]/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#2C1E15] flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-[#8B6B10]" />
                        <span>My Booking Registration</span>
                      </h4>
                      <p className="text-[11px] text-[#786150]">
                        Create your guest account credentials to view and manage your booking vouchers anytime under My Bookings.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Auto Registration
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#2C1E15] mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        placeholder="Username"
                        value={guestUsername}
                        onChange={(e) => setGuestUsername(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#2C1E15] mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Choose a password"
                          value={guestPassword}
                          onChange={(e) => setGuestPassword(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E6D7C3] bg-[#FDFBF7] text-sm text-[#2C1E15] font-medium outline-none focus:ring-2 focus:ring-[#2C1E15]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B6B10] hover:text-[#2C1E15] p-1 transition-colors cursor-pointer"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentBookingStep(1);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-white border border-[#E6D7C3] text-[#2C1E15] font-bold text-xs rounded-xl hover:bg-[#FAF7F2] transition-all cursor-pointer"
              >
                <span>← Back to Step 1</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentBookingStep(3);
                  setMaxReachedStep(Math.max(maxReachedStep, 3));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-[#2C1E15] text-amber-200 font-bold text-sm rounded-xl shadow-lg hover:bg-[#523A2A] transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Proceed to Step 3: Payment Terms →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 VIEW: Payment Terms */}
        {currentBookingStep === 3 && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* STEP 5: Payment Option (Full vs 40% Partial Downpayment) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3]/60 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6D7C3]/40 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#2C1E15] text-white font-bold flex items-center justify-center text-sm">
                    3
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Payment Option</h3>
                    <p className="text-xs text-[#786150]">Select 40% partial downpayment or 100% full settlement</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 40% Partial Downpayment Card */}
                <div
                  onClick={() => setPaymentOption('partial_40')}
                  className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    paymentOption === 'partial_40'
                      ? 'border-[#2C1E15] bg-[#F5EBE6] shadow-md'
                      : 'border-[#E6D7C3] bg-[#FDFBF7] hover:bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-[#2C1E15]">40% Partial Downpayment</h4>
                    <p className="text-xs text-[#786150]">
                      Lock your reservation date today. Pay the remaining 60% balance upon physical check-in at front desk.
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-[#E6D7C3]/60 flex items-baseline justify-between">
                    <span className="text-xs text-[#786150]">Pay Now (40%):</span>
                    <span className="font-bold text-base text-[#2C1E15]">
                      ₱{Math.round(grandTotal * 0.4).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 100% Full Payment Card */}
                <div
                  onClick={() => setPaymentOption('full')}
                  className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    paymentOption === 'full'
                      ? 'border-[#2C1E15] bg-[#F5EBE6] shadow-md'
                      : 'border-[#E6D7C3] bg-[#FDFBF7] hover:bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#786150] uppercase tracking-wider">
                        Express Fast Track
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-[#2C1E15]">100% Full Settlement</h4>
                    <p className="text-xs text-[#786150]">
                      Pay the complete stay amount today for a zero-balance, instant-key check-in upon arrival.
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-[#E6D7C3]/60 flex items-baseline justify-between">
                    <span className="text-xs text-[#786150]">Pay Now (100%):</span>
                    <span className="font-bold text-base text-[#2C1E15]">
                      ₱{grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 6: Payment Details & Verified Merchant Accounts */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E6D7C3]/60 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6D7C3]/40 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#2C1E15] text-white font-bold flex items-center justify-center text-sm">
                    6
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Payment Method</h3>
                    <p className="text-xs text-[#786150]">Send deposit to our verified merchant accounts</p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'gcash', label: 'GCash', icon: Smartphone },
                  { id: 'bdo', label: 'BDO Bank Transfer', icon: Building2 },
                  { id: 'card', label: 'Debit / Credit', icon: CreditCard },
                  { id: 'front_desk', label: 'Front Desk Cash', icon: DollarSign },
                ].map((m) => {
                  const Icon = m.icon;
                  const isCurrent = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#2C1E15] bg-[#2C1E15] text-white shadow-sm'
                          : 'border-[#E6D7C3] bg-[#FDFBF7] text-[#523A2A] hover:bg-[#F5EBE6]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* GCash Details Card */}
              {paymentMethod === 'gcash' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0055EE]/5 border border-[#0055EE]/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0055EE] text-white font-black flex items-center justify-center text-xs">
                        G
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#2C1E15]">Official GCash Account</h4>
                        <p className="text-[11px] text-[#786150]">Instant transfer via GCash Express Send or QR</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#8B6B10] bg-[#FAF7F2] border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-full shadow-xs">
                      Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-xl border border-[#E6D7C3] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#786150] uppercase font-semibold">Account Name</span>
                        <div className="text-sm font-bold text-[#2C1E15]">Mark benedict Apelin</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('Mark benedict Apelin', 'gcash_name')}
                        className="p-1.5 text-xs text-[#8B6B10] hover:bg-[#FAF7F2] rounded-lg flex items-center gap-1 cursor-pointer font-medium transition-colors"
                      >
                        {copiedField === 'gcash_name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#E6D7C3] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#786150] uppercase font-semibold">GCash Mobile Number</span>
                        <div className="text-sm font-mono font-bold text-[#2C1E15]">09175681408</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('09175681408', 'gcash_num')}
                        className="p-1.5 text-xs text-[#8B6B10] hover:bg-[#FAF7F2] rounded-lg flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                      >
                        {copiedField === 'gcash_num' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* BDO Bank Details Card */}
              {paymentMethod === 'bdo' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#E6D7C3] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#3D2616] text-[#FAF7F2] font-black flex items-center justify-center text-xs shadow-xs">
                        BDO
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#2C1E15]">BDO (Banco de Oro) Savings Account</h4>
                        <p className="text-[11px] text-[#786150]">Online Bank Transfer, InstaPay, or Over-the-counter</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#8B6B10] bg-[#FAF7F2] border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-full shadow-xs">
                      Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-xl border border-[#E6D7C3] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#786150] uppercase font-semibold">Account Holder</span>
                        <div className="text-sm font-bold text-[#2C1E15]">mark benedict v. apelin</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('mark benedict v. apelin', 'bdo_name')}
                        className="p-1.5 text-xs text-[#8B6B10] hover:bg-[#FAF7F2] rounded-lg flex items-center gap-1 cursor-pointer font-medium transition-colors"
                      >
                        {copiedField === 'bdo_name' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#E6D7C3] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#786150] uppercase font-semibold">BDO Account Number</span>
                        <div className="text-sm font-mono font-bold text-[#2C1E15]">0082 2007 7587</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('008220077587', 'bdo_acc')}
                        className="p-1.5 text-xs text-[#8B6B10] hover:bg-[#FAF7F2] rounded-lg flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                      >
                        {copiedField === 'bdo_acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Card / Front Desk Notice */}
              {(paymentMethod === 'card' || paymentMethod === 'front_desk') && (
                <div className="p-4 rounded-2xl bg-[#F5EBE6] border border-[#E6D7C3] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2C1E15]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Front Desk Settlement Guarantee</span>
                  </div>
                  <p className="text-xs text-[#786150] leading-relaxed">
                    For card payments or direct front desk cash settlement, an initial security deposit of at least <strong>₱500</strong> or booking guarantee slip is requested to prevent no-shows. Alternatively, please upload an ID or reservation authorization image below.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentBookingStep(2);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-white border border-[#E6D7C3] text-[#2C1E15] font-bold text-xs rounded-xl hover:bg-[#FAF7F2] transition-all cursor-pointer"
              >
                <span>← Back to Step 2</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentBookingStep(4);
                  setMaxReachedStep(Math.max(maxReachedStep, 4));
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-[#2C1E15] text-amber-200 font-bold text-sm rounded-xl shadow-lg hover:bg-[#523A2A] transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Proceed to Step 4: Slip &amp; Voucher →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 VIEW: Slip Upload & Confirmation */}
        {currentBookingStep === 4 && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* STEP 7: MANDATORY Payment Slip / Receipt Upload */}
            <div id="booking-step-7" className={`bg-white rounded-3xl p-6 sm:p-7 border-2 shadow-lg space-y-4 ${
              formErrors.paymentSlip ? 'border-rose-400 bg-rose-50/20' : 'border-[#E6D7C3]/60'
            }`}>
              <div className="flex items-center justify-between border-b border-[#E6D7C3]/40 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-rose-700 text-white font-bold flex items-center justify-center text-sm">
                    4
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#2C1E15] flex items-center gap-2">
                      <span>Mandatory Payment Slip / Receipt Upload</span>
                      <span className="text-rose-600 text-xs font-sans font-bold bg-rose-100 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    </h3>
                    <p className="text-xs text-[#786150]">Upload a clear photo or screenshot of your GCash/Bank transfer confirmation</p>
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone */}
              {!slipPreviewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E6D7C3] hover:border-[#2C1E15] rounded-2xl p-6 sm:p-8 text-center bg-[#FDFBF7] hover:bg-[#F5EBE6] transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-[#E6D7C3]/50 text-[#2C1E15] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-sm text-[#2C1E15]">
                    Click or Drag & Drop Payment Deposit Slip
                  </div>
                  <p className="text-xs text-[#786150] mt-1">
                    Supports PNG, JPG, JPEG, or WebP screenshot (Max: 10MB)
                  </p>
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[11px] font-semibold mt-3 border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Submission will be blocked without this slip</span>
                  </div>
                </div>
              ) : (
                /* Uploaded Thumbnail Preview */
                <div className="p-4 bg-[#F5EBE6] rounded-2xl border border-[#E6D7C3] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={slipPreviewUrl}
                      alt="Uploaded Payment Slip"
                      className="w-20 h-20 object-cover rounded-xl border border-white shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-sm text-[#2C1E15]">
                          Receipt Attached
                        </span>
                      </div>
                      <p className="text-xs text-[#786150] mt-0.5 truncate max-w-xs">
                        {slipFile?.name || 'payment_receipt.jpg'}
                      </p>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        Ready for Front-Desk verification
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-white hover:bg-gray-100 text-[#2C1E15] text-xs font-bold rounded-xl border border-[#E6D7C3] transition-colors cursor-pointer"
                    >
                      Replace File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveSlip}
                      className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {slipUploadError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{slipUploadError}</span>
                </div>
              )}

              {/* DIRECTIONAL GUIDANCE FOR MISSED STEPS */}
              {Object.keys(formErrors).length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl space-y-2 animate-pulse">
                  <div className="flex items-center gap-2 text-[#2C1E15] font-bold">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span>Booking Procedure Direction: Missed Steps Found</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    The reservation cannot proceed. Please complete the following highlighted sections:
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {formErrors.room && (
                      <li className="text-xs font-bold text-red-700 flex items-center gap-1.5 cursor-pointer hover:underline" onClick={() => document.getElementById('booking-step-2')?.scrollIntoView({behavior:'smooth', block:'center'})}>
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">2</span>
                        Accommodation Selection
                      </li>
                    )}
                    {(formErrors.guestName || formErrors.guestAddress || formErrors.guestPhone) && (
                      <li className="text-xs font-bold text-red-700 flex items-center gap-1.5 cursor-pointer hover:underline" onClick={() => document.getElementById('booking-step-4')?.scrollIntoView({behavior:'smooth', block:'center'})}>
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">4</span>
                        Guest Contact Details
                      </li>
                    )}
                    {formErrors.paymentSlip && (
                      <li className="text-xs font-bold text-red-700 flex items-center gap-1.5 cursor-pointer hover:underline" onClick={() => document.getElementById('booking-step-7')?.scrollIntoView({behavior:'smooth', block:'center'})}>
                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">7</span>
                        Payment Slip Upload
                      </li>
                    )}
                  </ul>
                  <p className="text-[10px] text-amber-700 italic border-t border-amber-200 pt-1 mt-2">
                    Click any item above to jump directly to that section.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentBookingStep(3);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-white border border-[#E6D7C3] text-[#2C1E15] font-bold text-xs rounded-xl hover:bg-[#FAF7F2] transition-all cursor-pointer"
              >
                <span>← Back to Step 3</span>
              </button>
              <button
                type="submit"
                className="py-4 px-8 bg-gradient-to-r from-[#2C1E15] via-[#523A2A] to-[#2C1E15] text-white text-base font-bold rounded-2xl shadow-xl hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-5 h-5 text-amber-300" />
                <span>Confirm & Book Reservation</span>
              </button>
            </div>
          </div>
        )}

          </form>

        </div>

        {/* Right Column: Live Stay Summary Card (Sticky) — Only Appears on Step 3 (Payment Terms) */}
        {currentBookingStep === 3 && (
          <div className="lg:col-span-4 sticky top-28 space-y-4 animate-in fade-in duration-300">
          
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 border-2 border-[#E6D7C3] shadow-2xl space-y-5">
            
            {/* Summary Header */}
            <div className="flex items-center justify-between border-b border-[#E6D7C3]/60 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#2C1E15]" />
                <h3 className="font-serif font-bold text-lg text-[#2C1E15]">Booking Summary</h3>
              </div>
              <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                Live Calculator
              </span>
            </div>

            {/* Selected Room Info with Room Multipliers */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-[#786150] font-bold">
                  Selected Accommodation ({selectedRooms.length})
                </span>
                <span className="text-[11px] font-bold bg-[#2C1E15] text-amber-200 px-2 py-0.5 rounded-full">
                  {selectedRooms.length} Unit{selectedRooms.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Individual Selected Accommodation Units */}
              {selectedRooms.length === 0 ? (
                <div className="text-xs bg-[#FAF7F2] p-3 rounded-xl border border-dashed border-[#E6D7C3] text-center text-[#786150]">
                  No accommodation unit selected yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedRooms.map((room, idx) => {
                    const roomUnitName = room.roomNumber || room.title.split("–")[0].trim();
                    const baseCap = getRoomBaseCapacity(room);
                    const maxCap = getRoomMaxAccommodation(room);
                    const extraPaxCount = roomExtraPaxMap[room.id] || 0;
                    const assignedPax = roomPaxQuantityMap[room.id] || (extraPaxCount > 0 ? baseCap + extraPaxCount : baseCap);

                    return (
                      <div
                        key={`summary-ind-room-${room.id}-${idx}`}
                        className="text-xs bg-[#FDFBF7] p-3 rounded-xl border border-[#E6D7C3] space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-[#2C1E15] text-sm">
                              {roomUnitName}
                            </div>
                            <div className="text-[11px] text-[#786150] font-medium">
                              Room Type: <span className="font-bold text-[#2C1E15]">{room.category}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Unit #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-[#E6D7C3]/50 text-[11px]">
                          <span className="text-[#786150]">Guests (Pax + Child + PWD):</span>
                          <span className="font-bold text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded">
                            {assignedPax} Pax{roomChildPaxMap[room.id] ? ` + ${roomChildPaxMap[room.id]} Child` : ''}{roomPwdPaxMap[room.id] ? ` + ${roomPwdPaxMap[room.id]} PWD` : ''} ({assignedPax + (roomChildPaxMap[room.id] || 0) + (roomPwdPaxMap[room.id] || 0)}/{maxCap} Max)
                          </span>
                        </div>
                        {roomPwdPaxMap[room.id] > 0 && (
                          <div className="flex items-center justify-between text-[10.5px] text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 font-semibold">
                            <span>PWD Pax:</span>
                            <span>{roomPwdPaxMap[room.id]} Pax (Confirmation ID upon check-in)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Itemized Breakdown Table */}
            <div className="space-y-2 pt-3 border-t border-[#E6D7C3]/40 text-xs">
              
              {/* Base Rate with Multiplier */}
              <div className="flex items-center justify-between">
                <span className="text-[#523A2A] font-bold">
                  Base Accommodation ({selectedRooms.length} unit{selectedRooms.length > 1 ? "s" : ""}, {stayType === 'nightly' ? `${calculatedNights} night(s)` : `${hourlyDuration} hrs`})
                </span>
                <span className="font-bold text-[#2C1E15]">₱{baseStayRate.toLocaleString()}</span>
              </div>

              {/* Individual Accommodation Rates Breakdown */}
              {selectedRooms.length > 0 && (
                <div className="pl-2 border-l-2 border-amber-400 space-y-1 py-1 bg-amber-50/30 rounded-r-lg max-h-48 overflow-y-auto">
                  {selectedRooms.map((room, idx) => {
                    const roomUnitName = room.roomNumber || room.title.split("–")[0].trim();
                    const baseCap = getRoomBaseCapacity(room);
                    const extraPaxCount = roomExtraPaxMap[room.id] || 0;
                    const assignedPax = roomPaxQuantityMap[room.id] || (extraPaxCount > 0 ? baseCap + extraPaxCount : baseCap);
                    let roomCost = 0;
                    if (stayType === "nightly") {
                      const start = new Date(checkInDate);
                      const end = new Date(checkOutDate);
                      const cur = new Date(start);
                      while (cur < end) {
                        roomCost += getNightlyRateForDate(cur, room, adultGuests, child6to10Guests, child1to5Guests);
                        cur.setDate(cur.getDate() + 1);
                      }
                      if (start >= end) {
                        roomCost += getNightlyRateForDate(start, room, adultGuests, child6to10Guests, child1to5Guests);
                      }
                    } else {
                      if (hourlyDuration === 3) roomCost += room.pricing.hourly3hr || 500;
                      else if (hourlyDuration === 6) roomCost += room.pricing.hourly6hr || 800;
                      else roomCost += room.pricing.hourly12hr || 1100;
                    }

                    const childPax = roomChildPaxMap[room.id] || 0;
                    let totalChildCostForRoom = 0;
                    if (stayType === "nightly" && childPax > 0) {
                      const start = new Date(checkInDate);
                      const end = new Date(checkOutDate);
                      const cur = new Date(start);
                      while (cur < end) {
                        const day = cur.getDay();
                        const isW = day === 5 || day === 6;
                        const childRate = isW ? 250 : 200;
                        totalChildCostForRoom += childPax * childRate;
                        cur.setDate(cur.getDate() + 1);
                      }
                      if (start >= end) {
                        const day = start.getDay();
                        const isW = day === 5 || day === 6;
                        const childRate = isW ? 250 : 200;
                        totalChildCostForRoom += childPax * childRate;
                      }
                    }
                    const adultRoomCost = Math.max(0, roomCost - totalChildCostForRoom);

                    return (
                      <React.Fragment key={`ind-room-cost-${room.id}-${idx}`}>
                        <div className="flex items-center justify-between text-[11px] text-[#523A2A]">
                          <span className="font-medium">
                            {roomUnitName} ({assignedPax} Adult Pax):
                          </span>
                          <span className="font-bold text-[#2C1E15]">₱{adultRoomCost.toLocaleString()}</span>
                        </div>
                        {childPax > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-amber-900 pl-2">
                            <span className="font-medium">
                              {roomUnitName} ({childPax} Child 4-10 yrs):
                            </span>
                            <span className="font-bold text-amber-900">₱{totalChildCostForRoom.toLocaleString()}</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}



              {/* Children (4-10 yrs) Summary Line Item */}
              {child6to10Guests > 0 && (
                <div className="flex items-center justify-between text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/80">
                  <span className="font-semibold">Children (4–10 yrs) x{child6to10Guests}:</span>
                  <span className="font-bold">
                    +₱{(nightlyBreakdown.reduce((sum, item) => sum + item.child6to10Cost, 0) || (child6to10Guests * 200)).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Toddlers / Kids (1-5 yrs) Summary Line Item */}
              {child1to5Guests > 0 && (
                <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                  <span className="font-semibold">Toddlers / Kids (1–5 yrs) x{child1to5Guests}:</span>
                  <span className="font-bold text-emerald-700">₱0 (FREE)</span>
                </div>
              )}

              {/* Night-by-night breakdown */}
              {stayType === 'nightly' && nightlyBreakdown.length > 0 && (
                <div className="pl-2 border-l-2 border-[#E6D7C3] space-y-1 py-1">
                  {nightlyBreakdown.map((item, idx) => (
                    <div key={`breakdown-${idx}`} className="space-y-0.5 text-[11px] text-[#786150]">
                      <div className="flex items-center justify-between">
                        <span>
                          {item.label} ({item.isWeekend ? 'Fri–Sat' : 'Sun–Thu'}):
                        </span>
                        <span className="font-medium text-[#2C1E15]">₱{item.rate.toLocaleString()}</span>
                      </div>
                      {item.child6to10Cost > 0 && (
                        <div className="text-[10px] text-amber-800 flex justify-between pl-2">
                          <span>↳ {child6to10Guests}x Kid (6–10y @ ₱{item.isWeekend ? '250' : '200'}):</span>
                          <span>+₱{item.child6to10Cost.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add-ons line items */}
              {availableAddons.map((addon) => {
                const qty = addonQuantities[addon.id] || 0;
                if (qty === 0) return null;
                const cost = getAddonCost(addon, qty);
                return (
                  <div key={`summary-addon-${addon.id}`} className="flex items-center justify-between text-[#786150]">
                    <span>
                      {addon.name} (x{qty})
                    </span>
                    <span className="font-medium text-[#2C1E15]">₱{cost.toLocaleString()}</span>
                  </div>
                );
              })}

              {/* Grand Total Row */}
              <div className="flex items-baseline justify-between pt-3 border-t border-[#E6D7C3] text-sm">
                <span className="font-serif font-bold text-[#2C1E15] text-base">Grand Total</span>
                <span className="font-bold text-xl text-[#2C1E15]">₱{grandTotal.toLocaleString()}</span>
              </div>

            </div>

            {/* Payment Split Highlight Box - 'Partial:' as requested */}
            <div className="bg-[#2C1E15] text-white p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-[#E6D7C3]">
                <span>Partial:</span>
                <span className="font-bold uppercase tracking-wider text-amber-300">
                  {paymentOption === 'partial_40' ? '40% Downpayment' : '100% Full Payment'}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1 border-t border-white/20">
                <span className="text-xs font-semibold text-[#F5EBE6]">Payable Now:</span>
                <span className="text-2xl font-bold text-emerald-400">
                  ₱{amountPayableNow.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#E6D7C3] pt-1 border-t border-white/10">
                <span>Remaining Balance at Check-in:</span>
                <span className="font-semibold text-white">
                  ₱{remainingBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Booking Details Breakdown */}
            <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E6D7C3] space-y-2 text-xs text-[#523A2A]">
              <h4 className="font-bold text-[#2C1E15] border-b border-[#E6D7C3] pb-1 uppercase tracking-wider text-[10px]">
                Booking details:
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between items-start">
                  <span className="text-[#786150] shrink-0">Name:</span>
                  <span className="font-bold text-[#2C1E15] text-right">{guestName || '—'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[#786150] shrink-0">Address:</span>
                  <span className="font-bold text-[#2C1E15] text-right">{guestAddress || '—'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[#786150] shrink-0">Cp #:</span>
                  <span className="font-bold text-[#2C1E15] text-right">{guestPhone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">Check in:</span>
                  <span className="font-bold text-[#2C1E15]">{checkInDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">Check out:</span>
                  <span className="font-bold text-[#2C1E15]">{checkOutDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">Check in time:</span>
                  <span className="font-bold text-[#2C1E15]">2pm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">Check out time:</span>
                  <span className="font-bold text-[#2C1E15]">12noon</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">No of pax:</span>
                  <span className="font-bold text-[#2C1E15]">{totalPax}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#E6D7C3]/40">
                  <span className="text-[#786150]">Partial;</span>
                  <span className="font-bold text-emerald-700">₱{amountPayableNow.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">Balance:</span>
                  <span className="font-bold text-[#2C1E15]">₱{remainingBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">Room rate:</span>
                  <span className="font-bold text-[#2C1E15]">₱{baseStayRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[#786150] shrink-0">Room number:</span>
                  <span className="font-bold text-[#2C1E15] text-right ml-4">
                    {selectedRooms.length > 0 ? selectedRooms.map(r => r.roomNumber || r.title.split('–')[0].trim()).join(', ') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#786150]">Number of room</span>
                  <span className="font-bold text-[#2C1E15]">{selectedRooms.length}</span>
                </div>
              </div>
            </div>

            {/* Slip Status Indicator */}
            <div className="text-xs">
              {slipPreviewUrl ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payment Deposit Slip attached</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-800 font-medium bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Attach payment slip in Step 7 to submit</span>
                </div>
              )}
            </div>

            {/* Desktop Submit Button */}
            <div className="hidden lg:block pt-2">
              <button
                type="button"
                onClick={handleSubmitBooking}
                className="w-full py-4 bg-gradient-to-r from-[#2C1E15] via-[#523A2A] to-[#2C1E15] text-white text-base font-bold rounded-2xl shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-5 h-5 text-amber-300" />
                <span>Confirm & Book Reservation</span>
              </button>
            </div>

            <div className="text-[11px] text-[#786150] text-center">
              Instant printable booking voucher issued immediately upon submission.
            </div>

            {/* Cancellation Policy Banner */}
            <div className="p-3.5 bg-[#FDFBF7] rounded-xl border border-[#E6D7C3] text-[11px] text-[#786150] space-y-1">
              <span className="font-bold text-[#2C1E15] block">Cancellation &amp; Rebooking Policy:</span>
              <p>• Upon booking require for 40% downpayment</p>
              <p>• Downpayment non refundable</p>
              <p>• Rebooking allowed within 3 days before check-in date, 20% rebooking fee apply</p>
            </div>

          </div>

        </div>
        )}

      </div>

      {/* Room Details Modal */}
      {inspectRoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E6D7C3] shadow-2xl p-6 sm:p-8 space-y-6 relative">
            <button
              onClick={() => setInspectRoom(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#E6D7C3]/50 hover:bg-[#E6D7C3] text-[#2C1E15] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#E6D7C3]/60 text-[#8B6B10] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-[#E6D7C3]">
                {inspectRoom.category}
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C1E15]">
                {inspectRoom.title}
              </h3>
              <p className="text-sm text-[#6E5544]">{inspectRoom.subtitle}</p>
            </div>

            {/* Image Gallery */}
            <div className={`grid gap-2 rounded-2xl overflow-hidden border border-[#E6D7C3] ${(inspectRoom.images?.length || 1) === 1 ? 'grid-cols-1' : inspectRoom.images?.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
              {(Array.isArray(inspectRoom.images) && inspectRoom.images.length > 0 ? inspectRoom.images : [FALLBACK_ROOM_IMAGE]).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${inspectRoom.title} photo ${i + 1}`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_ROOM_IMAGE) {
                      target.src = FALLBACK_ROOM_IMAGE;
                    }
                  }}
                  className={`w-full object-cover hover:scale-105 transition-transform ${(inspectRoom.images?.length === 3 && i === 0) ? 'sm:col-span-3 h-52' : inspectRoom.images?.length === 3 ? 'h-32' : 'h-40'}`}
                />
              ))}
            </div>

            {/* Key Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white rounded-2xl border border-[#E6D7C3] text-center">
              <div>
                <div className="text-[11px] text-[#6E5544] font-semibold">Unit Number</div>
                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">{inspectRoom.roomNumber || inspectRoom.roomNumbers.join(', ')}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E5544] font-semibold">Capacity</div>
                <div className="text-xs font-bold text-[#2C1E15] mt-0.5">{inspectRoom.capacity.recommended}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E5544] font-semibold">Beds</div>
                <div className="text-xs font-bold text-[#2C1E15] mt-0.5 line-clamp-2" title={inspectRoom.beds}>{inspectRoom.beds}</div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-base text-[#2C1E15]">Room Description</h4>
              <p className="text-xs text-[#6E5544] leading-relaxed">{inspectRoom.description}</p>
            </div>

            {/* Amenities */}
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-base text-[#2C1E15]">Amenities</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {inspectRoom.amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E6D7C3] text-xs text-[#2C1E15]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-[#E6D7C3]">
              <button
                type="button"
                onClick={() => setInspectRoom(null)}
                className="px-6 py-2.5 bg-[#2C1E15] text-white font-bold rounded-xl text-xs hover:bg-[#432F22] transition-colors cursor-pointer shadow-md"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
