export type NavigationTab = 'explore' | 'private-villa' | 'my-bookings' | 'contact' | 'admin';

export type StayType = 'nightly' | 'hourly';

export type RoomCategory = 
  | 'All'
  | 'Family Rooms' 
  | 'Big Family Rooms'
  | 'Loft Family Suites' 
  | 'Standard Rooms' 
  | 'Private Villa'
  | 'Transient Rooms' 
  | 'Private Villa Units' 
  | 'Whole Property Express';

export interface PaxRateTier {
  paxLabel: string;
  pax: number;
  weekdayRate: number; // Mon to Thu
  weekendRate: number; // Fri to Sun
  rateDays?: string; // e.g. 'Monday to Thursday', 'Friday to Sunday'
}

export interface RoomUnit {
  id: string;
  roomNumber?: string; // e.g. 'Room 14', 'Room 0', 'Private Villa'
  title: string;
  subtitle: string;
  category: RoomCategory;
  roomNumbers: string[]; // e.g. ['Room 14']
  capacity: {
    minGuests: number;
    maxGuests: number;
    recommended: string;
  };
  pricing: {
    nightly: number; // in PHP
    hourly3hr?: number;
    hourly6hr?: number;
    hourly12hr?: number;
  };
  paxRates?: PaxRateTier[];
  extraPaxFee?: number; // e.g. 500 for extra guest
  extraPadFee?: number; // e.g. 400 for extra pad
  weekdayRateDisplay: string;
  weekendRateDisplay: string;
  beds: string;
  sizeSqM: number;
  description: string;
  amenities: string[];
  hasPool?: boolean;
  images: string[];
  featured?: boolean;
}

export interface BookingAddonItem {
  id: string;
  name: string;
  price: number;
  unitLabel: string;
  isPerNight?: boolean;
  quantity: number;
  description: string;
  paxCount?: number;
  pricingType?: 'per_pax' | 'fixed_unit' | 'per_night';
  category?: 'breakfast' | 'extra_bed' | 'pool' | 'tour' | 'amenity' | 'custom';
  isActive?: boolean;
}

export type PaymentOption = 'full' | 'partial_40' | 'custom';

export type PaymentMethod = 'gcash' | 'bdo' | 'card' | 'front_desk';

export type BookingStatus = 'Confirmed' | 'Pending Slip Review' | 'Checked-In' | 'Completed' | 'Cancelled';

export interface BookingRecord {
  id: string; // e.g. DV-2026-8941
  createdAt: string;
  roomId: string;
  roomTitle: string;
  stayType: StayType;
  // Nightly details
  checkInDate?: string;
  checkOutDate?: string;
  numberOfNights?: number;
  // Hourly details
  hourlyDate?: string;
  hourlyStartTime?: string;
  hourlyDurationHours?: number;
  // Guests
  adultGuests: number;
  childGuests: number;
  child6to10Guests?: number;
  child1to5Guests?: number;
  // Add-ons
  addons: {
    id: string;
    name: string;
    quantity: number;
    cost: number;
  }[];
  // Pricing breakdown
  baseRatePerUnit: number;
  baseStayTotal: number;
  addonsTotal: number;
  promoCode?: string;
  discountAmount: number;
  grandTotal: number;
  // Payment
  paymentOption: PaymentOption;
  amountPaidNow: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  paymentSlipUrl?: string; // base64 or object URL
  paymentSlipFileName?: string;
  // Guest Details
  guestName: string;
  guestPhone: string;
  guestAddress?: string;
  guestEmail?: string;
  guestUsername?: string;
  guestPassword?: string;
  specialRequests?: string;
  // Admin & Operational Status
  status: BookingStatus;
  staffNotes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  rebookedAt?: string;
  rebookingHistory?: {
    date: string;
    staffName: string;
    previousDates?: string;
    previousRoom?: string;
    previousTotal?: number;
    notes?: string;
  }[];
}

export type StaffRole = 
  | 'Super Admin' 
  | 'Front Desk Supervisor' 
  | 'Front Desk Officer' 
  | 'Reservations Clerk' 
  | 'Night Auditor';

