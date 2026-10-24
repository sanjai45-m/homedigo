'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowDownToLine, ArrowUpRight, Check, CheckCircle2, Copy, FileImage, Info, Landmark, Loader2, QrCode, Smartphone, UploadCloud, Wallet, X } from 'lucide-react';
import { DEMO_UPI_ID, MAX_RECEIPT_BYTES, upiPaymentLink } from '@/lib/payment';
import type { PaymentSettings } from '@/lib/payment-settings';
import styles from './PaymentCheckout.module.css';

export default function PaymentCheckout({ amount, reference, receipt, onReceipt, onMethod, beforeOpen, paymentBlockedReason = '' }: {
  amount: number;
  reference: string;
  receipt: string;
  onReceipt: (value: string) => void;
  onMethod: (value: 'GPAY' | 'PHONEPE' | 'UPI') => void;
  beforeOpen: () => boolean;
  paymentBlockedReason?: string;
}) {
  const [config, setConfig] = useState<PaymentSettings | null>(null);
  const [configError, setConfigError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [shownQr, setShownQr] = useState('');
  const qrCanvas = useRef<HTMLCanvasElement>(null);
  const qrValue = config && config.upiId !== DEMO_UPI_ID && amount >= 0.01 && reference
    ? upiPaymentLink('UPI', config.upiId, config.payeeName, amount, reference) : '';

  function showQr() {
    if (paymentBlockedReason || !qrValue || !beforeOpen()) return;
    onMethod('UPI');
    setShownQr(qrValue);
    setMessage('Scan the QR or download it and select it from your payment app’s gallery scanner. Check the recipient and amount before paying.');
  }

  function downloadQr() {
    if (paymentBlockedReason || !qrValue || shownQr !== qrValue || !qrCanvas.current || !beforeOpen()) return;
    try {
      const link = document.createElement('a');
      link.href = qrCanvas.current.toDataURL('image/png');
      link.download = `homedigo-payment-${amount.toFixed(2)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      onMethod('UPI');
    } catch {
      setMessage('The QR could not be downloaded. Scan it from another device or take a screenshot.');
    }
  }
  async function loadConfig(signal?: AbortSignal) {
    setConfigError('');
    try {
      const response = await fetch('/api/patient/payment', { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment details are unavailable.');
      if (!signal?.aborted) setConfig(data);
    } catch {
      if (signal?.aborted) return;
      setConfig(null);
      setConfigError('Payment details could not be loaded. Please retry before paying.');
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void loadConfig(controller.signal); });
    return () => controller.abort();
  }, []);

  function openApp(app: 'GPAY' | 'PHONEPE' | 'UPI') {
    if (paymentBlockedReason || !config || !beforeOpen()) return;
    if (!config.upiId) { setMessage('Direct app payments are not configured. Contact the clinic or use the manual payment details below.'); return; }
    const label = app === 'GPAY' ? 'Google Pay' : app === 'PHONEPE' ? 'PhonePe' : 'your UPI app';
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!mobile) { setMessage(`Open this booking on your phone to launch ${label}. Desktop browsers cannot open the payment app on a separate phone.`); return; }
    const paymentUrl = upiPaymentLink(app, config.upiId, config.payeeName, amount, reference, /Android/i.test(navigator.userAgent));
    if (!paymentUrl) { setMessage('Check the configured UPI ID and appointment amount before paying.'); return; }
    onMethod(app);
    setMessage(config.upiId === DEMO_UPI_ID ? `Opening ${label} with a demo recipient. No real payment can be made with this demo ID.`
      : `Opening ${label} with ${config.upiId} and ₹${amount.toFixed(2)}. If the app does not open, make sure it is installed and try your phone’s browser. Return here after payment to upload the receipt.`);
    // Navigate directly in the tap handler so browsers retain user activation.
    window.location.href = paymentUrl;
  }

  async function copyNumber() {
    if (paymentBlockedReason || !config || !beforeOpen()) return;
    try { await navigator.clipboard.writeText(config.phone); setMessage('Phone number copied for manual payment.'); }
    catch { setMessage(`Copy this number manually: ${config.phone}`); }
  }

  async function copyUpiId() {
    if (paymentBlockedReason || !config?.upiId || config.upiId === DEMO_UPI_ID || !beforeOpen()) return;
    try { await navigator.clipboard.writeText(config.upiId); setMessage('UPI ID copied. Open your payment app, paste the ID and check the recipient before paying.'); }
    catch { setMessage(`Copy this UPI ID manually: ${config.upiId}`); }
  }

  async function upload(file?: File) {
    onReceipt('');
    setError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_RECEIPT_BYTES || file.size === 0) {
      setError('Choose a PNG, JPEG or WebP screenshot up to 2 MB.');
      return;
    }
    setReading(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read this screenshot.'));
        reader.readAsDataURL(file);
      });
      onReceipt(data);
    } catch { setError('Could not read this screenshot. Please select it again.'); }
    finally { setReading(false); }
  }

  const qrVisible = Boolean(qrValue && !paymentBlockedReason && shownQr === qrValue);
  return <div className={styles.checkout}>
    <section className={styles.paymentCard} aria-labelledby="payment-heading">
      <header className={styles.sectionHeader}>
        <div className={styles.headingGroup}><span className={styles.step}>01</span><div><p className={styles.eyebrow}>ONE STEP CLOSER TO CARE</p><h3 id="payment-heading">Make your payment</h3></div></div>
        <span className={styles.upiBadge}><Wallet size={14} aria-hidden="true" />UPI payment</span>
      </header>
      <div className={styles.amountBanner}>
        <div><p>Appointment total</p><div className={styles.amount}><span>₹</span>{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small>INR</small></div><span className={styles.amountCaption}>Pay the amount shown for your visit</span></div>
        <div className={styles.recipient}><span className={styles.recipientIcon}><Landmark size={20} aria-hidden="true" /></span><div><span>PAYING TO</span><strong>{config?.payeeName || 'Loading recipient…'}</strong>{config && <p>{config.phone}</p>}</div></div>
      </div>
      {paymentBlockedReason && <p role="status" className={styles.warning}><Info size={17} /> <span>{paymentBlockedReason} You can upload an existing payment receipt below.</span></p>}
      {configError ? <div role="alert" className={styles.warning}><Info size={18} /><div><p>{configError}</p><button type="button" onClick={() => void loadConfig()}>Retry loading payment details <ArrowUpRight size={15} /></button></div></div>
        : !config && <p role="status" className={styles.loading}><Loader2 size={18} className={styles.spin} />Loading payment details…</p>}
      {config && <>
        {config.upiId === DEMO_UPI_ID && <p role="status" className={styles.warning}><Info size={18} /><span><strong>Demo payment link.</strong> This dummy UPI ID cannot receive payments. The clinic must replace it with a real linked UPI ID before collecting payments.</span></p>}
        <fieldset disabled={Boolean(paymentBlockedReason)} className={styles.methods}>
          <legend className="sr-only">Choose how to pay</legend>
          {qrValue && <div className={styles.qrPanel}>
            <div className={styles.methodHeading}><span className={styles.methodIcon}><QrCode size={19} /></span><div><h4>Scan &amp; pay</h4><p>Use any UPI app</p></div><span className={styles.optionTag}>QR</span></div>
            <div className={styles.qrFrame}>
              {qrVisible ? <QRCodeCanvas ref={qrCanvas} value={qrValue} size={256} marginSize={4} level="M" bgColor="#ffffff" fgColor="#000000" role="img" aria-label={'Payment QR for ' + config.payeeName + ', ₹' + amount.toFixed(2)} style={{ width: '100%', maxWidth: 224, height: 'auto' }} />
                : <div className={styles.qrPlaceholder}><span className={styles.qrSymbol}><QrCode size={54} strokeWidth={1.2} aria-hidden="true" /></span><p>Your payment QR</p><span>Recipient &amp; amount included</span><button type="button" onClick={showQr} disabled={Boolean(paymentBlockedReason)} className={styles.showQr}>Show payment QR <ArrowUpRight size={16} /></button></div>}
            </div>
            {qrVisible ? <><button type="button" onClick={downloadQr} className={styles.download}><ArrowDownToLine size={16} />Download QR</button><p className={styles.qrHint}>On this phone? Save the QR and choose it from your UPI app’s gallery scanner.</p></> : <p className={styles.qrHint}>Scan from another phone, or save the QR to pay on this device.</p>}
          </div>}
          <div className={styles.appPanel}>
            <div className={styles.methodHeading}><span className={styles.methodIcon}><Smartphone size={19} /></span><div><h4>{config.upiId ? 'Pay with an app' : 'Pay manually'}</h4><p>{config.upiId ? 'Continue on your phone' : 'Use the recipient number below'}</p></div></div>
            {config.upiId && <div className={styles.appButtons}>
              <button type="button" onClick={() => openApp('GPAY')} className={styles.appButton}><span className={styles.gpayMark} aria-hidden="true"><b>G</b><span>Pay</span></span><span className={styles.appText}><strong>Open Google Pay</strong><small>Pay from your bank account</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>
              <button type="button" onClick={() => openApp('PHONEPE')} className={styles.appButton}><span className={styles.phonepeMark} aria-hidden="true">पे</span><span className={styles.appText}><strong>Open PhonePe</strong><small>Continue in PhonePe</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>
              <button type="button" onClick={() => openApp('UPI')} className={styles.appButton}><span className={styles.otherMark}><Wallet size={22} aria-hidden="true" /></span><span className={styles.appText}><strong>Other UPI app</strong><small>Choose an app on your phone</small></span><ArrowUpRight size={17} aria-hidden="true" /></button>
            </div>}
            <div className={styles.manualDetails}>
              <div className={styles.manualTitle}><span />OR PAY MANUALLY<span /></div>
              {config.upiId && <div className={styles.copyRow}><div><span>UPI ID</span><strong>{config.upiId}</strong></div><button type="button" onClick={() => void copyUpiId()} disabled={config.upiId === DEMO_UPI_ID} aria-label="Copy UPI ID"><Copy size={16} /></button></div>}
              <div className={styles.copyRow}><div><span>PHONE NUMBER</span><strong>{config.phone}</strong></div><button type="button" onClick={() => void copyNumber()} aria-label="Copy number for manual payment"><Copy size={16} /><span>Copy number</span></button></div>
            </div>
          </div>
        </fieldset>
        {message && <p role="status" className={styles.message}><Info size={16} /><span>{message}</span></p>}
        <div className={styles.paymentNote}><Info size={16} aria-hidden="true" /><p>Check the recipient and amount in your UPI app. Payment is confirmed after your receipt is reviewed. Bank and app limits apply.</p></div>
      </>}
    </section>
    <section className={styles.receiptCard} aria-labelledby="receipt-heading">
      <header className={styles.sectionHeader}><div className={styles.headingGroup}><span className={styles.step}>02</span><div><p className={styles.eyebrow}>AFTER YOU HAVE PAID</p><h3 id="receipt-heading">Add your payment receipt</h3></div></div>{receipt && <span className={styles.attached}><Check size={14} />Attached</span>}</header>
      <div className={styles.receiptBody}>
        <p className={styles.receiptIntro}>Upload the payment screenshot so your clinician can verify it before accepting your appointment.</p>
        <label htmlFor="payment-receipt" className={styles.uploadZone}>
          <input id="payment-receipt" aria-label="Upload payment receipt" type="file" accept="image/png,image/jpeg,image/webp" disabled={reading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} className={styles.fileInput} />
          <span className={styles.uploadIcon}>{reading ? <Loader2 size={23} className={styles.spin} /> : <UploadCloud size={23} />}</span><strong>{reading ? 'Reading screenshot…' : receipt ? 'Choose a different receipt' : 'Choose your payment screenshot'}</strong><span>PNG, JPEG or WebP · Up to 2 MB</span><span className={styles.browseLabel}>{receipt ? 'Replace receipt' : 'Browse files'} <ArrowUpRight size={14} /></span>
        </label>
        <div className={styles.receiptChecklist}><span><CheckCircle2 size={13} />Recipient</span><span><CheckCircle2 size={13} />Amount</span><span><CheckCircle2 size={13} />Date &amp; transaction ID</span></div>
        <p className={styles.checklistHint}>Make sure these details are visible in your screenshot.</p>
        {reading && <p role="status" className={styles.loading}>Reading screenshot…</p>}
        {error && <p role="alert" className={styles.warning}>{error}</p>}
        {receipt && <div className={styles.receiptPreview}><div className={styles.previewHeader}><span><FileImage size={17} />Receipt attached <small>Ready for review</small></span><button type="button" onClick={() => { onReceipt(''); setError(''); }} aria-label="Remove payment receipt"><X size={17} /></button></div>{/* Local uploaded image; preserve its original pixels for payment review. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receipt} alt="Selected payment receipt" />
        </div>}
      </div>
    </section>
  </div>;
}
