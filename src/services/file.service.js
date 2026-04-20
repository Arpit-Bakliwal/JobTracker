const { Readable } = require("stream");
const csvParser = require('csv-parser');
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { format } = require('fast-csv');
const prisma = require('../config/database');
const { HTTP_STATUS, VALID_JOB_STATUS, MESSAGES } = require('../constants');

// CSV Export
const exportJobsToCSV = async (userId) => {
    const jobs = await prisma.job.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            company: true,
            location: true,
            jobUrl: true,
            status: true,
            salary: true,
            notes: true,
            appliedAt: true,
            createdAt: true,
        },
    });

    // Transform Data for CSV
    const csvData = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location || '',
        jobUrl: job.jobUrl || '',
        status: job.status,
        salary: job.salary || '',
        notes: job.notes || '',
        appliedAt: job.appliedAt.toISOString().split('T')[0], // YYYY-MM-DD
        createdAt: job.createdAt.toISOString().split('T')[0],
    }));

    return csvData;
};

// CSV Import
const importJobsFromCSV = async (fileBuffer, userId) => {
    const results = [];
    const errors = [];
    const skipped = [];

    // Convert buffer to readable stream
    const stream = Readable.from(fileBuffer.toString());

    await new Promise((resolve, reject) => {
        stream
            .pipe(csvParser())
            .on('data', (row) => {
                // Validate Required Field
                if(!row.title || !row.company){
                    errors.push({
                        row,
                        error: 'title and company are required'
                    });

                    return;
                }

                // Validate status
                const status = row.status?.toUpperCase();

                results.push({
                    title: row.title.trim(),
                    company: row.company.trim(),
                    location: row.location?.trim() || null,
                    jobUrl: row.jobUrl?.trim() || null,
                    status: Object.values(VALID_JOB_STATUS).includes(status) ? status : 'APPLIED',
                    salary: row.salary?.trim() || null,
                    notes: row.notes?.trim() || null,
                    appliedAt: row.appliedAt ? new Date(row.appliedAt) : new Date(),
                    userId,
                });
            })
            .on('error', reject)
            .on('end', resolve)
    });

    if(results.length === 0 && errors.length > 0){
        const error = new Error(MESSAGES.FILE_UPLOAD.NO_VALID_ROW_IN_CSV);
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error; 
    }

    // Fetch Existing jobs for this user
    const existingJobs = await prisma.job.findMany({
        where: { userId },
        select: { title: true, company: true }
    });

    // Build a set for fast lookup
    const existingJobSet = new Set(existingJobs.map((j) => `${j.title.toLowerCase()}:${j.company.toLowerCase()}`));

    // filter out duplicates
    const newJobs = [];
    results.forEach((job) => {
        const key = `${job.title.toLowerCase()}:${job.company.toLowerCase()}`;
        if(existingJobSet.has(key)){
            skipped.push({ title: job.title, company: job.company });
        } else {
            newJobs.push(job);
            // Add to set immediately — handles duplicates within same CSV
            existingSet.add(key);
        }
    });

    if(newJobs.length === 0){
        return {
            imported: 0,
            skipped: skipped.length,
            failed: errors.length,
            message: 'All jobs already exist',
        };
    }

    // Bulk insert valid rows
    const created = await prisma.job.createMany({
        data: newJobs,
        skipDuplicates: true,
    });

    return {
        imported: created.count,
        skipped: skipped.length,
        failed: errors.length,
        errors: errors.length ? errors : undefined
    };
};

