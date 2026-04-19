const { asyncHandler } = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const { exportJobsToCSV, importJobsFromCSV, exportJobsToExcel } = require('../services/file.service');
const { format } = require('fast-csv');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const exportCSV = asyncHandler(async(req, res) => {
    const csvData = await exportJobsToCSV(req.user.id);

    // Set response headers for file upload
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="jobs-${new Date().toISOString().split('T')[0]}.csv"`
    );

    // Stream CSV directly to response
    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    csvData.forEach((row) => csvStream.write(row))
    
    csvStream.end();
});

const importCSV = asyncHandler(async (req, res) => {
    if (!req.file){
        const error = new Error(MESSAGES.FILE_UPLOAD.NO_CSV_UPLOADED);
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
    }

    const result = await importJobsFromCSV(req.file.buffer, req.user.id);

    return ApiResponse.success(
        res,
        result,
        `Successfully imported ${result.imported} jobs`,
        HTTP_STATUS.OK
    );
});

const exportExcel = asyncHandler(async (req, res) => {
  const workbook = await exportJobsToExcel(req.user.id);

  // Set headers for Excel download
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="jobs-${new Date().toISOString().split('T')[0]}.xlsx"`
  );

  // Stream workbook directly to response
  await workbook.xlsx.write(res);
  res.end();
});
 

module.exports = { exportCSV, importCSV, exportExcel };