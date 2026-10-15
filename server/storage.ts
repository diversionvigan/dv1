import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BookingRecord, BookingStatus, InquiryRecord, RoomUnit, RoomReview, ReviewStatus } from '../src/types';
import { ROOMS_DATA } from '../src/data/roomsData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

const SEED_REVIEWS: RoomReview[] = [
  {
    id: 'REV-1001',
    roomId: 'room-14',
    roomTitle: 'Room 14 – Family Room',
    guestName: 'Kristine Mendoza',
    guestEmail: 'kristine.mendoza@gmail.com',
    rating: 5,
    comment: 'Super clean and spacious family room! The aircon is very cold and parking is right in front. Will definitely stay here again when in Vigan.',
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    stayDate: 'October 2026',
    screenedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    screenedBy: 'Front Desk Admin',
  },
  {
    id: 'REV-1002',
    roomId: 'private-villa-pool',
    roomTitle: 'Private Villa (with Swimming Pool)',
    guestName: 'Mark Anthony Ramos',
    guestEmail: 'mark.ramos@gmail.com',
    rating: 5,
    comment: 'The private swimming pool is pristine and perfect for our reunion! Very peaceful ambiance and only 5 mins away from Calle Crisologo.',
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    stayDate: 'October 2026',
    screenedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    screenedBy: 'Front Desk Admin',
  },
  {
    id: 'REV-1003',
    roomId: 'room-8',
    roomTitle: 'Room 8 – Standard Double Room',
    guestName: 'Jayson Valdez',
    guestEmail: 'jayson.valdez@yahoo.com',
    rating: 5,
    comment: 'Great value for money. Very quiet location along Diversion Road with reliable Wi-Fi and 24-hr security CCTV.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    stayDate: 'October 2026',
  },
];


// Initial seed bookings so the calendar & front-desk screening have initial live data
const SEED_BOOKINGS: BookingRecord[] = [
  {
    id: 'DV-2026-8941',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    roomId: 'private-villa-pool',
    roomTitle: 'Private Villa (with Swimming Pool)',
    stayType: 'nightly',
    checkInDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    numberOfNights: 2,
    adultGuests: 10,
    childGuests: 2,
    addons: [
      { id: 'breakfast_set', name: 'Traditional Ilocano Breakfast Set', quantity: 10, cost: 3000 },
      { id: 'billiards_darts', name: 'Mini Billiards & Darts Access', quantity: 1, cost: 200 }
    ],
    baseRatePerUnit: 8000,
    baseStayTotal: 16000,
    addonsTotal: 3200,
    discountAmount: 0,
    grandTotal: 19200,
    paymentOption: 'partial_40',
    amountPaidNow: 7680,
    remainingBalance: 11520,
    paymentMethod: 'gcash',
    paymentSlipUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    paymentSlipFileName: 'gcash_deposit_ref78901.jpg',
    guestName: 'Atty. Roberto Dela Cruz',
    guestPhone: '0917 568 1408',
    guestEmail: 'roberto.delacruz@law.ph',
    specialRequests: 'Celebrating family anniversary. Early check-in requested if possible.',
    status: 'Pending Slip Review',
    staffNotes: '40% GCash downpayment slip uploaded. Awaiting front-desk reference check with GCash App.',
  },
  {
    id: 'DV-2026-6204',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    roomId: 'room-14',
    roomTitle: 'Room 14 – Family Room',
    stayType: 'nightly',
    checkInDate: new Date().toISOString().split('T')[0], // Today
    checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    numberOfNights: 1,
    adultGuests: 4,
    childGuests: 1,
    addons: [],
    baseRatePerUnit: 1500,
    baseStayTotal: 1500,
    addonsTotal: 0,
    discountAmount: 0,
    grandTotal: 1500,
    paymentOption: 'full',
    amountPaidNow: 1500,
    remainingBalance: 0,
    paymentMethod: 'gcash',
    paymentSlipUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    paymentSlipFileName: 'gcash_full_payment_ref4412.jpg',
    guestName: 'Kristine Mendoza',
    guestPhone: '0917 156 2062',
    guestEmail: 'kristine.mendoza@gmail.com',
    specialRequests: 'Extra blankets for children.',
    status: 'Confirmed',
    staffNotes: 'Verified via GCash 09175681408. Room 14 sanitized & keys prepared at front desk.',
  },
  {
    id: 'DV-2026-7818',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    roomId: 'room-18',
    roomTitle: 'Room 18 – Big Family Room',
    stayType: 'nightly',
    checkInDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    numberOfNights: 2,
    adultGuests: 8,
    childGuests: 0,
    addons: [],
    baseRatePerUnit: 2000,
    baseStayTotal: 4000,
    addonsTotal: 0,
    discountAmount: 0,
    grandTotal: 4000,
    paymentOption: 'full',
    amountPaidNow: 4000,
    remainingBalance: 0,
    paymentMethod: 'gcash',
    guestName: 'Maricel Soriano',
    guestPhone: '0922 841 9302',
    guestEmail: 'maricel.soriano@gmail.com',
    status: 'Confirmed',
    staffNotes: 'Reserved for Vigan heritage family tour.',
  },
  {
    id: 'DV-2026-5501',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    roomId: 'room-0',
    roomTitle: 'Room 0 – Big Family Room',
    stayType: 'nightly',
    checkInDate: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    numberOfNights: 2,
    adultGuests: 6,
    childGuests: 2,
    addons: [],
    baseRatePerUnit: 2000,
    baseStayTotal: 4000,
    addonsTotal: 0,
    discountAmount: 0,
    grandTotal: 4000,
    paymentOption: 'full',
    amountPaidNow: 4000,
    remainingBalance: 0,
    paymentMethod: 'front_desk',
    guestName: 'Eduardo Valerio',
    guestPhone: '0918 332 9941',
    status: 'Confirmed',
    staffNotes: 'Direct phone reservation.',
  }
];

