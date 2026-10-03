'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Stethoscope, 
  HeartHandshake, 
  Bandage, 
  Activity, 
  TestTube, 
  Truck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Sparkles, 
  User,
  Plus,
  RefreshCw,
  UserCheck,
  Award,
  DollarSign,
  Navigation,
  LocateFixed,
  Loader2,
  AlertTriangle,
  UserPlus,
  X
} from 'lucide-react';
import { calculateDistanceKm, estimateTravelMinutes, reverseGeocode } from '@/lib/geo';
import LocationPicker from '@/components/shared/LocationPicker';

export default function BookServicePage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
        <span>Loading Booking Wizard...</span>
      </div>
    }>
      <BookServiceContent />
    </Suspense>
  );
}

function BookServiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const initialServiceId = searchParams.get('service') || '';
  const initialDoctorId = searchParams.get('doctor') || '';

  const userId = (session?.user as any)?.id || session?.user?.email || 'usr_pat_001';
  const userEmail = session?.user?.email || '';

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Dynamic state from backend APIs
  const [services, setServices] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  // Booking Form State
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState(initialDoctorId);
  const [scheduledDate, setScheduledDate] = useState('Today');
  const [scheduledSlot, setScheduledSlot] = useState('10:00 AM - 11:00 AM');
  const [paymentMethod, setPaymentMethod] = useState<'UPI_INTENT' | 'UPI_QR' | 'CARD'>('UPI_INTENT');

  // Inline Quick Add Modals
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileRelation, setNewProfileRelation] = useState('Self');
  const [newProfileAge, setNewProfileAge] = useState('30');
  const [newProfileGender, setNewProfileGender] = useState('Male');
  const [newProfileBloodGroup, setNewProfileBloodGroup] = useState('O+');
  const [newProfileNotes, setNewProfileNotes] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('Home');
  const [newAddressLine1, setNewAddressLine1] = useState('');
  const [newAddressLine2, setNewAddressLine2] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newLat, setNewLat] = useState<number | null>(null);
  const [newLng, setNewLng] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  // Live Patient GPS State
  const [patientCoords, setPatientCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Load backend data dynamically from DB
  useEffect(() => {
    async function loadData() {
      try {
        const [srvRes, profRes, addrRes, partnerRes] = await Promise.all([
          fetch('/api/services'),
          fetch(`/api/patient/profiles?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`),
          fetch(`/api/patient/addresses?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`),
          fetch('/api/admin/partners'),
        ]);
        const srvData = await srvRes.json();
        const profData = await profRes.json();
        const addrData = await addrRes.json();
        const partnerData = await partnerRes.json();

        const loadedServices = srvData.services || [];
        setServices(loadedServices);
        if (loadedServices.length > 0) {
          if (initialServiceId && loadedServices.some((s: any) => s.id === initialServiceId)) {
            setSelectedServiceId(initialServiceId);
          } else {
            setSelectedServiceId(loadedServices[0].id);
          }
        }

        const loadedProfiles = profData.profiles || [];
        const loadedAddresses = addrData.addresses || [];
        setProfiles(loadedProfiles);
        setAddresses(loadedAddresses);
        
        const availablePartners = partnerData.partners || [];
        setPartners(availablePartners);

        if (loadedProfiles.length > 0) {
          setSelectedProfileId(loadedProfiles[0].id);
        }
        if (loadedAddresses.length > 0) {
          const firstAddr = loadedAddresses[0];
          setSelectedAddressId(firstAddr.id);
          if (firstAddr.lat && firstAddr.lng) {
            setPatientCoords({
              lat: Number(firstAddr.lat),
              lng: Number(firstAddr.lng),
              name: `${firstAddr.address_line1}, ${firstAddr.city}`,
            });
          }
        }

        // Check if preselected doctor is available
        if (initialDoctorId) {
          const matched = availablePartners.find((p: any) => p.id === initialDoctorId);
          if (matched) {
            setSelectedPartnerId(matched.id);
          } else if (availablePartners.length > 0) {
            setSelectedPartnerId(availablePartners[0].id);
          }
        } else if (availablePartners.length > 0) {
          setSelectedPartnerId(availablePartners[0].id);
        }
      } catch (err) {
        console.error('Error loading booking data:', err);
      } finally {
        setIsInitialLoading(false);
      }
    }
    loadData();
  }, [initialDoctorId, initialServiceId, session, userId, userEmail]);

  const handleSelectAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const matched = addresses.find((a) => a.id === addrId);
    if (matched && matched.lat && matched.lng) {
      setPatientCoords({
        lat: Number(matched.lat),
        lng: Number(matched.lng),
        name: `${matched.address_line1}, ${matched.city}`,
      });
    }
  };

  const handleSaveInlineProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/patient/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fullName: newProfileName,
          relationship: newProfileRelation,
          age: parseInt(newProfileAge, 10) || 30,
          gender: newProfileGender,
          bloodGroup: newProfileBloodGroup,
          medicalNotes: newProfileNotes,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfiles((prev) => [data.profile, ...prev]);
        setSelectedProfileId(data.profile.id);
        setShowAddProfileModal(false);
        setNewProfileName('');
        setNewProfileNotes('');
      }
    } catch (err) {
      console.error('Failed to create inline profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveInlineAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLine1 || !newPincode) return;
    setSavingAddress(true);
    try {
      const res = await fetch('/api/patient/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          label: newAddressLabel,
          addressLine1: newAddressLine1,
          addressLine2: newAddressLine2,
          landmark: newLandmark,
          city: newCity,
          pincode: newPincode,
          lat: newLat,
          lng: newLng,
        }),
      });
      const data = await res.json();
      if (data.address) {
        setAddresses((prev) => [data.address, ...prev]);
        setSelectedAddressId(data.address.id);
        setPatientCoords({
          lat: Number(data.address.lat || newLat),
          lng: Number(data.address.lng || newLng),
          name: `${data.address.address_line1}, ${data.address.city}`,
        });
        setShowAddAddressModal(false);
        setNewAddressLine1('');
        setNewAddressLine2('');
      }
    } catch (err) {
      console.error('Failed to create inline address:', err);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDetectPatientGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        setPatientCoords({
          lat: latitude,
          lng: longitude,
          name: geo.displayName || 'Current Live GPS',
        });
        setDetectingLocation(false);
      },
      (err) => {
        console.error('GPS error:', err);
        setDetectingLocation(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0] || null;
  const matchedPartner = partners.find((p) => p.id === selectedPartnerId) || partners[0] || null;
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0] || null;
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0] || null;

  // If Doctor Consultation and doctor has custom consultation fee, use it
  const baseRate = (selectedService?.id === 'srv_doc' && matchedPartner?.consultation_fee)
    ? parseFloat(matchedPartner.consultation_fee)
    : parseFloat(selectedService?.base_price || '500');

  const visitingFee = parseFloat(selectedService?.visiting_fee || '0');
  const totalAmount = baseRate + visitingFee;
  const subtotal = Number((totalAmount / 1.18).toFixed(2));
  const tax = Number((totalAmount - subtotal).toFixed(2));

  const handleFinalCheckout = async () => {
    if (!selectedService) {
      alert('Please select a healthcare service first.');
      return;
    }
    if (!selectedProfile) {
      alert('Please select or add a family member patient profile.');
      return;
    }
    if (!selectedAddress) {
      alert('Please select or add a doorstep delivery address.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        patientProfileId: selectedProfile.id,
        patientName: selectedProfile.full_name,
        addressId: selectedAddress.id,
        addressText: `${selectedAddress.address_line1}, ${selectedAddress.city}${selectedAddress.pincode ? ` - ${selectedAddress.pincode}` : ''}`,
        totalAmount,
        scheduledDate,
        scheduledTimeSlot: scheduledSlot,
        clinicalInstructions: clinicalNotes,
        partnerId: matchedPartner?.id || null,
        partnerName: matchedPartner?.name || 'Assigned On-Duty Clinician',
        partnerTitle: matchedPartner?.specialization || 'Home Healthcare Specialist',
        partnerImg: matchedPartner?.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80',
      };

      const res = await fetch('/api/patient/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not create your appointment. Please try again.');
        return;
      }
      if (data.booking?.id) {
        router.push(`/patient/appointments/${data.booking.id}`);
      } else {
        router.push('/patient/appointments');
      }
    } catch (err) {
      console.error('Booking checkout error:', err);
      alert('Could not create your appointment. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const dateOptions = ['Today', 'Tomorrow', 'Day After Tomorrow'];
  const slotOptions = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '02:00 PM - 03:00 PM',
    '04:30 PM - 05:30 PM',
    '06:00 PM - 07:00 PM',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Wizard Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Doorstep Clinical Booking Wizard</span>
        </div>
        <h1 className="text-3xl font-black font-heading text-slate-900 tracking-tight">
          Schedule Verified Home Care
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Fast 5-step clinical booking backed by dynamic pricing & verified on-duty doctors.
        </p>
      </div>

      {/* Preselected Doctor Banner (if matched) */}
      {matchedPartner && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={matchedPartner.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&q=80'}
              alt={matchedPartner.name}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-teal-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-600 text-white">
                  {matchedPartner.speciality_name || 'Selected Doctor'}
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  {matchedPartner.council_reg_number || 'VERIFIED'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{matchedPartner.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-teal-800 font-semibold">{matchedPartner.specialization}</p>
                {matchedPartner.location_name && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    · <MapPin className="w-3 h-3 text-rose-500" /> {matchedPartner.location_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase font-bold text-slate-500">Consultation Fee</div>
            <div className="text-base font-black text-emerald-700">₹{baseRate}</div>
            {patientCoords && matchedPartner.latitude && matchedPartner.longitude && (
              <div className="text-[11px] font-bold text-teal-700">
                📍 {calculateDistanceKm(patientCoords.lat, patientCoords.lng, Number(matchedPartner.latitude), Number(matchedPartner.longitude))} km away
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        {[
          { step: 1, label: 'Service' },
          { step: 2, label: 'Patient' },
          { step: 3, label: 'Slot & Notes' },
          { step: 4, label: 'Clinician' },
          { step: 5, label: 'Payment' },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= s.step
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
            </div>
            <span
              className={`text-xs font-semibold hidden md:inline ${
                currentStep >= s.step ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
        {/* STEP 1: CHOOSE SERVICE */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                1. Select Required Healthcare Service
              </h2>
              <p className="text-xs text-slate-500">Live clinical catalog configured dynamically by Admin</p>
            </div>

            {isInitialLoading && services.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                      <div className="h-5 w-16 bg-slate-200 rounded" />
                    </div>
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between ${
                      selectedServiceId === srv.id
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-md">
                        {srv.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 font-heading mt-1">{srv.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{srv.description}</p>
                      <div className="pt-2 text-xs text-slate-400 flex items-center gap-2">
                        <span>⏱ {srv.duration_minutes || 45} mins</span>
                        <span>·</span>
                        <span className="font-bold text-teal-700">₹{srv.base_price} base rate</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black font-heading text-slate-900">
                        ₹{Number(srv.base_price) + Number(srv.visiting_fee || 0)}
                      </span>
                      <span className="block text-[10px] text-slate-400">Total</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PATIENT & ADDRESS */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                2. Select Patient & Residence Address
              </h2>
              <p className="text-xs text-slate-500">Choose who requires care and verify your doorstep GPS location</p>
            </div>

            {/* Live GPS Telemetry Bar */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-teal-900">
                <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                <div>
                  <span className="font-bold">Active Patient Coordinates: </span>
                  <span className="font-medium text-slate-700">{patientCoords?.name || 'Locating...'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectPatientGPS}
                disabled={detectingLocation}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-teal-100/70 border border-teal-300 text-teal-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0"
              >
                {detectingLocation ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                    <span>Locating GPS...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-3.5 h-3.5 text-teal-700" />
                    <span>Detect Live GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* Profile Selection (Dropdown + Action + Cards) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Family Patient Profile
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(true)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Family Member</span>
                </button>
              </div>

              {isInitialLoading && profiles.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-48 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : profiles.length > 0 ? (
                <>
                  {/* Patient Profile Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-all cursor-pointer"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.relationship || 'Dependent'} · Age: {p.age || 'N/A'} · Blood: {p.blood_group || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visual Card Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {profiles.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProfileId(p.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          selectedProfileId === p.id
                            ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm text-slate-900">{p.full_name}</div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                            {p.relationship || 'Self'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Age: {p.age || 'N/A'} · Gender: {p.gender || 'N/A'} · Blood: {p.blood_group || 'O+'}
                        </p>
                        {p.medical_notes && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 italic bg-slate-50 px-2 py-0.5 rounded">
                            Note: {p.medical_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                  <User className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Patient Family Profiles Found</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Add a profile for yourself or a family member to assign medical vitals and clinical history.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddProfileModal(true)}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                  >
                    + Add First Family Member
                  </button>
                </div>
              )}
            </div>

            {/* Address Selection (Dropdown + Action + Cards) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Doorstep Address
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(true)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-xl transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address / GPS</span>
                </button>
              </div>

              {isInitialLoading && addresses.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                      <div className="h-3 w-40 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : addresses.length > 0 ? (
                <>
                  {/* Address Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedAddressId}
                      onChange={(e) => handleSelectAddress(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-all cursor-pointer"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label || 'Home'} - {a.address_line1}, {a.city} ({a.pincode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Visual Address Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {addresses.map((a) => {
                      const isSelected = selectedAddressId === a.id;
                      return (
                        <div
                          key={a.id}
                          onClick={() => handleSelectAddress(a.id)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-rose-500" />
                              <span>{a.label || 'Home'}</span>
                            </div>
                            {a.is_default && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {a.address_line1}, {a.city} - {a.pincode}
                          </p>
                          {a.lat && a.lng && (
                            <p className="text-[10px] font-mono text-slate-400 mt-1">
                              GPS: {Number(a.lat).toFixed(4)}, {Number(a.lng).toFixed(4)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                  <MapPin className="w-8 h-8 text-rose-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Doorstep Addresses Saved</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Detect your live location or enter your residence address for clinician dispatch.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(true)}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                  >
                    + Add Doorstep Address / GPS
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: DATE & TIME SLOT */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                3. Choose Date & Time Slot
              </h2>
              <p className="text-xs text-slate-500">Select when you want the clinical visit scheduled</p>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Appointment Day
              </span>
              <div className="grid grid-cols-3 gap-3">
                {dateOptions.map((d) => (
                  <button
                    key={d}
                    onClick={() => setScheduledDate(d)}
                    className={`p-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${
                      scheduledDate === d
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Available Time Slot
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {slotOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setScheduledSlot(s)}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all flex items-center justify-between ${
                      scheduledSlot === s
                        ? 'border-teal-600 bg-teal-50 text-teal-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{s}</span>
                    {scheduledSlot === s && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Symptoms & Clinical Instructions (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Mention specific symptoms, patient mobility condition, or gate entry notes..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>
        )}

        {/* STEP 4: ASSIGNED PARTNER / DOCTOR SELECTION */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                4. Select Available Verified Healthcare Clinician
              </h2>
              <p className="text-xs text-slate-500">Real-time distance calculated from your doorstep GPS location</p>
            </div>

            {isInitialLoading && partners.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                      <div className="h-3 w-24 bg-slate-100 rounded" />
                      <div className="h-3 w-40 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : partners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partners.map((p) => {
                  const isSelected = (matchedPartner?.id === p.id);
                  const pLat = p.latitude ? Number(p.latitude) : null;
                  const pLng = p.longitude ? Number(p.longitude) : null;
                  const hasCoords = pLat !== null && pLng !== null && pLat !== 0 && pLng !== 0;
                  const distance = (patientCoords && hasCoords)
                    ? calculateDistanceKm(patientCoords.lat, patientCoords.lng, pLat!, pLng!)
                    : null;
                  const eta = distance !== null ? estimateTravelMinutes(distance) : null;
                  const serviceRadius = Number(p.service_radius_km || 10);
                  const isWithinRadius = distance === null || distance <= serviceRadius;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPartnerId(p.id)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/60 shadow-md ring-1 ring-teal-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <img
                        src={p.image || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80'}
                        alt={p.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-500/20 shrink-0"
                      />
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ {p.verification_status || 'VERIFIED'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-teal-700">{p.specialization}</p>

                        {/* Location and Distance Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                          <span className="flex items-center gap-1 text-slate-600 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{p.location_name || p.city || 'Assigned Clinic Area'}</span>
                          </span>
                          {distance !== null && (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                              isWithinRadius
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              📍 {distance} km away · ~{eta} mins
                            </span>
                          )}
                        </div>

                        {p.consultation_fee && (
                          <p className="text-xs font-bold text-slate-800">Fee: ₹{p.consultation_fee}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{p.rating || 5.0}</span>
                          <span className="text-slate-400 font-normal">({p.completed_visits || 0} visits)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-600 space-y-2">
                <UserCheck className="w-8 h-8 text-teal-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">Auto-Matching Active On-Duty Clinician</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Our dispatch algorithm will instantly match the nearest verified on-duty clinician upon payment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: UPI CHECKOUT & CONFIRMATION */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                5. Secure Payment & Instant Confirmation
              </h2>
              <p className="text-xs text-slate-500">Instant verification · 100% money-back guarantee</p>
            </div>

            {/* Order Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Booking Summary
              </h3>
              <div className="flex justify-between text-xs font-semibold text-slate-800">
                <span>{selectedService?.title || 'Selected Healthcare Service'}</span>
                <span>₹{baseRate.toFixed(2)}</span>
              </div>
              {matchedPartner && (
                <div className="flex justify-between text-xs text-teal-800 font-medium">
                  <span>Assigned Clinician</span>
                  <span>{matchedPartner.name} ({matchedPartner.location_name || matchedPartner.city || 'Verified Clinician'})</span>
                </div>
              )}
              {patientCoords && matchedPartner?.latitude && matchedPartner?.longitude && (
                <div className="flex justify-between text-xs text-emerald-800 font-bold bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
                  <span>Doorstep Travel Distance</span>
                  <span>
                    📍 {calculateDistanceKm(patientCoords.lat, patientCoords.lng, Number(matchedPartner.latitude), Number(matchedPartner.longitude))} km (ETA ~{estimateTravelMinutes(calculateDistanceKm(patientCoords.lat, patientCoords.lng, Number(matchedPartner.latitude), Number(matchedPartner.longitude)))} mins)
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500">
                <span>Visiting Convenience Fee</span>
                <span>₹{visitingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Applicable GST (18% included)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900 font-heading">
                <span>Total Amount to Pay</span>
                <span className="text-teal-700">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* UPI Payment Methods */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Payment Mode
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('UPI_INTENT')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'UPI_INTENT'
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>UPI Apps (GPay / PhonePe)</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('UPI_QR')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'UPI_QR'
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan UPI QR Code</span>
                </button>
              </div>

              {paymentMethod === 'UPI_QR' && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-2 text-center">
                  <div className="w-32 h-32 bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono text-[10px]">
                    [UPI QR CODE ₹{totalAmount}]
                  </div>
                  <p className="text-xs font-bold text-slate-700">Scan using any UPI App</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-700/20 transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinalCheckout}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-75"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirming with Doctor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pay ₹{totalAmount.toFixed(2)} & Book Visit</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* QUICK ADD FAMILY PROFILE MODAL */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-heading">Add Family Member</h3>
              <button
                type="button"
                onClick={() => setShowAddProfileModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInlineProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="E.g., Meenakshi K."
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Relationship</label>
                  <select
                    value={newProfileRelation}
                    onChange={(e) => setNewProfileRelation(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold bg-white focus:outline-none"
                  >
                    <option value="Self">Self</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Dependent">Dependent</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Age</label>
                  <input
                    type="number"
                    value={newProfileAge}
                    onChange={(e) => setNewProfileAge(e.target.value)}
                    placeholder="30"
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Gender</label>
                  <select
                    value={newProfileGender}
                    onChange={(e) => setNewProfileGender(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold bg-white focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Blood Group</label>
                  <select
                    value={newProfileBloodGroup}
                    onChange={(e) => setNewProfileBloodGroup(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold bg-white focus:outline-none"
                  >
                    <option value="O+ Positive">O+ Positive</option>
                    <option value="A+ Positive">A+ Positive</option>
                    <option value="B+ Positive">B+ Positive</option>
                    <option value="AB+ Positive">AB+ Positive</option>
                    <option value="O- Negative">O- Negative</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Clinical Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newProfileNotes}
                  onChange={(e) => setNewProfileNotes(e.target.value)}
                  placeholder="E.g., Hypertension, Diabetics, allergy..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-75 transition-all"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save & Select</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD DOORSTEP ADDRESS MODAL (WITH LIVE GPS & AUTOCOMPLETE) */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-heading">Add Doorstep Address</h3>
              <button
                type="button"
                onClick={() => setShowAddAddressModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInlineAddress} className="space-y-4 text-xs">
              {/* Location Picker (Live GPS & Autocomplete) */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-2">
                <span className="font-bold text-teal-900 uppercase tracking-wider block text-[11px]">
                  1. Auto-Detect / Search Locality (GPS)
                </span>
                <LocationPicker
                  initialLocationName={newAddressLine2 || newAddressLine1}
                  initialCity={newCity}
                  initialLat={newLat || undefined}
                  initialLng={newLng || undefined}
                  onLocationSelect={(loc: { locationName: string; city: string; lat: number; lng: number; fullAddress?: string }) => {
                    setNewAddressLine2(loc.locationName);
                    setNewCity(loc.city || '');
                    setNewLat(loc.lat);
                    setNewLng(loc.lng);
                    if (!newAddressLine1) setNewAddressLine1(loc.locationName);
                  }}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Address Label</label>
                <input
                  type="text"
                  required
                  value={newAddressLabel}
                  onChange={(e) => setNewAddressLabel(e.target.value)}
                  placeholder="E.g., Home, Parents Residence, Office"
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Door / Flat / Street (Address Line 1)</label>
                <input
                  type="text"
                  required
                  value={newAddressLine1}
                  onChange={(e) => setNewAddressLine1(e.target.value)}
                  placeholder="E.g., Flat 204, Rose Villa, 8th Main"
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Locality / Area</label>
                  <input
                    type="text"
                    value={newAddressLine2}
                    onChange={(e) => setNewAddressLine2(e.target.value)}
                    placeholder="E.g., Indiranagar"
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    placeholder="560038"
                    className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="flex-1 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-75 transition-all"
                >
                  {savingAddress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Location...</span>
                    </>
                  ) : (
                    <span>Save & Use Location</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
