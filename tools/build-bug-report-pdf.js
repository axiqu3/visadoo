const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function createReport() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawPageHeader = (page, title) => {
    page.drawText('Visa Doo — Quality & Security Audit Report', { x: 50, y: 750, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawLine({ start: { x: 50, y: 742 }, end: { x: 550, y: 742 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(title, { x: 50, y: 715, size: 18, font: boldFont, color: rgb(0.1, 0.3, 0.6) });
  };

  const drawPageFooter = (page, pageNum, totalPages) => {
    page.drawLine({ start: { x: 50, y: 55 }, end: { x: 550, y: 55 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    page.drawText(`Page ${pageNum} of ${totalPages}`, { x: 500, y: 40, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
    page.drawText(`Confidential — Internal Use Only`, { x: 50, y: 40, size: 8, font, color: rgb(0.6, 0.6, 0.6) });
  };

  // ================= PAGE 1: COVER & EXECUTIVE SUMMARY =================
  const page1 = pdfDoc.addPage([600, 800]);
  
  // Title
  page1.drawText('VISA DOO AUDIT REPORT', { x: 50, y: 600, size: 28, font: boldFont, color: rgb(0.1, 0.3, 0.6) });
  page1.drawText('Security, Quality, and Stability Pass', { x: 50, y: 565, size: 14, font, color: rgb(0.4, 0.4, 0.4) });
  
  page1.drawLine({ start: { x: 50, y: 545 }, end: { x: 550, y: 545 }, thickness: 2, color: rgb(0.1, 0.3, 0.6) });
  
  // Metadata
  page1.drawText('Project Name:', { x: 50, y: 510, size: 10, font: boldFont });
  page1.drawText('Visa Doo', { x: 150, y: 510, size: 10, font });
  
  page1.drawText('Audit Date:', { x: 50, y: 490, size: 10, font: boldFont });
  page1.drawText('28 August 2026', { x: 150, y: 490, size: 10, font });
  
  page1.drawText('Final Audit Result:', { x: 50, y: 470, size: 10, font: boldFont });
  page1.drawText('PASSED (Wizard and back-button issues resolved)', { x: 150, y: 470, size: 10, font });

  // Executive Summary
  page1.drawText('Executive Summary', { x: 50, y: 420, size: 14, font: boldFont, color: rgb(0.1, 0.3, 0.6) });
  const summaryLines = [
    'A comprehensive, project-wide security, quality, stability, and performance pass was',
    'performed on the Visa Doo application code. The audit evaluated frontend forms (wizards),',
    'date validation rules, back-office helpers, PDF form generators, serverless functions,',
    'and API route consistency.',
    '',
    'All confirmed bugs have been successfully resolved in the codebase during this pass,',
    'significantly improving the reliability of the application submit and wizard navigation flows.',
    'No critical or high-severity active bugs remain. Remaining features that rely on external',
    'APIs and environments are documented for verification upon live credentials deployment.'
  ];
  let y = 395;
  summaryLines.forEach(line => {
    page1.drawText(line, { x: 50, y, size: 10, font, lineHeight: 14 });
    y -= 15;
  });

  // Severity Stats
  page1.drawText('Severity Summary', { x: 50, y: 220, size: 14, font: boldFont, color: rgb(0.1, 0.3, 0.6) });
  page1.drawText('Total Confirmed Bugs: 2 (0 Active, 2 Resolved)', { x: 50, y: 195, size: 10, font });
  
  page1.drawText('CRITICAL:', { x: 50, y: 170, size: 10, font: boldFont, color: rgb(0.8, 0.1, 0.1) });
  page1.drawText('0 Active (1 Resolved: Ireland Wizard Step Lockout)', { x: 150, y: 170, size: 10, font });
  
  page1.drawText('HIGH:', { x: 50, y: 150, size: 10, font: boldFont, color: rgb(0.8, 0.4, 0.1) });
  page1.drawText('0 Active', { x: 150, y: 150, size: 10, font });
  
  page1.drawText('MEDIUM:', { x: 50, y: 130, size: 10, font: boldFont, color: rgb(0.6, 0.6, 0.1) });
  page1.drawText('0 Active (1 Resolved: Date Validation Section Misalignment)', { x: 150, y: 130, size: 10, font });
  
  page1.drawText('LOW:', { x: 50, y: 110, size: 10, font: boldFont, color: rgb(0.1, 0.5, 0.1) });
  page1.drawText('0 Active', { x: 150, y: 110, size: 10, font });

  drawPageFooter(page1, 1, 3);

  // ================= PAGE 2: CONFIRMED BUGS (RESOLVED) =================
  const page2 = pdfDoc.addPage([600, 800]);
  drawPageHeader(page2, 'Confirmed Bugs (Resolved)');

  y = 660;
  const drawBug = (id, title, severity, file, desc, fix) => {
    page2.drawText(`BUG ID: ${id}`, { x: 50, y, size: 9, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
    y -= 13;
    page2.drawText(`TITLE: ${title}`, { x: 50, y, size: 11, font: boldFont });
    y -= 13;
    page2.drawText(`SEVERITY: ${severity}`, { x: 50, y, size: 9, font: boldFont, color: severity === 'CRITICAL' ? rgb(0.8, 0.1, 0.1) : rgb(0.6, 0.6, 0.1) });
    y -= 13;
    page2.drawText(`AFFECTED FILE: ${file}`, { x: 50, y, size: 9, font });
    y -= 15;
    
    page2.drawText('PROBLEM:', { x: 50, y, size: 9, font: boldFont });
    y -= 13;
    desc.forEach(line => {
      page2.drawText(line, { x: 50, y, size: 9, font });
      y -= 12;
    });
    y -= 3;
    page2.drawText('RESOLUTION:', { x: 50, y, size: 9, font: boldFont, color: rgb(0.1, 0.5, 0.1) });
    y -= 13;
    fix.forEach(line => {
      page2.drawText(line, { x: 50, y, size: 9, font });
      y -= 12;
    });
    y -= 25; // spacer
  };

  drawBug(
    'BUG-001',
    'Ireland Visa Wizard Step Lockout',
    'CRITICAL',
    'application.js',
    [
      'The step validation and navigation functions were hardcoded to limit step counts to 5.',
      'Because Ireland has a 6-step form, the final declaration section was unreachable and',
      'never validated, causing browser validation on the hidden checkbox to silently block submit.'
    ],
    [
      'Updated showDenmarkSection and validateAllDenmarkSections to dynamically count sections',
      'in the DOM using document.querySelectorAll(\'.denmark-sec\').length, enabling full navigation.'
    ]
  );

  drawBug(
    'BUG-002',
    'Date Validation Section Misalignment',
    'MEDIUM',
    'application.js',
    [
      'Date checks for travel dates and passport validity were hardcoded to sections 3 and 2.',
      'For countries like Azerbaijan (where travel dates are in section 2), this caused validation',
      'errors to focus and scroll the user to the wrong, empty section.'
    ],
    [
      'Updated validateDenmarkSection to query the date inputs\' closest(\'.denmark-sec\') container',
      'dynamically, ensuring validation feedback only triggers on the step where the field is visible.'
    ]
  );

  drawPageFooter(page2, 2, 3);

  // ================= PAGE 3: POSSIBLE ISSUES / NEEDS TESTING =================
  const page3 = pdfDoc.addPage([600, 800]);
  drawPageHeader(page3, 'Possible Issues / External Testing');

  y = 660;
  const drawIssue = (id, title, desc) => {
    page3.drawText(`ISSUE ID: ${id}`, { x: 50, y, size: 9, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
    y -= 13;
    page3.drawText(`TITLE: ${title}`, { x: 50, y, size: 11, font: boldFont });
    y -= 15;
    page3.drawText('DESCRIPTION / REQUIRED TESTING:', { x: 50, y, size: 9, font: boldFont });
    y -= 13;
    desc.forEach(line => {
      page3.drawText(line, { x: 50, y, size: 9, font });
      y -= 12;
    });
    y -= 25;
  };

  drawIssue(
    'ISSUE-001',
    'Brevo Email Notifications Delivery',
    [
      'Verification of actual email delivery (sign-in magic links and status notifications)',
      'requires live Brevo API keys (stored in Supabase secrets) and a verified authenticated',
      'visadoo.com domain. Testing must be verified on the production database.'
    ]
  );

  drawIssue(
    'ISSUE-002',
    'WhatsApp OTP & Telinfy Integration',
    [
      'WhatsApp OTP sending and verification is currently disabled in the configuration',
      'pending approval of the Meta message templates. Once templates are approved and',
      'live credentials are input, the otp flow needs verification.'
    ]
  );

  drawIssue(
    'ISSUE-003',
    'Gemini & OpenAI Chat Integrations',
    [
      'The AI chat helpers fallback to static responses if the Gemini or OpenAI API keys',
      'are missing or invalid in the process environment. Live API response quality',
      'must be audited once keys are populated.'
    ]
  );

  drawPageFooter(page3, 3, 3);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('VISA_DOO_BUG_REPORT.pdf', pdfBytes);
  console.log('PDF report generated: VISA_DOO_BUG_REPORT.pdf');
}

createReport().catch(err => {
  console.error('Failed to create PDF report:', err);
  process.exit(1);
});