// Excel Export
const exportJobsToExcel = async (userId) => {
  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Job Tracker App';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Job Applications', {
    pageSetup: { fitToPage: true },
  });

  // Fields to exclude from export
  const excludeFields = ['userId', 'id'];

  // Fields that need date formatting
  const dateFields = ['appliedAt', 'createdAt', 'updatedAt'];

  //   Transform Jobs Data
  const jobData = jobs.map((job) => {
    const row = {};
    Object.keys(job).forEach((key) => {
      if (excludeFields.includes(key)) return;
      if (dateFields.includes(key) && job[key]) {
        row[key] = job[key].toISOString().split('T')[0];
      } else {
        row[key] = job[key] ?? '';
      }
    });
    return row;
  });

  // Generate column dynamically from first row keys
  if (jobData.length === 0) {
    worksheet.addRow(['No jobs found']);
    return workbook;
  }

  // Auto generate columns from data keys
  const columns = Object.keys(jobData[0]).map((key) => ({
    header: formatHeader(key), // convert camelCase to Title Case
    key,
    width: calculateWidth(key), // dynamic width based on key
  }));

  worksheet.columns = columns;

  // Style header row
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }, // blue background
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Status color mapping
  const statusColors = {
    APPLIED: 'FFD97706',    // amber
    SCREENING: 'FF7C3AED',  // purple
    INTERVIEW: 'FF2563EB',  // blue
    OFFER: 'FF16A34A',      // green
    REJECTED: 'FFDC2626',   // red
    WITHDRAWN: 'FF6B7280',  // gray
  };

  // Add data rows
  jobs.forEach((job, index) => {
    const row = worksheet.addRow({
      title: job.title,
      company: job.company,
      location: job.location || '',
      status: job.status,
      salary: job.salary || '',
      jobUrl: job.jobUrl || '',
      notes: job.notes || '',
      appliedAt: job.appliedAt.toISOString().split('T')[0],
      createdAt: job.createdAt.toISOString().split('T')[0],
    });

    // Alternate row colors
    const rowColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowColor },
      };
      cell.alignment = { vertical: 'middle' };
    });

    // Color status cell
    const statusCell = row.getCell('status');
    statusCell.font = {
      bold: true,
      color: { argb: statusColors[job.status] || 'FF000000' },
    };
  });

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Summary');

  // Count jobs by status
  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});

  summarySheet.columns = [
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Count', key: 'count', width: 10 },
  ];

  // Style summary header
  summarySheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    cell.alignment = { horizontal: 'center' };
  });

  // Add status counts
  Object.entries(statusCounts).forEach(([status, count]) => {
    summarySheet.addRow({ status, count });
  });

  // Add total row
  summarySheet.addRow({ status: 'TOTAL', count: jobs.length });
  const totalRow = summarySheet.lastRow;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin' },
    };
  });

  return workbook;
};

// Helper — convert camelCase to Title Case
const formatHeader = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1') // insert space before capitals
    .replace(/^./, (str) => str.toUpperCase()) // capitalize first letter
    .trim();
};

// Helper — calculate column width based on key name
const calculateWidth = (key) => {
  const widthMap = {
    title: 30,
    company: 25,
    location: 20,
    status: 15,
    salary: 15,
    jobUrl: 40,
    notes: 40,
    appliedAt: 15,
    createdAt: 15,
    updatedAt: 15,
  };
  return widthMap[key] || 20; // default width 20
};

