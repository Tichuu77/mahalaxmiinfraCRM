import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

// Ensure autotable plugin is attached to jsPDF
try {
  if (typeof applyPlugin === 'function') {
    applyPlugin(jsPDF);
  } else if (typeof autoTable?.applyPlugin === 'function') {
    autoTable.applyPlugin(jsPDF);
  } else if (typeof autoTable?.default?.applyPlugin === 'function') {
    autoTable.default.applyPlugin(jsPDF);
  }
} catch (e) {
  // Ignore if already registered
}

/**
 * Converts numbers to Indian Currency Words format
 * e.g., 300000 -> "Three Lakh Rupees Only"
 */
function numberToIndianWords(amount) {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
             'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanThousand(n) {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  let n = Math.floor(Math.abs(amount));
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder) + ' ';

  return (result.trim() || 'Zero') + ' Rupees Only';
}

function formatINR(val) {
  return 'Rs. ' + Number(val || 0).toLocaleString('en-IN');
}

/**
 * Generates an official Mahalaxmi Infra Payout Bill PDF.
 * Formatted with corporate header, project details, advisor chain table, and authorized sign-off.
 */
export function generateMahalaxmiBillPDF({ payout, booking, project, plot, customer, seller, recipient, allIncentives }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [35, 69, 61];     // Brand Forest Green #23453D
  const goldColor = [201, 134, 43];      // Brand Gold #C9862B
  const slateColor = [71, 85, 105];     // Slate 600 #475569
  const lightBg = [248, 250, 252];       // Slate 50
  const borderGrey = [226, 232, 240];    // Slate 200

  // Outer Page Framing Border
  doc.setDrawColor(218, 225, 231);
  doc.setLineWidth(0.4);
  doc.roundedRect(10, 10, 190, 277, 2, 2, 'S');

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(10, 10, 190, 32, 'F');

  // Gold Accent Stripe
  doc.setFillColor(...goldColor);
  doc.rect(10, 42, 190, 2, 'F');

  // Brand Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('MAHALAXMI GROUP', 16, 21);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...goldColor);
  doc.text('A TRADITION OF TRUST - ISO 9001:2015 CERTIFIED', 16, 27);

  doc.setTextColor(225, 236, 231);
  doc.setFontSize(7.5);
  doc.text('Real Estate Developers & Plot Infrastructure - Corporate Office, Indore (M.P.)', 16, 33);

  // Bill Metadata (Right side of banner)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`VOUCHER NO: ${payout.billNumber || 'MI-BILL'}`, 194, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Issue Date: ${new Date(payout.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 194, 26, { align: 'right' });

  // Status Badge
  const statusStr = (payout.status || 'pending').toUpperCase();
  if (statusStr === 'PAID') {
    doc.setFillColor(16, 185, 129); // emerald 500
  } else if (statusStr === 'APPROVED') {
    doc.setFillColor(...goldColor);
  } else {
    doc.setFillColor(100, 116, 139); // slate 500
  }
  doc.roundedRect(156, 30, 38, 6.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`STATUS: ${statusStr}`, 175, 34.5, { align: 'center' });

  // ----------------------------------------------------
  // Section 1: Side-by-Side Information Cards
  // ----------------------------------------------------
  const cardY = 48;
  const cardH = 34;
  const colWidth = 92;

  // Left Card: Property & Booking Specifications
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, cardY, colWidth, cardH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('PROJECT & PLOT SPECIFICATIONS', 16, cardY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateColor);
  doc.text('Project Name:', 16, cardY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${project?.name || 'Mahalaxmi Project'} (${project?.code || 'N/A'})`, 42, cardY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Location:', 16, cardY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${project?.location || 'Indore, M.P.'}`, 42, cardY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Plot Number:', 16, cardY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${plot?.plotNumber || 'N/A'}`, 42, cardY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Plot Area:', 16, cardY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${(plot?.sizeSqFt || 0).toLocaleString('en-IN')} SQ. FT.`, 42, cardY + 27);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Total Plot Value:', 16, cardY + 32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`${formatINR(booking?.totalPlotValue || 0)}`, 42, cardY + 32);

  // Right Card: Customer & Sale Details
  const rightColX = 106;
  doc.setFillColor(...lightBg);
  doc.roundedRect(rightColX, cardY, colWidth, cardH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('CUSTOMER & TRANSACTION DETAILS', rightColX + 4, cardY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateColor);
  doc.text('Customer Name:', rightColX + 4, cardY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${customer?.name || 'N/A'}`, rightColX + 32, cardY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Customer Phone:', rightColX + 4, cardY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${customer?.phone || 'N/A'}`, rightColX + 32, cardY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Direct Seller:', rightColX + 4, cardY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${seller?.name || 'N/A'}`, rightColX + 32, cardY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Payment Mode:', rightColX + 4, cardY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${payout.paymentMode || 'Bank Transfer (NEFT/RTGS)'}`, rightColX + 32, cardY + 27);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Txn / Ref No:', rightColX + 4, cardY + 32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${payout.transactionReference || 'N/A'}`, rightColX + 32, cardY + 32);

  // ----------------------------------------------------
  // Section 2: Beneficiary & Payout Summary Card
  // ----------------------------------------------------
  const benY = cardY + cardH + 4;
  const benH = 26;

  // Background box with soft brand tint
  doc.setFillColor(242, 248, 246);
  doc.setDrawColor(180, 208, 198);
  doc.roundedRect(12, benY, 186, benH, 1.5, 1.5, 'FD');

  // Left side: Beneficiary Advisor Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('PAYOUT BENEFICIARY / ADVISOR', 16, benY + 6);

  const cleanRecipientName = recipient?.name || 'Advisor';
  const roleTitle = recipient?.roleId?.name || (cleanRecipientName.toLowerCase().includes('admin') ? 'Administrator' : 'Advisor');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateColor);
  doc.text('Advisor Name:', 16, benY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cleanRecipientName, 38, benY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Designation:', 16, benY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(roleTitle, 38, benY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateColor);
  doc.text('Contact:', 16, benY + 22);
  doc.setTextColor(15, 23, 42);
  doc.text(`${recipient?.phone || 'N/A'} | ${recipient?.email || ''}`, 38, benY + 22);

  // Right side: Net Payable Badge & Words
  const amountBoxX = 118;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(201, 134, 43); // gold border
  doc.setLineWidth(0.5);
  doc.roundedRect(amountBoxX, benY + 3, 76, benH - 6, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...goldColor);
  doc.text('NET PAYABLE COMMISSION', amountBoxX + 38, benY + 8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text(formatINR(payout.amount), amountBoxX + 38, benY + 15, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateColor);
  const words = numberToIndianWords(payout.amount);
  doc.text(words, amountBoxX + 38, benY + 19.5, { align: 'center', maxWidth: 72 });

  // ----------------------------------------------------
  // Section 3: Incentive Distribution Table
  // ----------------------------------------------------
  let tableStartY = benY + benH + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('INCENTIVE DISTRIBUTION & UPLINE CHAIN BREAKDOWN', 12, tableStartY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateColor);
  doc.text('Detailed hierarchy calculations and override allocations for this booking transaction', 12, tableStartY + 3.8);

  const tableData = (allIncentives || []).map((inc, index) => {
    const isSeller = inc.basis === 'seller';
    const rateText = `Rs. ${inc.ratePerSqFt || 0}/sq.ft.`;
    const shareText = formatINR(inc.amount);
    return [
      String(index + 1),
      inc.recipientId?.name || 'Advisor',
      inc.roleId?.name || 'Advisor',
      isSeller ? 'Direct Seller' : 'Upline Override',
      `${(inc.plotSizeSqFt || 0).toLocaleString('en-IN')} sq.ft.`,
      rateText,
      shareText,
      (inc.status || 'approved').toUpperCase(),
    ];
  });

  const fallbackData = [
    [
      '1',
      cleanRecipientName,
      roleTitle,
      'Direct Payout',
      `${(plot?.sizeSqFt || 0).toLocaleString('en-IN')} sq.ft.`,
      `Rs. ${Math.round((payout.amount || 0) / (plot?.sizeSqFt || 1))}/sq.ft.`,
      formatINR(payout.amount),
      (payout.status || 'approved').toUpperCase(),
    ]
  ];

  const runAutoTable = (docInstance, options) => {
    if (typeof docInstance.autoTable === 'function') {
      return docInstance.autoTable(options);
    }
    const fn = (typeof autoTable === 'function' ? autoTable : autoTable?.default) 
      || (typeof autoTable?.default?.default === 'function' ? autoTable.default.default : null);
    if (typeof fn === 'function') {
      return fn(docInstance, options);
    }
    throw new Error('AutoTable function could not be loaded');
  };

  runAutoTable(doc, {
    startY: tableStartY + 5.5,
    margin: { left: 12, right: 12 },
    head: [['#', 'Advisor Name', 'Designation', 'Basis / Allocation', 'Plot Area', 'Rate', 'Total Share', 'Status']],
    body: tableData.length > 0 ? tableData : fallbackData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 40 },
      2: { cellWidth: 26 },
      3: { cellWidth: 28 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
      7: { halign: 'center', cellWidth: 16 },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // ----------------------------------------------------
  // Section 4: Sign-off & Verification Section
  // ----------------------------------------------------
  let afterTableY = (doc.lastAutoTable?.finalY || tableStartY + 45) + 6;

  // Remarks / Compliance Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, afterTableY, 186, 12, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...primaryColor);
  doc.text('REMARKS / AUDIT NOTE:', 15, afterTableY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...slateColor);
  const noteText = payout.remarks
    ? `Remark: ${payout.remarks} | Verified against booking #${booking?.bookingNumber || 'N/A'}.`
    : 'System Verified: Disbursed towards plot sales incentive under Mahalaxmi Group CRM rules. All statutory deductions if applicable have been accounted for.';
  doc.text(noteText, 15, afterTableY + 8.5, { maxWidth: 180 });

  // 3-Column Official Signature Blocks
  const sigY = afterTableY + 22;

  // Prepared By
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(16, sigY, 62, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Prepared By', 39, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateColor);
  doc.text('CRM Billing Desk', 39, sigY + 8, { align: 'center' });

  // Checked & Verified By
  doc.line(82, sigY, 128, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Checked & Verified By', 105, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateColor);
  doc.text('Accounts & Finance Manager', 105, sigY + 8, { align: 'center' });

  // Authorized Signatory with Stamp Box
  doc.line(148, sigY, 192, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Authorized Signatory', 170, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateColor);
  doc.text('Mahalaxmi Group (Head Office)', 170, sigY + 8, { align: 'center' });

  // Optional Stamp Box outline
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(153, sigY - 14, 34, 12, 1, 1, 'S');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(160, 174, 192);
  doc.text('[ Company Seal / Stamp ]', 170, sigY - 7, { align: 'center' });
  doc.setLineDashPattern([], 0); // reset line dash

  // ----------------------------------------------------
  // Section 5: Document Footer & Computer Generated Notice
  // ----------------------------------------------------
  doc.setDrawColor(218, 225, 231);
  doc.line(12, 276, 198, 276);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(140, 155, 170);
  doc.text('This is an authentic computer-generated official payout voucher issued by Mahalaxmi Group CRM.', 105, 280, { align: 'center' });
  doc.text('Registered Office: Mahalaxmi Commercial Tower, Indore (M.P.) - Contact: billing@mahalaxmigroup.com', 105, 284, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
