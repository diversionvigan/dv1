import { GuestAccount } from "../types";

export const GUEST_ACCOUNTS_STORAGE_KEY = "diversion_vigan_guest_registered_accounts";
export const GUEST_SESSION_STORAGE_KEY = "diversion_vigan_guest_session";
export const INACTIVITY_DAYS_LIMIT = 90;
const INACTIVITY_MS_LIMIT = INACTIVITY_DAYS_LIMIT * 24 * 60 * 60 * 1000;

/**
 * Automatically purges any guest accounts that have had no activity within 90 days.
 * Returns the list of active accounts and whether the current session was purged.
 */
export function purgeInactiveGuestAccounts(): {
  activeAccounts: GuestAccount[];
  purgedCount: number;
  currentSessionPurged: boolean;
} {
  try {
    const rawAccounts = localStorage.getItem(GUEST_ACCOUNTS_STORAGE_KEY);
    const rawSession = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    
    let accounts: GuestAccount[] = [];
    if (rawAccounts) {
      const parsed = JSON.parse(rawAccounts);
      if (Array.isArray(parsed)) {
        accounts = parsed;
      }
    }

    const now = Date.now();
    let purgedCount = 0;
    const activeAccounts: GuestAccount[] = [];

    for (const acc of accounts) {
      const lastActiveTime = new Date(acc.lastActiveAt || acc.createdAt || now).getTime();
      const diffMs = now - lastActiveTime;
      
      // Auto-remove if inactive for more than 90 days
      if (diffMs > INACTIVITY_MS_LIMIT) {
        purgedCount++;
      } else {
        activeAccounts.push(acc);
      }
    }

    // Persist cleaned accounts if changes occurred
    if (purgedCount > 0 || !rawAccounts) {
      localStorage.setItem(GUEST_ACCOUNTS_STORAGE_KEY, JSON.stringify(activeAccounts));
    }

    // Check if current active session was among purged
    let currentSessionPurged = false;
    if (rawSession) {
      const currentSession: GuestAccount = JSON.parse(rawSession);
      const sessionLastActive = new Date(currentSession.lastActiveAt || currentSession.createdAt || now).getTime();
      if (now - sessionLastActive > INACTIVITY_MS_LIMIT || (currentSession.id && !activeAccounts.some(a => a.id === currentSession.id))) {
        localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        currentSessionPurged = true;
      }
    }

    return { activeAccounts, purgedCount, currentSessionPurged };
  } catch (err) {
    console.error("Error purging inactive guest accounts:", err);
    return { activeAccounts: [], purgedCount: 0, currentSessionPurged: false };
  }
}

/**
 * Get current active guest session after verifying 90-day validity
 */
export function getActiveGuestSession(): GuestAccount | null {
  try {
    const { currentSessionPurged } = purgeInactiveGuestAccounts();
    if (currentSessionPurged) return null;

    const raw = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!raw) return null;
    
    const account: GuestAccount = JSON.parse(raw);
    return account;
  } catch {
    return null;
  }
}

/**
 * Touch and update lastActiveAt timestamp for an active guest
 */