export interface StaffPermissions {
  canApproveSlips: boolean;
  canRebook: boolean;
  canCancel: boolean;
  canWalkin: boolean;
  canManageStaff: boolean;
  canViewFinancials: boolean;
  canCheckInOut: boolean;
}

export interface StaffAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  createdAt: string;
  isActive: boolean;
  permissions: StaffPermissions;
  createdBy?: string;
}

export interface InquiryRecord {
  id: string;
  createdAt: string;
  fullName: string;
  phone: string;
  email: string;
  roomInterest: string;
  targetDates?: string;
  message: string;
  status: 'New' | 'Replied' | 'Archived';
}


export interface ChatMessage {
  id: string;
  sender: "guest" | "front_desk";
  senderName: string;
  text: string;
  timestamp: string;
  isRead?: boolean;
}

export interface ChatSession {
  id: string;
  guestName: string;
  guestPhone?: string;
  roomInterest?: string;
  unreadCountForDesk: number;
  unreadCountForGuest: number;
  lastMessage: string;
  lastTimestamp: string;
  messages: ChatMessage[];
}

export interface GuestAccount {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  phone: string;
  email?: string;
  createdAt: string;
  lastActiveAt: string;
  bookingIds: string[];
}

export interface PresetQA {
  id: string;
  question: string;
  keywords: string;
  answer: string;
  showAsChip?: boolean;
  category?: string;
  isActive?: boolean;
}

export type PresetQAItem = PresetQA;

export const DEFAULT_PRESET_QAS: PresetQA[] = [
  {
    id: 'pqa-1',
    question: 'Room Availability',
    keywords: 'availability, available, book, vacancy, vacant, rooms',
    answer: 'We have family rooms, standard units, and the Private Villa available! Select dates on the booking tab to view live availability.',
    showAsChip: true,
  },
  {
    id: 'pqa-2',
    question: 'Family Rooms (4-6)',
    keywords: 'family, 4, 5, 6, family room',
    answer: 'Family Rooms (Room 4, 5, 6) rates:\n• Mon–Thu: 1-2 pax ₱1,000 | 3 pax ₱1,200 | 4 pax ₱1,400 | 5 pax ₱1,500 | 6 pax ₱1,800 | 7 pax ₱2,000\n• Fri–Sat: 1-2 pax ₱1,200 | 3 pax ₱1,300 | 4 pax ₱1,500 | 5 pax ₱1,800 | 6 pax ₱2,000 | 7 pax ₱2,200',
    showAsChip: true,
  },
  {
    id: 'pqa-3',
    question: 'Private Villa Rates',
    keywords: 'villa, pool, private villa, swimming',
    answer: 'Private Villa features a private swimming pool, 3 bedrooms, living area, kitchen, and gazebo. Starts at ₱8,000/night for up to 10 pax!',
    showAsChip: true,
  },
  {
    id: 'pqa-4',
    question: 'Check-in Time',
    keywords: 'check-in, checkout, check in, check out, time, hours',
    answer: 'Standard Nightly Check-in is 2:00 PM and Check-out is 12:00 PM (Noon). Flexible check-in is available for short stays.',
    showAsChip: true,
  },
  {
    id: 'pqa-5',
    question: 'Calle Crisologo',
    keywords: 'calle crisologo, distance, location, where, address',
    answer: 'We are located along Diversion Road, Barangay San Julian Norte, Vigan City — 5 mins away from historic Calle Crisologo!',
    showAsChip: true,
  },
  {
    id: 'pqa-6',
    question: 'Pet Policy',
    keywords: 'pet, pets, dog, cat, animal',
    answer: 'Yes, we are pet-friendly! Small/medium well-behaved pets are welcome.',
    showAsChip: false,
  },
];

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface RoomReview {
  id: string;
  roomId: string;
  roomTitle: string;
  guestName: string;
  guestEmail?: string;
  rating: number; // 1 to 5
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  stayDate?: string;
  screenedAt?: string;
  screenedBy?: string;
  staffNotes?: string;
}
