const { Readable } = require("stream");
const csvParser = require('csv-parser');
const ExcelJS = require("exceljs");
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
                    status: VALID_JOB_STATUS.includes(status) ? status : 'APPLIED',
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

module.exports = {
  exportJobsToCSV,
  importJobsFromCSV,
  exportJobsToExcel,
};