export function touchGuestSession(accountId: string): void {
  try {
    const nowIso = new Date().toISOString();
    const rawAccounts = localStorage.getItem(GUEST_ACCOUNTS_STORAGE_KEY);
    if (rawAccounts) {
      const accounts: GuestAccount[] = JSON.parse(rawAccounts);
      const updated = accounts.map((a) => (a.id === accountId ? { ...a, lastActiveAt: nowIso } : a));
      localStorage.setItem(GUEST_ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    }

    const rawSession = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (rawSession) {
      const session: GuestAccount = JSON.parse(rawSession);
      if (session.id === accountId) {
        session.lastActiveAt = nowIso;
        localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    }
  } catch (e) {
    console.error("Error touching guest session:", e);
  }
}

/**
 * Register or update guest account and sign them in
 */
export function registerGuestAccount(data: {
  username: string;
  password?: string;
  fullName: string;
  phone: string;
  email?: string;
  bookingId?: string;
}): { success: boolean; account?: GuestAccount; error?: string } {
  try {
    purgeInactiveGuestAccounts();

    const cleanUsername = data.username.trim().toLowerCase();
    const cleanPhone = data.phone.trim();
    const cleanName = data.fullName.trim();
    const cleanEmail = (data.email || "").trim().toLowerCase();
    const nowIso = new Date().toISOString();

    if (!cleanUsername) {
      return { success: false, error: "Please choose a username." };
    }
    if (!cleanName) {
      return { success: false, error: "Please enter your full name." };
    }
    if (!cleanPhone) {
      return { success: false, error: "Please enter your active mobile phone number." };
    }

    const rawAccounts = localStorage.getItem(GUEST_ACCOUNTS_STORAGE_KEY);
    let accounts: GuestAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];

    // Check if username is already taken by another account with different details
    const existingIndex = accounts.findIndex(
      (a) => a.username.toLowerCase() === cleanUsername
    );

    let finalAccount: GuestAccount;

    if (existingIndex >= 0) {
      // Update existing account
      const existing = accounts[existingIndex];
      const updatedBookingIds = Array.from(
        new Set([...(existing.bookingIds || []), ...(data.bookingId ? [data.bookingId] : [])])
      );

      finalAccount = {
        ...existing,
        fullName: cleanName || existing.fullName,
        phone: cleanPhone || existing.phone,
        email: cleanEmail || existing.email,
        password: data.password || existing.password,
        lastActiveAt: nowIso,
        bookingIds: updatedBookingIds,
      };

      accounts[existingIndex] = finalAccount;
    } else {
      // Create new account
      finalAccount = {
        id: `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: cleanUsername,
        password: data.password || "",
        fullName: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        createdAt: nowIso,
        lastActiveAt: nowIso,
        bookingIds: data.bookingId ? [data.bookingId] : [],
      };
      accounts.push(finalAccount);
    }

    localStorage.setItem(GUEST_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(finalAccount));
    
    // Also sync legacy keys for backward compatibility
    localStorage.setItem("diversion_vigan_guest_account", JSON.stringify({
      name: finalAccount.fullName,
      phone: finalAccount.phone,
      email: finalAccount.email || "",
      username: finalAccount.username,
      password: finalAccount.password || "",
      registeredAt: finalAccount.createdAt,
      lastActiveAt: finalAccount.lastActiveAt,
    }));

    return { success: true, account: finalAccount };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create guest account" };
  }
}

/**
 * Sign in guest by username, email, or phone
 */
export function signInGuest(
  identifier: string,
  password?: string
): { success: boolean; account?: GuestAccount; error?: string } {
  try {
    purgeInactiveGuestAccounts();

    const rawAccounts = localStorage.getItem(GUEST_ACCOUNTS_STORAGE_KEY);
    const accounts: GuestAccount[] = rawAccounts ? JSON.parse(rawAccounts) : [];

    const cleanInput = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[^0-9]/g, "");

    if (!cleanInput) {
      return { success: false, error: "Please enter your username, email, or phone number." };
    }

    // Match by username, email, or phone
    const matched = accounts.find((a) => {
      if (a.username.toLowerCase() === cleanInput) return true;
      if (a.email && a.email.toLowerCase() === cleanInput) return true;
      if (cleanDigits && cleanDigits.length >= 7 && a.phone) {
        const phoneDigits = a.phone.replace(/[^0-9]/g, "");
        if (phoneDigits && (phoneDigits === cleanDigits || phoneDigits.endsWith(cleanDigits) || cleanDigits.endsWith(phoneDigits))) {
          return true;
        }
      }
      return false;
    });

    if (!matched) {
      return {
        success: false,
        error: "No active guest account found with those credentials. If you are a new guest, please create an account or reserve a room.",
      };
    }

    // If password is provided or configured
    if (matched.password && password) {
      if (matched.password.trim() !== password.trim()) {
        return { success: false, error: "Incorrect password. Please verify and try again." };
      }
    }

    // Update active timestamp
    const nowIso = new Date().toISOString();
    const updatedAccount = { ...matched, lastActiveAt: nowIso };

    const updatedAccounts = accounts.map((a) => (a.id === matched.id ? updatedAccount : a));
    localStorage.setItem(GUEST_ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
    localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(updatedAccount));

    // Also sync legacy key
    localStorage.setItem("diversion_vigan_guest_account", JSON.stringify({
      name: updatedAccount.fullName,
      phone: updatedAccount.phone,
      email: updatedAccount.email || "",
      username: updatedAccount.username,
      password: updatedAccount.password || "",
      registeredAt: updatedAccount.createdAt,
      lastActiveAt: updatedAccount.lastActiveAt,
    }));

    return { success: true, account: updatedAccount };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to sign in." };
  }
}

/**
 * Sign out guest session
 */
export function signOutGuest(): void {
  try {
    localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    localStorage.removeItem("diversion_vigan_guest_account");
  } catch (e) {
    console.error("Error signing out guest:", e);
  }
}

/**
 * Calculate remaining days before 90-day inactivity removal
 */
export function calculateDaysRemaining(lastActiveAt: string): number {
  try {
    const lastActive = new Date(lastActiveAt).getTime();
    const elapsedMs = Date.now() - lastActive;
    const remainingMs = INACTIVITY_MS_LIMIT - elapsedMs;
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return Math.max(0, Math.min(INACTIVITY_DAYS_LIMIT, days));
  } catch {
    return INACTIVITY_DAYS_LIMIT;
  }
}
