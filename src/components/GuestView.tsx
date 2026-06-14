/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Map as MapIcon, 
  Compass, 
  UtensilsCrossed, 
  Calendar, 
  Sparkles, 
  Check, 
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  User,
  Activity,
  Maximize2,
  Navigation,
  Globe,
  Settings,
  Info
} from 'lucide-react';
import { Spot, LanguageCode, UI_TRANSLATIONS, LANGUAGE_LABELS, TAG_OPTIONS } from '../types';

interface GuestViewProps {
  onGoToCms: () => void;
}

// Kyoto Gion Coordinates
interface Coords {
  lat: number;
  lng: number;
}

export default function GuestView({ onGoToCms }: GuestViewProps) {
  // Lang state strictly locked to Japanese (multilingual support removed)
  const lang: LanguageCode = 'ja';

  const [hotelConfig, setHotelConfig] = useState({
    name: '京都祇園グランドホテル',
    latitude: 35.0037,
    longitude: 135.7782,
  });

  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(['#すべて']);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(false);
  
  // GPS State
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Coords>({
    lat: 33.8492, // Temporarily initialized, will sync with hotelConfig
    lng: 132.7850,
  });
  
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  
  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);
  const hotelMarkerRef = useRef<L.Marker | null>(null);

  // Fetch Spots and Hotel coordinates from backend
  const fetchSpots = async () => {
    try {
      const hRes = await fetch('/api/hotel');
      if (hRes.ok) {
        const hData = await hRes.json();
        setHotelConfig(hData);
        // Sync user location to slightly southwest of the actual hotel config
        setUserLocation({
          lat: hData.latitude - 0.0007,
          lng: hData.longitude - 0.0015,
        });
      }

      const res = await fetch('/api/spots');
      if (res.ok) {
        const data = await res.json();
        // Filters active spots
        const activeSpots = data.filter((s: Spot) => s.status === 'active');
        setSpots(activeSpots);
      }
    } catch (e) {
      console.error('Error fetching spots/hotel:', e);
    }
  };

  useEffect(() => {
    fetchSpots();
    
    // Register absolute Page View (PV) to Express Statistics store
    fetch('/api/stats/pv', { method: 'POST' }).catch(() => {});
  }, []);

  // Set up leafet map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Create Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // Customized buttons
      center: [hotelConfig.latitude, hotelConfig.longitude],
      zoom: 16,
    });

    mapInstanceRef.current = map;
    setMapLoaded(true);

    // Load beautiful Voyager tile layers (fast, high-resolution, travel-vibe)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    // Add zoom control at bottom-right or top-left safely
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial load hotel marker
    const hotelHtml = `
      <div class="relative flex items-center justify-center w-11 h-11 bg-indigo-900 rounded-full border-[3px] border-white shadow-xl scale-105 duration-200 animate-pulse">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        <div class="absolute -bottom-1.5 w-2.5 h-2.5 bg-indigo-900 rotate-45 border-r border-b border-white"></div>
      </div>
    `;
    const hotelIcon = L.divIcon({
      html: hotelHtml,
      className: 'custom-hotel-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 40]
    });

    const hotelMarker = L.marker([hotelConfig.latitude, hotelConfig.longitude], { icon: hotelIcon })
      .addTo(map)
      .bindTooltip(hotelConfig.name, { permanent: true, direction: 'top', className: 'text-xs font-bold px-2.5 py-1 rounded-md border-indigo-200 bg-indigo-50 text-indigo-905 shadow-sm shadow-indigo-500/10' });
    
    hotelMarkerRef.current = hotelMarker;

    return () => {
      // Clean up on component unmount
      map.remove();
      mapInstanceRef.current = null;
      setMapLoaded(false);
    };
  }, [hotelConfig.latitude, hotelConfig.longitude]);

  // Handle GPS location icon change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    const gpsHtml = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute inset-0 gps-pulse-ring rounded-full"></div>
        <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10 flex items-center justify-center">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    `;

    const gpsIcon = L.divIcon({
      html: gpsHtml,
      className: 'custom-gps-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: gpsIcon }).addTo(map);
    userMarkerRef.current = userMarker;

  }, [userLocation]);

  // Core Tag filtration criteria
  const isSpotMatched = (spot: Spot): boolean => {
    if (selectedTags.includes('#すべて')) return true;
    
    // Check tags OR conditions
    return selectedTags.every(tag => {
      if (tag === '#すべて') return true;
      if (tag === '#スタッフ厳選') return spot.source === 'hotel_master';
      if (tag === '#本日開催イベント') {
        if (spot.type !== 'event') return false;
        // Verify if has event timeframe and overlaps today
        const todayStr = new Date().toISOString().split('T')[0];
        if (spot.event_start_at && spot.event_end_at) {
          return todayStr >= spot.event_start_at && todayStr <= spot.event_end_at;
        }
        return true; // Active generic event
      }
      if (tag === '#徒歩5分以内') {
        const dist = computeDistanceLocal(
          hotelConfig.latitude,
          hotelConfig.longitude,
          spot.latitude,
          spot.longitude
        );
        return dist <= 400; // Under 5 minutes (80m/min * 5min = 400m)
      }
      return spot.tags.includes(tag);
    });
  };

  // Local calculation of distance to ensure instant updates with Simulated movement
  const computeDistanceLocal = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Re-draw Pins on tag click / spot collection adjustments
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    (Object.values(markersRef.current) as any[]).forEach(m => {
      if (m && typeof m.remove === 'function') {
        m.remove();
      }
    });
    markersRef.current = {};

    // Filter spots
    const matchedSpots = spots.filter(isSpotMatched);

    // Add Pins
    matchedSpots.forEach(spot => {
      const isSelected = selectedSpot?.id === spot.id;
      const isStaffPick = spot.source === 'hotel_master';
      
      let colorClass = 'bg-blue-600';
      let iconSvg = '';

      if (spot.type === 'restaurant') {
        colorClass = 'bg-emerald-500';
        iconSvg = `
          <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        `;
      } else if (spot.type === 'event') {
        colorClass = 'bg-rose-500';
        iconSvg = `
          <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        `;
      } else {
        colorClass = 'bg-purple-500';
        iconSvg = `
          <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        `;
      }

      const outerClass = isSelected 
        ? 'scale-125 z-[999] ring-2 ring-offset-2 ring-indigo-600' 
        : isStaffPick 
          ? 'star-pulse-marker border-2 border-white' 
          : 'hover:scale-110 border border-white';

      const pinHtml = `
        <div class="relative group duration-150 flex flex-col items-center">
          <div class="w-9 h-9 ${isStaffPick ? 'bg-amber-400' : colorClass} rounded-full flex items-center justify-center shadow-lg ${outerClass}">
            ${isStaffPick ? `
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ` : iconSvg}
          </div>
          <div class="absolute -bottom-1 w-2.5 h-2.5 ${isStaffPick ? 'bg-amber-400' : colorClass} rotate-45 z-0"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'custom-spot-pin',
        iconSize: [40, 40],
        iconAnchor: [20, 36]
      });

      const googleMapsUrlStr = spot.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`;
      const popupHtml = `
        <div class="p-1 font-sans text-slate-800" style="min-width: 120px;">
          <p class="font-bold text-xs mb-1">${spot.name.ja}</p>
          <a href="${googleMapsUrlStr}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-[10px] font-bold text-indigo-600 hover:underline">
            Googleマップで開く ↗
          </a>
        </div>
      `;

      const marker = L.marker([spot.latitude, spot.longitude], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupHtml, { closeButton: false, offset: [0, -24] })
        .on('click', () => {
          setSelectedSpot(spot);
          setIsSheetExpanded(false);
          map.setView([spot.latitude - 0.001, spot.longitude], 17, { animate: true });
        });

      markersRef.current[spot.id] = marker;
    });

  }, [spots, selectedTags, selectedSpot, mapLoaded, hotelConfig]);

  // Track user real-time position with browser Geolocator
  const toggleGpsTracking = () => {
    if (gpsActive) {
      setGpsActive(false);
      // Re-center on hotel
      mapInstanceRef.current?.setView([hotelConfig.latitude, hotelConfig.longitude], 16, { animate: true });
    } else {
      setGpsActive(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const current: Coords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            };
            setUserLocation(current);
            mapInstanceRef.current?.setView([current.lat, current.lng], 16, { animate: true });
          },
          (err) => {
            console.warn('Geolocation access failed. Proceed with synchronized hotel proximity coordinate updates instead.', err);
            // Default to hotel-adjacent coordinates
            const defaultSimCoords = {
              lat: hotelConfig.latitude - 0.0007,
              lng: hotelConfig.longitude - 0.0015
            };
            setUserLocation(defaultSimCoords);
            mapInstanceRef.current?.setView([defaultSimCoords.lat, defaultSimCoords.lng], 16, { animate: true });
          },
          { enableHighAccuracy: true }
        );
      }
    }
  };

  // Tag chip multi-selector trigger
  const handleTagClick = (tag: string) => {
    if (tag === '#すべて') {
      setSelectedTags(['#すべて']);
      return;
    }

    let filterList = [...selectedTags].filter(t => t !== '#すべて');
    if (filterList.includes(tag)) {
      filterList = filterList.filter(t => t !== tag);
      if (filterList.length === 0) {
        filterList = ['#すべて'];
      }
    } else {
      filterList.push(tag);
    }
    setSelectedTags(filterList);
  };

  // Helper translations lookup
  const t = (key: string, variables: Record<string, any> = {}): string => {
    const translations = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS['ja'];
    let text = translations[key] || UI_TRANSLATIONS['ja'][key] || key;
    
    Object.keys(variables).forEach(vKey => {
      text = text.replace(`{${vKey}}`, String(variables[vKey]));
    });
    return text;
  };

  // Compute live user distance to the currently activated spot
  const getLiveSpotDetails = (spot: Spot) => {
    // Distance from current location (simulated or real GPS)
    const dist = computeDistanceLocal(userLocation.lat, userLocation.lng, spot.latitude, spot.longitude);
    const min = Math.max(1, Math.ceil(dist / 80)); // 80m per min
    return { dist, min };
  };

  // Navigation Deeplink builder
  const handleNavigationRedirect = (spot: Spot) => {
    // Prefer registered Google Maps URL if available
    if (spot.google_maps_url && spot.google_maps_url.trim() !== '') {
      window.open(spot.google_maps_url, '_blank');
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const url = isIOS 
      ? `maps://?q=${spot.latitude},${spot.longitude}` 
      : `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="relative w-full h-[100dvh] bg-slate-900 flex flex-col overflow-hidden select-none">
      
      {/* 1. TOP MOBILE HEADER */}
      <header className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-slate-250 flex items-center justify-between px-5 shrink-0 z-[1000] shadow-sm">
        <div className="flex items-center gap-2">
          {/* Elegant Crest Hotel Icon - Indigo Serif Style */}
          <div className="w-7 h-7 bg-indigo-900 rounded-sm flex items-center justify-center text-white font-serif italic font-bold text-lg shrink-0">
            G
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-slate-800 tracking-tight text-[11px] sm:text-xs leading-none uppercase">
              {hotelConfig.name}
            </h1>
            <p className="text-[8px] font-mono text-slate-400 tracking-wider font-semibold uppercase mt-0.5">
              {t('appTitle')}
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2">
          {/* CMS Link Button */}
          <button 
            id="btn-guest-cms-toggle"
            onClick={onGoToCms}
            className="w-7 h-7 bg-slate-100 hover:bg-indigo-900 hover:text-white active:scale-95 duration-150 rounded flex items-center justify-center text-slate-600 border border-slate-200 transition-colors"
            title={t('cmsButton')}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. CHIP TAG BAR (FLOATING UNDER THE HEADER) */}
      <div className="absolute top-14 left-0 right-0 h-12 z-[1000] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-center px-4 gap-2 pointer-events-auto bg-white/90 backdrop-blur-sm border-b border-slate-200">
        {TAG_OPTIONS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          // Translate tags dynamically index-wise or just tags label
          let label = tag.replace('#', '');
          if (tag === '#すべて') label = t('categoryAll');
          if (tag === '#スタッフ厳選') label = '★ ' + t('spotLabelHotelSelected');
          if (tag === '#本日開催イベント') label = t('statusTodayEvent');

          return (
            <button
              id={`tag-chip-${tag.replace('#', '')}`}
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs transition-all duration-150 cursor-pointer ${
                isSelected 
                  ? 'bg-indigo-900 text-white font-bold shadow' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200 font-semibold hover:bg-slate-200 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 3. LEAFLET MAP ELEMENT */}
      <div 
        id="leaflet-base-map"
        ref={mapContainerRef} 
        className="w-full h-full z-10"
      />

      {/* 4. FLOATING GPS POSITIONING CONTROLS */}
      <div className="absolute right-4 bottom-52 flex flex-col space-y-3 z-[1000]">
        {/* GPS tracking */}
        <button
          id="btn-gps-geolocation"
          onClick={toggleGpsTracking}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border outline-none active:scale-90 transition-all duration-200 cursor-pointer ${
            gpsActive 
              ? 'bg-indigo-900 text-white border-indigo-950 shadow-indigo-950/20' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title={t('gpsTrackingInactive')}
        >
          <Compass className={`w-6 h-6 ${gpsActive ? 'animate-spin-slow' : ''}`} />
        </button>
      </div>

      {/* 5. SLIDING BOTTOM SHEET FOR DETAIL */}
      <AnimatePresence>
        {selectedSpot && (
          <motion.div
            id="spot-detail-bottom-sheet"
            initial={{ y: '100%' }}
            animate={{ y: isSheetExpanded ? '0%' : '55%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-slate-100 shadow-2xl z-[1001] overflow-hidden flex flex-col"
            style={{ height: '80dvh' }}
          >
            {/* Sheet Handle */}
            <div 
              className="h-8 w-full flex items-center justify-center cursor-pointer hover:bg-slate-50 active:bg-slate-100 shrink-0"
              onClick={() => setIsSheetExpanded(!isSheetExpanded)}
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mt-1"></div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pb-8">
              
              {/* Cover Photo with Quick Close */}
              <div className="relative h-44 md:h-52 bg-slate-200 w-full overflow-hidden shrink-0">
                <img 
                  src={(selectedSpot.image_urls && selectedSpot.image_urls[0]) || 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600'} 
                  alt={selectedSpot.name[lang] || selectedSpot.name.ja} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating Dismiss Button */}
                <button
                  id="btn-sheet-close"
                  onClick={() => {
                    setSelectedSpot(null);
                    setIsSheetExpanded(false);
                  }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/85 transition"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>

                {/* Badges Overlay */}
                <div className="absolute bottom-4 left-4 flex gap-1.5">
                  <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-wider text-white shadow-sm uppercase ${
                    selectedSpot.source === 'hotel_master' ? 'bg-amber-500' : 'bg-indigo-900'
                  }`}>
                    {selectedSpot.source === 'hotel_master' ? '★ ' + t('spotLabelHotelSelected') : t('spotLabelGeneral')}
                  </span>
                  <span className="px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-wider text-white bg-slate-900/80 shadow-sm uppercase">
                    {selectedSpot.type === 'restaurant' ? t('categoryRestaurant') : selectedSpot.type === 'event' ? t('categoryEvent') : t('categorySightseeing')}
                  </span>
                </div>
              </div>

              {/* Text Descriptions */}
              <div className="p-6">
                {/* Title & Live Walk score inline header summary */}
                <div className="flex justify-between items-start mb-4 gap-4 border-b border-slate-100 pb-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        selectedSpot.source === 'hotel_master' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-800'
                      }`}>
                        {selectedSpot.source === 'hotel_master' ? t('spotLabelHotelSelected') : t('spotLabelGeneral')}
                      </span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                        {selectedSpot.type === 'restaurant' ? t('categoryRestaurant') : selectedSpot.type === 'event' ? t('categoryEvent') : t('categorySightseeing')}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                      {selectedSpot.name[lang] || selectedSpot.name.ja}
                    </h2>
                  </div>

                  {(() => {
                    const { dist, min } = getLiveSpotDetails(selectedSpot);
                    return (
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-indigo-600 flex items-center justify-end gap-1">
                          <span>{t('distanceWalk', { min, dist }).split(' / ')[0]}</span>
                          <span className="text-[10px] text-slate-400">/ {dist}m</span>
                        </div>
                        <div className="text-[10px] font-medium text-emerald-600 flex items-center justify-end gap-1 mt-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          {t('statusOpen')}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Event timeframe display */}
                {selectedSpot.type === 'event' && selectedSpot.event_end_at && (
                  <div className="mb-4 flex items-center text-xs text-rose-700 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg font-medium">
                    <Calendar className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>
                      {selectedSpot.event_start_at} ～ {selectedSpot.event_end_at}
                    </span>
                  </div>
                )}

                {/* Description paragraphs */}
                <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedSpot.description[lang] || selectedSpot.description.ja || 'No description available in this language.'}
                </p>

                {/* Tags section */}
                {selectedSpot.tags && selectedSpot.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-5">
                    {selectedSpot.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Sticky bar */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex space-x-3 shrink-0">
              <button
                id="btn-trigger-navigation"
                onClick={() => handleNavigationRedirect(selectedSpot)}
                className="w-full py-3.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <Navigation className="w-4.5 h-4.5" />
                {/iPad|iPhone|iPod/.test(navigator.userAgent) ? t('routeGuidanceApple') : t('routeGuidance')}
                <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-60" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 6. NO MATCH STATS FOOTER */}
      {spots.filter(isSpotMatched).length === 0 && (
        <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl border border-rose-100 p-4 text-center shadow-lg z-50 animate-fade-in">
          <Info className="w-6 h-6 text-rose-500 mx-auto mb-1" />
          <p className="text-xs text-slate-600">
            {t('noSpotsFound')}
          </p>
        </div>
      )}

      {/* FOOTER ACCREDITATION DISPLAY */}
      <footer className="absolute bottom-1 w-full text-center z-50 pointer-events-none pb-0.5">
        <span className="text-[8px] font-mono text-slate-400 bg-white/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-slate-100 shadow-sm select-none">
          {t('aboutApp')}
        </span>
      </footer>

    </div>
  );
}
