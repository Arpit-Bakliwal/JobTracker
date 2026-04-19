const multer = require("multer");
const { HTTP_STATUS, MESSAGES } = require("../constants");

// Memory storage — file available as Buffer in req.file.buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb ) => {
    // Accept only csv files
    if(
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.csv')
    ){
        cb(null, true);
    } else {
        const error = new Error(MESSAGES.FILE_UPLOAD.ONLY_CSV_ALLOWED);
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        cb(error, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB Max
    },
});

module.exports = upload;

