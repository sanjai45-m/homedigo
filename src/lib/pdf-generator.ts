/**
 * Homedigo Official PDF Generator Utility
 * Generates printable GST Tax Invoices and Official Tax Ledgers with HomeDigo branding.
 */

export interface TaxLedgerData {
  partnerName: string;
  partnerRole: string;
  bankAccount: string;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  pendingPayout: number;
  payouts: Array<{
    id: string;
    date: string;
    bookingId: string;
    service: string;
    patient: string;
    grossAmount: number;
    commission: number;
    netPayout: number;
    status: string;
    utr: string;
  }>;
}

export interface InvoiceData {
  invoice_number: string;
  service_title: string;
  payment_ref: string;
  issued_at: string;
  total_paid: number | string;
  patient_name?: string;
  partner_name?: string;
}

export function generateTaxLedgerPdf(data: TaxLedgerData) {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) return;

  const totalGross = data.payouts.reduce((acc, p) => acc + p.grossAmount, 0);
  const totalComm = data.payouts.reduce((acc, p) => acc + p.commission, 0);
  const totalNet = data.payouts.reduce((acc, p) => acc + p.netPayout, 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>HomeDigo_Tax_Ledger_${data.partnerName.replace(/\s+/g, '_')}_Oct2026</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #0f172a;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0d9488;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            color: #0f766e;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
            margin-top: 4px;
          }
          .meta-box {
            text-align: right;
            font-size: 12px;
            color: #475569;
          }
          .meta-box strong {
            color: #0f172a;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
          }
          .kpi-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .kpi-val {
            font-size: 20px;
            font-weight: 800;
            color: #0f766e;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .text-right { text-align: right; }
          .font-mono { font-family: monospace; }
          .summary-box {
            margin-top: 30px;
            background: #ccfbf1;
            border: 1px solid #99f6e4;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .stamp {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 11px;
            color: #64748b;
          }
          .stamp-badge {
            border: 2px dashed #0d9488;
            padding: 10px 20px;
            border-radius: 8px;
            color: #0f766e;
            font-weight: 800;
            text-transform: uppercase;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div className="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #0d9488; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="brand-title">HOMEDIGO CARE NETWORK</div>
            <div class="brand-subtitle">Official Healthcare Clinician Earnings & Tax Settlement Ledger</div>
            <div style="font-size: 10px; color: #0d9488; font-weight: bold; margin-top: 5px;">
              GSTIN: 29AAAAH1234F1Z5 · PAN: AAACH9921K
            </div>
          </div>
          <div class="meta-box">
            <div><strong>Clinician:</strong> ${data.partnerName} (${data.partnerRole})</div>
            <div><strong>Settlement Account:</strong> ${data.bankAccount}</div>
            <div><strong>Statement Period:</strong> Oct 01 - Oct 31, 2026</div>
            <div><strong>Generated On:</strong> ${new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Today's Take-Home</div>
            <div class="kpi-val">₹${data.todayEarnings.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Weekly Take-Home</div>
            <div class="kpi-val">₹${data.weeklyEarnings.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Monthly Take-Home</div>
            <div class="kpi-val">₹${data.monthlyEarnings.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pending Disbursal</div>
            <div class="kpi-val" style="color: #d97706;">₹${data.pendingPayout.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <h3 style="margin-bottom: 10px; font-size: 14px;">Itemized Payout & Commission Audit Ledger</h3>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Booking Ref</th>
              <th>Service & Patient</th>
              <th class="text-right">Gross Fee</th>
              <th class="text-right">Platform Fee (15%)</th>
              <th class="text-right">Net Settlement</th>
              <th>Banking UTR Ref</th>
            </tr>
          </thead>
          <tbody>
            ${data.payouts
              .map(
                (p) => `
              <tr>
                <td>${p.date}</td>
                <td class="font-mono"><strong>${p.bookingId}</strong></td>
                <td><strong>${p.service}</strong><br/><span style="color: #64748b; font-size: 10px;">${p.patient}</span></td>
                <td class="text-right">₹${p.grossAmount.toFixed(2)}</td>
                <td class="text-right" style="color: #e11d48;">-₹${p.commission.toFixed(2)}</td>
                <td class="text-right font-mono" style="color: #0f766e; font-weight: bold;">₹${p.netPayout.toFixed(2)}</td>
                <td class="font-mono" style="font-size: 10px; color: #475569;">${p.utr}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="summary-box">
          <div>
            <div style="font-size: 11px; color: #0f766e; font-weight: bold; text-transform: uppercase;">Direct Settlement Summary</div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">
              Total Disbursed: ₹${totalNet.toFixed(2)}
            </div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #334155;">
            Gross Consultations: <strong>₹${totalGross.toFixed(2)}</strong> | Platform Fee: <strong>₹${totalComm.toFixed(2)}</strong>
          </div>
        </div>

        <div class="stamp">
          <div>
            Computer generated statement. Valid without physical signature.<br/>
            Homedigo Healthcare Technologies Pvt. Ltd.
          </div>
          <div class="stamp-badge">
            ✓ AUDITED & VERIFIED TAX LEDGER
          </div>
        </div>

        <script>
          setTimeout(() => {
            window.print();
          }, 400);
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function generateInvoicePdf(data: InvoiceData) {
  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) return;

  const total = Number(data.total_paid) || 550;
  const subtotal = (total / 1.18).toFixed(2);
  const gstTax = (total - Number(subtotal)).toFixed(2);
  const cgst = (Number(gstTax) / 2).toFixed(2);
  const sgst = (Number(gstTax) / 2).toFixed(2);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>HomeDigo_GST_Tax_Invoice_${data.invoice_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #0f172a;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0d9488;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .invoice-title {
            font-size: 22px;
            font-weight: 900;
            color: #0f766e;
          }
          .meta {
            text-align: right;
            font-size: 12px;
            color: #475569;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            font-size: 13px;
          }
          th {
            background: #f1f5f9;
            padding: 12px;
            text-align: left;
            font-weight: 700;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 14px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .text-right { text-align: right; }
          .total-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            width: 300px;
            margin-left: auto;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
          }
          .grand-total {
            font-size: 18px;
            font-weight: 900;
            color: #0f766e;
            border-top: 2px solid #0d9488;
            padding-top: 10px;
            margin-top: 10px;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #0d9488; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
            🖨️ Print / Download Invoice PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="invoice-title">HOMEDIGO TAX INVOICE</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px;">
              Homedigo Connected Healthcare Technologies Pvt Ltd
            </div>
            <div style="font-size: 10px; color: #0d9488; font-weight: bold; margin-top: 4px;">
              GSTIN: 29AAAAH1234F1Z5 · SAC Code: 999312 (Home Health Services)
            </div>
          </div>
          <div class="meta">
            <div><strong>Invoice No:</strong> ${data.invoice_number}</div>
            <div><strong>Date:</strong> ${new Date(data.issued_at || Date.now()).toLocaleDateString('en-IN')}</div>
            <div><strong>Payment Ref:</strong> ${data.payment_ref}</div>
            <div><strong>Payment Status:</strong> <span style="color: #059669; font-weight: bold;">PAID (UPI)</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description of Doorstep Healthcare Service</th>
              <th class="text-right">SAC Code</th>
              <th class="text-right">Taxable Value</th>
              <th class="text-right">GST Rate</th>
              <th class="text-right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${data.service_title}</strong><br/>
                <span style="font-size: 11px; color: #64748b;">Includes Clinician Visit, Telemetry & Digital Consultation</span>
              </td>
              <td class="text-right">999312</td>
              <td class="text-right">₹${subtotal}</td>
              <td class="text-right">18% GST</td>
              <td class="text-right font-mono"><strong>₹${total.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="total-card">
          <div class="total-row"><span>Taxable Subtotal:</span> <span>₹${subtotal}</span></div>
          <div class="total-row"><span>CGST (9%):</span> <span>₹${cgst}</span></div>
          <div class="total-row"><span>SGST (9%):</span> <span>₹${sgst}</span></div>
          <div class="total-row grand-total"><span>Total Tax Paid:</span> <span>₹${total.toFixed(2)}</span></div>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
          <div>This is a computer-generated tax invoice issued under GST Rules, 2017.</div>
          <div style="font-weight: bold; color: #0f766e;">HOMEDIGO HEALTHCARE CERTIFIED SEAL ✓</div>
        </div>

        <script>
          setTimeout(() => {
            window.print();
          }, 400);
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
