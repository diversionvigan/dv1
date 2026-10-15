import React, { useState } from 'react';
import { VillaLogo } from './VillaLogo';
import { 
  Compass, 
  PhoneCall, 
  Menu, 
  X, 
  Phone,
  Calendar,
  Sparkles,
  CalendarCheck,
  MapPin
} from 'lucide-react';

import { NavigationTab } from '../types';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isAdminLoggedIn: boolean;
  onBookNow?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onBookNow,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavigationTab; label: string; icon: any }[] = [
    { id: 'explore', label: 'Explore Rooms', icon: Compass },
    { id: 'private-villa', label: 'Private Villa', icon: Sparkles },
    { id: 'my-bookings', label: 'My Bookings', icon: CalendarCheck },
    { id: 'contact', label: 'Contact Us', icon: PhoneCall },
  ];

  const handleSelectTab = (id: NavigationTab) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const googleMapsUrl = "https://www.google.com/maps/place/Diversion+Vigan+Transient+%26+Private+Villa/@17.5666815,120.3921488,269m/data=!3m1!1e3!4m10!1m2!2m1!1sdiversion+road+brgy+cabalangan+vigan+city+ilocos+sur!3m6!1s0x338e651f9dfcba0d:0x4a48f2f25443ecf0!8m2!3d17.5667039!4d120.3928579!15sCjRkaXZlcnNpb24gcm9hZCBicmd5IGNhYmFsangaZ2FuIHZpZ2FuIGNpdHkgaWxvY29zIHN1clowMiRkaXZlcnNpb24gcm9hZCBicmd5IGNhYmFsangaZ2FuIHZpZ2FuIGNpdHkgaWxvY29zIHN1clSAQNpbm6aASRDaGREU1VoTk1HOW5TMFZKUTBGblRVUnZjRGRxVnpCblJSQULgAQD6AQQIABAq!16s%2Fg%2F11kr94q0_6?entry=ttu&g_ep=EgoyMDI2MTAxMi4wIKXMDSoASAFQAw%3D%3D";

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E6D7C3]/80 shadow-xs transition-all duration-300">
      {/* Top micro-bar for direct contact & location in elegant Brown & Gold */}
      <div className="bg-gradient-to-r from-[#180F09] via-[#2A1A0F] to-[#180F09] text-[#F9F3E5] text-[11px] py-1 px-4 hidden md:block border-b border-[#D4AF37]/25">
        <div className="max-w-7xl mx-auto flex justify-between items-center tracking-wide">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5C158] animate-pulse"></span>
              24/7 Front Gate &amp; Assistance: Diversion Road, Brgy Cabalangegan, Vigan City
            </span>
            <span className="text-[#8B6B10]">|</span>
            <span className="text-[#FFF2CC]">5-8 Mins from Calle Crisologo &amp; Plaza Salcedo</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#E5C158] hover:text-white transition-colors font-semibold cursor-pointer"
              title="Open Google Maps Location"
            >
              <MapPin className="w-3 h-3 text-[#D4AF37]" />
              <span>Locate Us</span>
            </a>
            <span className="text-[#8B6B10]">|</span>
            <button 
              type="button"
              onClick={() => handleSelectTab('contact')}
              className="flex items-center gap-1 text-[#E5C158] hover:text-white transition-colors font-semibold cursor-pointer"
              title="Open Contact & Inquiries"
            >
              <Phone className="w-3 h-3" />
              <span>Hotline: +63 917 568 1408 / +63 917 156 2062</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation header - Compact h-15 (60px) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Logo & Property Brand */}
          <div 
            onClick={() => handleSelectTab('explore')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <VillaLogo size={40} variant="gold" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span 
                  style={{ fontSize: '16px' }}
                  className="font-brand font-black text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-[#2C1E15] via-[#785423] to-[#B8860B] tracking-[0.12em] uppercase drop-shadow-2xs group-hover:brightness-110 transition-all leading-tight"
                >
                  Diversion Vigan
                </span>
                <span 
                  style={{ fontSize: '10px' }}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider hidden sm:inline-block font-monogram shadow-2xs"
                >
                  Ilocos Sur
                </span>
              </div>
              <span 
                className="text-[10px] sm:text-xs font-serif tracking-[0.15em] text-[#8B6B10] font-bold leading-none"
              >
                Transient &amp; Private Villa
              </span>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#1F140C] text-[#FFFDF7] shadow-sm shadow-[#1F140C]/20 border border-[#D4AF37]/50'
                      : 'text-[#4A3222] hover:bg-[#F6EFE5] hover:text-[#1F140C]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E5C158]' : 'text-[#8B6B10]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {onBookNow && (
              <a
                href="#book-now"
                onClick={(e) => {
                  e.preventDefault();
                  onBookNow();
                }}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#8B6B10] hover:text-[#1F140C] hover:bg-[#F6EFE5] transition-all duration-200 cursor-pointer"
                title="Direct Online Reservation"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>Book Now</span>
              </a>
            )}
          </nav>

          {/* Right Header: Locate Us + Book Now button + Mobile Toggle */}
          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-[#FAF7F2] hover:bg-[#F3EBE0] text-[#2C1E15] px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold border border-[#E6D7C3] transition-all cursor-pointer shadow-2xs hover:shadow-xs shrink-0"
              title="Open Google Maps Location"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8B6B10]" />
              <span>Locate Us</span>
            </a>

            {onBookNow && (
              <a
                href="#book-now"
                onClick={(e) => {
                  e.preventDefault();
                  onBookNow();
                }}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] hover:from-[#A67908] hover:to-[#B8860B] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm shadow-amber-950/20 hover:shadow transition-all cursor-pointer border border-white/20 group active:scale-95"
                title="Book Now — Instant Reservation & Rates"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFF2CC] group-hover:rotate-12 transition-transform" />
                <span>Book Now</span>
              </a>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#2C1E15] hover:bg-[#F6EFE5] transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FDFBF7]/95 backdrop-blur-xl border-b border-[#E6D7C3] px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#1F140C] text-white border border-[#D4AF37]/40'
                      : 'text-[#2C1E15] hover:bg-[#F6EFE5]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#E5C158]' : 'text-[#8B6B10]'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-[#2C1E15] hover:bg-[#F6EFE5] transition-all border border-[#E6D7C3]"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#8B6B10]" />
                <span>Locate Us (Google Maps)</span>
              </div>
            </a>

            {onBookNow && (
              <a
                href="#book-now"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  onBookNow();
                }}
                className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#997A15] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                title="Book Now - Open Online Reservation"
              >
                <Sparkles className="w-4 h-4 text-[#FFF2CC]" />
                <span>Book Now</span>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
