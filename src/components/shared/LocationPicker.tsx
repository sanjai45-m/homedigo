'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { reverseGeocode, searchLocations } from '@/lib/geo';

interface LocationPickerProps {
  initialLocationName?: string;
  initialCity?: string;
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (location: {
    locationName: string;
    city: string;
    lat: number;
    lng: number;
    fullAddress?: string;
  }) => void;
  label?: string;
  placeholder?: string;
}

export default function LocationPicker({
  initialLocationName = '',
  initialCity = 'Bengaluru',
  initialLat = 12.9716,
  initialLng = 77.5946,
  onLocationSelect,
  label = 'Operating / Practice Location',
  placeholder = 'Search locality, clinic address, or detect live GPS...',
}: LocationPickerProps) {
  const [query, setQuery] = useState(initialLocationName);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync initial values if changed
  useEffect(() => {
    if (initialLocationName && !query) {
      setQuery(initialLocationName);
    }
  }, [initialLocationName]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 3 || (selectedCoords && query === initialLocationName)) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(query);
      setSuggestions(results);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGPS(true);
    setStatusMessage('Acquiring live GPS satellite position...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedCoords({ lat, lng });

        setStatusMessage('Reverse geocoding address...');
        const geoResult = await reverseGeocode(lat, lng);

        const locName = geoResult.displayName || `Bengaluru (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setQuery(locName);
        setStatusMessage(null);
        setIsDetectingGPS(false);

        onLocationSelect({
          locationName: locName,
          city: geoResult.city || 'Bengaluru',
          lat,
          lng,
          fullAddress: geoResult.fullAddress,
        });
      },
      (err) => {
        console.error('GPS error:', err);
        setIsDetectingGPS(false);
        setStatusMessage('Could not access live GPS. Please type your location.');
        setTimeout(() => setStatusMessage(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSelectSuggestion = (item: any) => {
    setQuery(item.displayName);
    setSelectedCoords({ lat: item.lat, lng: item.lng });
    setSuggestions([]);

    onLocationSelect({
      locationName: item.displayName,
      city: item.city || 'Bengaluru',
      lat: item.lat,
      lng: item.lng,
      fullAddress: item.fullAddress,
    });
  };

  return (
    <div className="space-y-1.5 relative text-xs" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={isDetectingGPS}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-all"
        >
          {isDetectingGPS ? (
            <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
          ) : (
            <Navigation className="w-3 h-3 text-teal-600" />
          )}
          <span>{isDetectingGPS ? 'Detecting...' : 'Detect Live GPS'}</span>
        </button>
      </div>

      {/* Input Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedCoords(null);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
        />
        {isSearching && (
          <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
        {!isSearching && query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setSelectedCoords(null);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-100 max-h-56 overflow-y-auto">
          {suggestions.map((item) => (
            <button
              key={item.placeId || `${item.lat}-${item.lng}`}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left p-3 hover:bg-teal-50/70 border-b border-slate-100 last:border-b-0 flex items-start gap-2.5 transition-colors"
            >
              <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-xs">{item.displayName}</div>
                <div className="text-[11px] text-slate-500 truncate max-w-sm">{item.fullAddress}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Status Message or Resolved Coordinates */}
      {statusMessage && (
        <p className="text-[11px] text-teal-700 font-semibold animate-pulse">{statusMessage}</p>
      )}

      {selectedCoords && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>
            Lat: {Number(selectedCoords.lat).toFixed(4)}, Lng: {Number(selectedCoords.lng).toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
}