const generateJobPDF = async (userId, userName) => {
  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });



  let stats = {
    total: jobs.length,
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0,
  };

  stats = jobs.reduce((acc, job) => {
    const key = job.status.toLowerCase();
    if(acc[key] !== undefined){
      acc[key]++;
    }
    return acc;
  }, stats );

  // Success rate
  const successRate = stats.total > 0
    ? Math.round((stats.offer / stats.total) * 100)
    : 0;

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
  });

  // ─── HEADER ───────────────────────────────────
  // Blue header background
  doc.rect(0, 0, doc.page.width, 120).fill('#2563EB');

  // Title
  doc
    .fillColor('#FFFFFF')
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('Job Search Report', 50, 35);

  // Subtitle
  doc
    .fontSize(12)
    .font('Helvetica')
    .text(`Generated for: ${userName}`, 50, 72);

  doc
    .text(
      `Generated on: ${new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
      50,
      90
    );

  // ─── SUMMARY STATS ────────────────────────────
  doc.moveDown(4);

  doc
    .fillColor('#1E293B')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Summary', 50, 145);

  // Horizontal line
  doc
    .moveTo(50, 165)
    .lineTo(doc.page.width - 50, 165)
    .strokeColor('#E2E8F0')
    .lineWidth(1)
    .stroke();

  // Stats grid — 3 columns
  const statsData = [
    { label: 'Total Applications', value: stats.total, color: '#2563EB' },
    { label: 'Interviews', value: stats.interview, color: '#7C3AED' },
    { label: 'Offers', value: stats.offer, color: '#16A34A' },
    { label: 'Applied', value: stats.applied, color: '#D97706' },
    { label: 'Rejected', value: stats.rejected, color: '#DC2626' },
    { label: 'Success Rate', value: `${successRate}%`, color: '#0891B2' },
  ];

  const statBoxWidth = 160;
  const statBoxHeight = 70;
  const statStartY = 180;
  const statStartX = 50;

  statsData.forEach((stat, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = statStartX + col * (statBoxWidth + 15);
    const y = statStartY + row * (statBoxHeight + 10);

    // Stat box background
    doc
      .roundedRect(x, y, statBoxWidth, statBoxHeight, 8)
      .fillAndStroke('#F8FAFC', '#E2E8F0');

    // Stat value
    doc
      .fillColor(stat.color)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(stat.value.toString(), x + 15, y + 12);

    // Stat label
    doc
      .fillColor('#64748B')
      .fontSize(10)
      .font('Helvetica')
      .text(stat.label, x + 15, y + 46);
  });

  // ─── JOB TABLE ────────────────────────────────
  const tableStartY = statStartY + 2 * (statBoxHeight + 10) + 30;

  doc
    .fillColor('#1E293B')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Job Applications', 50, tableStartY);

  doc
    .moveTo(50, tableStartY + 20)
    .lineTo(doc.page.width - 50, tableStartY + 20)
    .strokeColor('#E2E8F0')
    .lineWidth(1)
    .stroke();

  // Table headers
  const tableHeaders = ['Title', 'Company', 'Status', 'Applied Date'];
  const colWidths = [180, 150, 100, 100];
  const colStartX = [50, 230, 380, 480];
  const headerY = tableStartY + 30;

  // Header background
  doc
    .rect(50, headerY - 5, doc.page.width - 100, 25)
    .fill('#F1F5F9');

  tableHeaders.forEach((header, i) => {
    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(header, colStartX[i], headerY, {
        width: colWidths[i],
      });
  });

  // Table rows
  const statusColors = {
    APPLIED: '#D97706',
    SCREENING: '#7C3AED',
    INTERVIEW: '#2563EB',
    OFFER: '#16A34A',
    REJECTED: '#DC2626',
    WITHDRAWN: '#6B7280',
  };

  let currentY = headerY + 25;

  jobs.forEach((job, index) => {
    // Add new page if needed
    if (currentY > doc.page.height - 100) {
      doc.addPage();
      currentY = 50;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc
        .rect(50, currentY - 3, doc.page.width - 100, 22)
        .fill('#F8FAFC');
    }

    // Job title
    doc
      .fillColor('#1E293B')
      .fontSize(9)
      .font('Helvetica')
      .text(
        job.title.length > 25 ? job.title.substring(0, 25) + '...' : job.title,
        colStartX[0],
        currentY,
        { width: colWidths[0] }
      );

    // Company
    doc
      .fillColor('#475569')
      .text(
        job.company.length > 20 ? job.company.substring(0, 20) + '...' : job.company,
        colStartX[1],
        currentY,
        { width: colWidths[1] }
      );

    // Status with color
    doc
      .fillColor(statusColors[job.status] || '#000000')
      .font('Helvetica-Bold')
      .text(job.status, colStartX[2], currentY, { width: colWidths[2] });

    // Applied date
    doc
      .fillColor('#475569')
      .font('Helvetica')
      .text(
        job.appliedAt.toISOString().split('T')[0],
        colStartX[3],
        currentY,
        { width: colWidths[3] }
      );

    currentY += 22;

    // Row separator
    doc
      .moveTo(50, currentY - 3)
      .lineTo(doc.page.width - 50, currentY - 3)
      .strokeColor('#F1F5F9')
      .lineWidth(0.5)
      .stroke();
  });

  // ─── FOOTER ───────────────────────────────────
  doc
    .fillColor('#94A3B8')
    .fontSize(8)
    .font('Helvetica')
    .text(
      'Generated by Job Tracker App',
      50,
      doc.page.height - 40,
      { align: 'center' }
    );

  doc.end();
  return doc;

};

module.exports = {
  exportJobsToCSV,
  importJobsFromCSV,
  exportJobsToExcel,
  generateJobPDF,
};