const SEED_INQUIRIES: InquiryRecord[] = [
  {
    id: 'INQ-1042',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    fullName: 'Dr. Clarissa Alcantara',
    phone: '0991 296 0718',
    email: 'clarissa.alcantara@hospital.ph',
    roomInterest: 'Private Villa (Whole Compound)',
    targetDates: 'Next weekend (Fri-Sun)',
    message: 'Good day! We are planning a 15-pax medical team retreat. Is exclusive swimming pool access included and can we bring our own catering?',
    status: 'New'
  }
];

// Helper read/write functions
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Initialize seed data if files do not exist
if (!fs.existsSync(BOOKINGS_FILE)) {
  writeJsonFile(BOOKINGS_FILE, SEED_BOOKINGS);
}
if (!fs.existsSync(INQUIRIES_FILE)) {
  writeJsonFile(INQUIRIES_FILE, SEED_INQUIRIES);
}
if (!fs.existsSync(REVIEWS_FILE)) {
  writeJsonFile(REVIEWS_FILE, SEED_REVIEWS);
}
if (!fs.existsSync(ROOMS_FILE)) {
  writeJsonFile(ROOMS_FILE, ROOMS_DATA);
}

export const Storage = {
  // Bookings
  getBookings(): BookingRecord[] {
    const list = readJsonFile<BookingRecord[]>(BOOKINGS_FILE, SEED_BOOKINGS);
    if (!list || list.length === 0) {
      writeJsonFile(BOOKINGS_FILE, SEED_BOOKINGS);
      return SEED_BOOKINGS;
    }
    return list;
  },

  saveBookings(bookings: BookingRecord[]): void {
    writeJsonFile(BOOKINGS_FILE, bookings);
  },

  addBooking(booking: BookingRecord): BookingRecord {
    const list = this.getBookings();
    // Prepend new booking
    const updated = [booking, ...list];
    this.saveBookings(updated);
    return booking;
  },

  updateBookingStatus(
    bookingId: string, 
    status: BookingStatus, 
    notes?: string, 
    cancellationReason?: string
  ): BookingRecord | null {
    const list = this.getBookings();
    let updatedRecord: BookingRecord | null = null;

    const updated = list.map((b) => {
      if (b.id === bookingId) {
        const isCancelled = status === 'Cancelled';
        updatedRecord = {
          ...b,
          status,
          staffNotes: notes ? (b.staffNotes ? `${b.staffNotes} | ${notes}` : notes) : b.staffNotes,
          cancellationReason: isCancelled ? (cancellationReason || notes || 'Cancelled by Front Desk') : (b.status === 'Cancelled' ? undefined : b.cancellationReason),
          cancelledAt: isCancelled ? new Date().toISOString() : (b.status === 'Cancelled' ? undefined : b.cancelledAt),
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBookings(updated);
    }
    return updatedRecord;
  },

  rebook(bookingId: string, fields: Partial<BookingRecord>, note: string): BookingRecord | null {
    const list = this.getBookings();
    let updatedRecord: BookingRecord | null = null;

    const updated = list.map((b) => {
      if (b.id === bookingId) {
        const prevHistory = b.rebookingHistory || [];
        const historyEntry = {
          date: new Date().toISOString(),
          staffName: note || 'Front Desk Staff',
          previousDates: b.stayType === 'nightly' ? `${b.checkInDate} to ${b.checkOutDate}` : `${b.hourlyDate} (${b.hourlyStartTime})`,
          previousRoom: b.roomTitle,
          previousTotal: b.grandTotal,
          notes: note,
        };
        updatedRecord = {
          ...b,
          ...fields,
          rebookedAt: new Date().toISOString(),
          rebookingHistory: [historyEntry, ...prevHistory],
          staffNotes: b.staffNotes ? `${b.staffNotes} | Rebooked on ${new Date().toLocaleDateString()}: ${note}` : `Rebooked: ${note}`,
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBookings(updated);
    }
    return updatedRecord;
  },

  deleteBooking(bookingId: string): boolean {
    const list = this.getBookings();
    const filtered = list.filter((b) => b.id !== bookingId);
    if (filtered.length !== list.length) {
      this.saveBookings(filtered);
      return true;
    }
    return false;
  },

  // Date conflict checker to prevent double-booking
  hasDateConflict(
    roomId: string,
    stayType: 'nightly' | 'hourly',
    checkInDate?: string,
    checkOutDate?: string,
    hourlyDate?: string,
    excludeBookingId?: string
  ): { hasConflict: boolean; conflictingBooking?: BookingRecord } {
    const list = this.getBookings();

    for (const b of list) {
      if (b.id === excludeBookingId) continue;
      if (b.roomId !== roomId) continue;
      if (b.status === 'Cancelled') continue; // Cancelled releases the room

      if (stayType === 'nightly' && checkInDate && checkOutDate) {
        if (b.stayType === 'nightly' && b.checkInDate && b.checkOutDate) {
          // Check date overlap: [checkInDate, checkOutDate) with [b.checkInDate, b.checkOutDate)
          if (checkInDate < b.checkOutDate && checkOutDate > b.checkInDate) {
            return { hasConflict: true, conflictingBooking: b };
          }
        } else if (b.stayType === 'hourly' && b.hourlyDate) {
          if (b.hourlyDate >= checkInDate && b.hourlyDate < checkOutDate) {
            return { hasConflict: true, conflictingBooking: b };
          }
        }
      } else if (stayType === 'hourly' && hourlyDate) {
        if (b.stayType === 'hourly' && b.hourlyDate === hourlyDate) {
          return { hasConflict: true, conflictingBooking: b };
        } else if (b.stayType === 'nightly' && b.checkInDate && b.checkOutDate) {
          if (hourlyDate >= b.checkInDate && hourlyDate < b.checkOutDate) {
            return { hasConflict: true, conflictingBooking: b };
          }
        }
      }
    }

    return { hasConflict: false };
  },

  // Inquiries
  getInquiries(): InquiryRecord[] {
    return readJsonFile<InquiryRecord[]>(INQUIRIES_FILE, SEED_INQUIRIES);
  },

  saveInquiries(inquiries: InquiryRecord[]): void {
    writeJsonFile(INQUIRIES_FILE, inquiries);
  },

  addInquiry(inquiry: InquiryRecord): InquiryRecord {
    const list = this.getInquiries();
    const updated = [inquiry, ...list];
    this.saveInquiries(updated);
    return inquiry;
  },

  updateInquiryStatus(id: string, status: 'New' | 'Replied' | 'Archived'): InquiryRecord | null {
    const list = this.getInquiries();
    let found: InquiryRecord | null = null;
    const updated = list.map((inq) => {
      if (inq.id === id) {
        found = { ...inq, status };
        return found;
      }
      return inq;
    });
    if (found) {
      this.saveInquiries(updated);
    }
    return found;
  },

  updateInquiry(id: string, updatedInquiry: InquiryRecord): InquiryRecord | null {
    const list = this.getInquiries();
    let found: InquiryRecord | null = null;
    const updated = list.map((inq) => {
      if (inq.id === id) {
        found = { ...inq, ...updatedInquiry, id };
        return found;
      }
      return inq;
    });
    if (found) {
      this.saveInquiries(updated);
    }
    return found;
  },

  deleteInquiry(id: string): boolean {
    const list = this.getInquiries();
    const filtered = list.filter((inq) => inq.id !== id);
    if (filtered.length !== list.length) {
      this.saveInquiries(filtered);
      return true;
    }
    return false;
  },

  updateBooking(id: string, updatedBooking: BookingRecord): BookingRecord | null {
    const list = this.getBookings();
    let found: BookingRecord | null = null;
    const updated = list.map((b) => {
      if (b.id === id) {
        found = { ...b, ...updatedBooking, id };
        return found;
      }
      return b;
    });
    if (found) {
      this.saveBookings(updated);
    }
    return found;
  },

  // Rooms Inventory
  getRooms(): RoomUnit[] {
    return readJsonFile<RoomUnit[]>(ROOMS_FILE, ROOMS_DATA);
  },

  // Room Reviews
  getReviews(): RoomReview[] {
    return readJsonFile<RoomReview[]>(REVIEWS_FILE, SEED_REVIEWS);
  },

  saveReviews(reviews: RoomReview[]): void {
    writeJsonFile(REVIEWS_FILE, reviews);
  },

  addReview(review: RoomReview): RoomReview {
    const list = this.getReviews();
    const updated = [review, ...list];
    this.saveReviews(updated);
    return review;
  },

  updateReviewStatus(id: string, status: ReviewStatus, staffNotes?: string, screenedBy?: string): RoomReview | null {
    const list = this.getReviews();
    let found: RoomReview | null = null;
    const updated = list.map((r) => {
      if (r.id === id) {
        found = {
          ...r,
          status,
          staffNotes: staffNotes !== undefined ? staffNotes : r.staffNotes,
          screenedAt: new Date().toISOString(),
          screenedBy: screenedBy || 'Front Desk Staff',
        };
        return found;
      }
      return r;
    });
    if (found) {
      this.saveReviews(updated);
    }
    return found;
  },

  deleteReview(id: string): boolean {
    const list = this.getReviews();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      this.saveReviews(filtered);
      return true;
    }
    return false;
  },

  saveRooms(rooms: RoomUnit[]): void {
    writeJsonFile(ROOMS_FILE, rooms);
  }
};
