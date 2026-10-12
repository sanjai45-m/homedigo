'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
import CheckoutSignIn from '@/components/auth/CheckoutSignIn';
import PaymentCheckout from '@/components/PaymentCheckout';
import { appointmentDate, appointmentStart } from '@/lib/appointment-time';

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
  const { data: session, status: sessionStatus } = useSession();
  const initialServiceId = searchParams.get('service') || '';
  const initialDoctorId = searchParams.get('doctor') || '';

  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  const isPatient = sessionStatus === 'authenticated' && sessionUser?.role === 'PATIENT' && Boolean(sessionUser.id);
  const userId = isPatient ? sessionUser!.id! : '';
  const userEmail = session?.user?.email || '';
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [authRevision, setAuthRevision] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);
  const authRequired = !isPatient || needsSignIn;
  const lastPatientId = useRef('');
  const restoredDraft = useRef(false);
  const requestSignIn = () => {
    setShowSignIn(true);
    setCheckoutError('Sign in below to continue. Your booking and receipt have been kept.');
  };

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [addressError, setAddressError] = useState('');

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
  const [paymentMethod, setPaymentMethod] = useState<'GPAY' | 'PHONEPE' | 'UPI'>('UPI');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [requestKey, setRequestKey] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  useEffect(() => {
    if (showSignIn && authRequired) document.getElementById('booking-sign-in')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [showSignIn, authRequired, currentStep]);
  const draftKey = 'homedigo-payment-draft-' + userId;
  useEffect(() => { setRequestKey(crypto.randomUUID()); }, []);
  const savePaymentDraft = () => {
    setCheckoutError('');
    if (authRequired) { requestSignIn(); return false; }
    if (isInitialLoading || detailsError || !selectedProfile || !selectedAddress || (selectedServiceId === 'srv_doc' && !matchedPartner)) {
      setCheckoutError('Select your patient, address and doctor before paying.');
      return false;
    }
    let date: string;
    try {
      date = appointmentDate(scheduledDate);
      if (Date.parse(appointmentStart(date, scheduledSlot)) <= Date.now()) throw new Error('Past appointment');
    } catch {
      setCheckoutError('Please go back and choose a future appointment time before paying.');
      return false;
    }
    setScheduledDate(date);
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ selectedServiceId, selectedProfileId, selectedAddressId,
        selectedPartnerId, scheduledDate: date, scheduledSlot, clinicalNotes, requestKey, savedAt: Date.now() }));
    } catch { /* Booking remains in memory if session storage is unavailable. */ }
    return true;
  };

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
    if (sessionStatus === 'loading') return;
    let active = true;
    if (userId && lastPatientId.current && lastPatientId.current !== userId) {
      setPaymentReceipt(''); setPaymentRef(''); setClinicalNotes(''); setRequestKey(crypto.randomUUID());
      setSelectedProfileId(''); setSelectedAddressId('');
    }
    if (userId) lastPatientId.current = userId;
    async function loadData() {
      try {
        setIsInitialLoading(true);
        setDetailsError('');
        const [srvRes, profRes, addrRes, partnerRes] = await Promise.all([
          fetch('/api/services'),
          userId ? fetch('/api/patient/profiles') : Promise.resolve({ ok: true, status: 200, json: async () => ({ profiles: [] }) }),
          userId ? fetch('/api/patient/addresses') : Promise.resolve({ ok: true, status: 200, json: async () => ({ addresses: [] }) }),
          fetch('/api/doctors'),
        ]);
        const srvData = await srvRes.json();
        const profData = await profRes.json();
        const addrData = await addrRes.json();
        const partnerData = await partnerRes.json();
        if (!active) return;
        if ([profRes, addrRes].some(response => response.status === 401 || response.status === 403)) {
          setNeedsSignIn(true); setShowSignIn(true);
          throw new Error('Please sign in as a patient again to load your saved patient details.');
        }
        if (![srvRes, profRes, addrRes, partnerRes].every(response => response.ok)) {
          throw new Error('Your booking details could not be loaded. Retry to load your saved patient profile and address.');
        }

        const loadedServices = srvData.services || [];
        setServices(loadedServices);
        if (loadedServices.length > 0) {
          if (initialServiceId && loadedServices.some((s: any) => s.id === initialServiceId)) {
            setSelectedServiceId(current => current || initialServiceId);
          } else {
            setSelectedServiceId(current => current || loadedServices[0].id);
          }
        }

        const loadedProfiles = (profData.profiles || []).filter((profile: any) => profile.user_id === userId);
        const loadedAddresses = (addrData.addresses || []).filter((address: any) => address.user_id === userId);
        setProfiles(loadedProfiles);
        setAddresses(loadedAddresses);
        
        const availablePartners = partnerData.doctors || [];
        setPartners(availablePartners);

        if (loadedProfiles.length > 0) {
          setSelectedProfileId(current => loadedProfiles.some((profile: any) => profile.id === current) ? current : loadedProfiles[0].id);
        }
        if (loadedAddresses.length > 0) {
          const firstAddr = loadedAddresses[0];
          setSelectedAddressId(current => loadedAddresses.some((address: any) => address.id === current) ? current : firstAddr.id);
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
            setSelectedPartnerId(current => current || matched.id);
          } else {
            // Keep the requested doctor; never silently book a different person.
            setSelectedPartnerId(current => current || initialDoctorId);
          }
        } else if (availablePartners.length > 0) {
          setSelectedPartnerId(current => current || availablePartners[0].id);
        }
        try {
          const draft = !restoredDraft.current && userId ? JSON.parse(sessionStorage.getItem(draftKey) || 'null') : null;
          if (draft && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
            setSelectedServiceId(draft.selectedServiceId); setSelectedProfileId(draft.selectedProfileId);
            setSelectedAddressId(draft.selectedAddressId); setSelectedPartnerId(draft.selectedPartnerId);
            setScheduledDate(draft.scheduledDate); setScheduledSlot(draft.scheduledSlot);
            setClinicalNotes(draft.clinicalNotes); setRequestKey(draft.requestKey); setCurrentStep(5);
          }
        } catch { /* Ignore an expired or unreadable draft. */ }
        restoredDraft.current = true;
      } catch (err) {
        if (active) setDetailsError(err instanceof Error ? err.message : 'Your booking details could not be loaded. Please retry.');
      } finally {
        if (active) setIsInitialLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [initialDoctorId, initialServiceId, sessionStatus, userId, authRevision]);

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
    if (authRequired) { setShowAddProfileModal(false); requestSignIn(); return; }
    if (!newProfileName) return;
    setSavingProfile(true);
    setProfileError('');
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
      if (res.status === 401 || res.status === 403) { setNeedsSignIn(true); setShowAddProfileModal(false); requestSignIn(); return; }
      if (!res.ok || !data.profile) throw new Error(data.error || 'Could not save the patient profile. Please retry.');
      if (data.profile) {
        setCheckoutError('');
        setProfiles((prev) => [data.profile, ...prev]);
        setSelectedProfileId(data.profile.id);
        setShowAddProfileModal(false);
        setNewProfileName('');
        setNewProfileNotes('');
      }
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save the patient profile. Please retry.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveInlineAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authRequired) { setShowAddAddressModal(false); requestSignIn(); return; }
    if (!newAddressLine1 || !newPincode) return;
    setSavingAddress(true);
    setAddressError('');
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
      if (res.status === 401 || res.status === 403) { setNeedsSignIn(true); setShowAddAddressModal(false); requestSignIn(); return; }
      if (!res.ok || !data.address) throw new Error(data.error || 'Could not save the visit address. Please retry.');
      if (data.address) {
        setCheckoutError('');
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
      setAddressError(err instanceof Error ? err.message : 'Could not save the visit address. Please retry.');
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
  const matchedPartner = partners.find((p) => p.id === selectedPartnerId) || null;
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;
  const paymentBlockedReason = isInitialLoading ? 'Loading your booking details.' : detailsError
    || (!selectedProfile || !selectedAddress ? 'Select or add your patient profile and visit address before paying.' : '')
    || (!selectedService ? 'Choose a service before paying.' : '')
    || (selectedServiceId === 'srv_doc' && !matchedPartner ? 'Choose an available doctor before paying.' : '');

  const continueBooking = () => {
    setCheckoutError('');
    const navigationError = isInitialLoading ? 'Loading your booking details.' : detailsError
      || (!selectedProfile || !selectedAddress ? 'Select or add your patient profile and visit address before continuing.' : '')
      || (currentStep === 4 ? paymentBlockedReason : '');
    if (!authRequired && currentStep >= 2 && navigationError) {
      setCheckoutError(navigationError);
      if (!isInitialLoading && !detailsError && (!selectedProfile || !selectedAddress)) setCurrentStep(2);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5) as 1 | 2 | 3 | 4 | 5);
  };

  // If Doctor Consultation and doctor has custom consultation fee, use it
  const baseRate = (selectedService?.id === 'srv_doc' && matchedPartner?.consultation_fee != null)
    ? parseFloat(matchedPartner.consultation_fee)
    : parseFloat(selectedService?.base_price || '500');

  const visitingFee = parseFloat(selectedService?.visiting_fee || '0');
  const totalAmount = baseRate + visitingFee;
  const subtotal = Number((totalAmount / 1.18).toFixed(2));
  const tax = Number((totalAmount - subtotal).toFixed(2));

  const handleFinalCheckout = async () => {
    if (loading) return;
    setCheckoutError('');
    if (authRequired) { requestSignIn(); return; }
    if (paymentBlockedReason) { setCheckoutError(paymentBlockedReason); return; }
    if (!paymentReceipt) { setCheckoutError('Upload your successful payment receipt before submitting.'); return; }
    if (!selectedService) {
      alert('Please select a healthcare service first.');
      return;
    }
    if (selectedService.id === 'srv_doc' && !matchedPartner) {
      alert('Please choose an available doctor before confirming your appointment.');
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
        paymentReceipt, paymentMethod, paymentRef, requestKey,
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
      if (res.status === 401) {
        setNeedsSignIn(true); requestSignIn(); return;
      }
      if (!res.ok) {
        setCheckoutError(data.error || 'Could not submit your request. Please retry; do not pay again.');
        return;
      }
      try { sessionStorage.removeItem(draftKey); } catch {}
      if (data.booking?.id) {
        router.push(`/patient/appointments/${data.booking.id}`);
      } else {
        router.push('/patient/appointments');
      }
    } catch (err) {
      console.error('Booking checkout error:', err);
      setCheckoutError('Could not submit your request. Check your connection and retry with the same receipt; do not pay again.');
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

      {!isInitialLoading && initialDoctorId && !matchedPartner && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your selected doctor is no longer listed. Please choose another doctor in the clinician step before confirming your visit.
        </div>
      )}

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
        {authRequired && (currentStep === 2 || currentStep === 5 || showSignIn) && <div id="booking-sign-in" className="scroll-mt-24">
          {sessionStatus === 'loading' ? <p role="status">Checking your account…</p> : <CheckoutSignIn onSignedIn={() => {
            setNeedsSignIn(false); setShowSignIn(false); setCheckoutError(''); setAuthRevision(value => value + 1);
          }} />}
        </div>}
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
                  <span className="font-bold">Location preview: </span>
                  <span className="font-medium text-slate-700">{patientCoords?.name || 'No location selected'}</span>
                  <p className="mt-1 text-slate-600">Save a visit address below. Detecting GPS alone does not save an address.</p>
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
                  onClick={() => authRequired ? requestSignIn() : setShowAddProfileModal(true)}
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
                    onClick={() => authRequired ? requestSignIn() : setShowAddProfileModal(true)}
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
                  onClick={() => authRequired ? requestSignIn() : setShowAddAddressModal(true)}
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
                    onClick={() => authRequired ? requestSignIn() : setShowAddAddressModal(true)}
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
                5. Payment & Receipt Upload
              </h2>
              <p className="text-xs text-slate-500">Your doctor verifies payment before confirming your appointment.</p>
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

            {!authRequired && <>
              {!isInitialLoading && !detailsError && (!selectedProfile || !selectedAddress) && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <p>Select or add your patient profile and visit address before paying.</p>
                <button type="button" onClick={() => setCurrentStep(2)} className="mt-2 font-bold underline">Choose patient & address</button>
                <div className="mt-3 flex flex-wrap gap-3">
                  {!selectedProfile && <button type="button" onClick={() => { setProfileError(''); setShowAddProfileModal(true); }} className="rounded-lg border border-amber-300 px-3 py-2 font-bold">Add patient profile</button>}
                  {!selectedAddress && <button type="button" onClick={() => { setAddressError(''); setShowAddAddressModal(true); }} className="rounded-lg border border-amber-300 px-3 py-2 font-bold">Add visit address</button>}
                </div>
              </div>}
              <PaymentCheckout amount={totalAmount} reference={requestKey} receipt={paymentReceipt}
                onReceipt={setPaymentReceipt} onMethod={setPaymentMethod} beforeOpen={savePaymentDraft} paymentBlockedReason={paymentBlockedReason} />
            </>}
            <label className="block text-sm font-semibold text-slate-700">
              UPI transaction ID (optional)
              <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} maxLength={64} className="mt-2 block w-full rounded-xl border border-slate-200 p-3" placeholder="Transaction ID from your receipt" />
            </label>
            {!authRequired && <p className="text-xs text-slate-500">Booking confirmation will be emailed to {userEmail} after the doctor accepts your request.</p>}

          </div>
        )}

        {/* Bottom Navigation Actions */}
        {detailsError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>{detailsError}</p>
          <button type="button" disabled={isInitialLoading} onClick={() => setAuthRevision(value => value + 1)} className="mt-2 font-bold underline">Retry loading booking details</button>
        </div>}
        {checkoutError && <p role="alert" className="text-sm text-red-700">{checkoutError}</p>}
        {currentStep === 5 && !authRequired && !paymentBlockedReason && !paymentReceipt && <p className="text-sm text-slate-600">Upload your payment receipt to enable appointment submission.</p>}
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
              onClick={continueBooking}
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-700/20 transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinalCheckout}
              disabled={loading || sessionStatus === 'loading' || (!authRequired && (Boolean(paymentBlockedReason) || !paymentReceipt || !requestKey))}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting for Review...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{authRequired ? 'Sign in to continue' : 'Submit Receipt & Request Appointment'}</span>
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
              {profileError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{profileError}</p>}
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
              {addressError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{addressError}</p>}
              {/* Location Picker (Live GPS & Autocomplete) */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-2">
                <span className="font-bold text-teal-900 uppercase tracking-wider block text-[11px]">
                  1. Auto-Detect / Search Locality (GPS)
                </span>
                <LocationPicker
                  onLocationClear={() => { setNewLat(null); setNewLng(null); }}
                  initialLocationName={newAddressLine2 || newAddressLine1}
                  initialCity={newCity}
                  initialLat={newLat ?? undefined}
                  initialLng={newLng ?? undefined}
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
