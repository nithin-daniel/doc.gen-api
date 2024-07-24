const run = require('../../helpers/gemini')
const verifyToken = require('../../middleware/authentication');

const express = require('express');
const router = express.Router();
const multer = require('multer')
const slugify = require('slugify');

// const upload = multer({ dest: 'uploads/' })

const event_photos = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'event_photos_uploads/');
    },
    filename: (req, file, cb) => {
        // Generate the unique filename
        const filename = Date.now() + '-' + file.originalname;

        // Store the filename in a list (assuming req.fileNames is an array on the request object)
        if (!req.eventPhotosFileNames) {
            req.eventPhotosFileNames = [];
        }
        req.eventPhotosFileNames.push(filename);
        cb(null, filename);
    },
});

const event_photos_upload = multer({ storage: event_photos });

const event_attendence = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'event_attendence_uploads/');
    },
    filename: (req, file, cb) => {
        // Generate the unique filename
        const filename = Date.now() + '-' + file.originalname;

        // Store the filename in a list (assuming req.fileNames is an array on the request object)
        if (!req.eventAttendanceFileNames) {
            req.eventAttendanceFileNames = [];
        }
        req.eventAttendanceFileNames.push(filename);
        cb(null, filename);
    },
});

const event_attendence_upload = multer({ storage: event_attendence });

const generateSlug = (filename) => {
    const name = filename.split('.').slice(0, -1).join('.');
    return slugify(name, { lower: true, strict: true });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'event_photos_uploads/');
    },
    filename: (req, file, cb) => {
        const slug = generateSlug(file.originalname);
        const extension = file.originalname.split('.').pop();
        const filename = `${Date.now()}-${slug}.${extension}`;

        if (file.fieldname === 'event_photos') {
            if (!req.eventPhotosFileNames) {
                req.eventPhotosFileNames = [];
            }
            req.eventPhotosFileNames.push(filename);
        } else if (file.fieldname === 'event_attendence_photos') {
            if (!req.eventAttendanceFileNames) {
                req.eventAttendanceFileNames = [];
            }
            req.eventAttendanceFileNames.push(filename);
        } else if (file.fieldname === 'event_poster') {
            if (!req.eventPosterFileNames) {
                req.eventPosterFileNames = [];
            }
            req.eventPosterFileNames.push(filename);
        }
        cb(null, filename);
    },
});
const upload = multer({ storage: storage });



router.post('/generate', verifyToken, (req, res, next) => {
  upload.fields([
    { name: 'event_photos', maxCount: 6 },
    { name: 'event_attendence_photos', maxCount: 6 },
    { name: 'event_poster', maxCount: 6 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        // Ignore this error and continue
        return next();
      }
      return res.status(400).json({ status: 400, message: 'File upload error', error: err.message });
    } else if (err) {
      return res.status(500).json({ status: 500, message: 'File upload failed', error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const current_url = req.headers.host;
    const images = {
      event_photos: (req.files['event_photos'] || []).map(file => `https://${current_url}/event_photo/${file.filename}`),
      event_attendence_photos: (req.files['event_attendence_photos'] || []).map(file => `https://${current_url}/event_photo/${file.filename}`),
      event_poster: (req.files['event_poster'] || []).map(file => `https://${current_url}/event_photo/${file.filename}`)
    };

    const { 
      event_name, event_date, event_time, event_organizing_club, 
      student_count, faculty_count, event_mode, faculty_cooridinator, 
      event_description, program_outcome, event_feedback 
    } = req.body;

    const eventAttendanceFileNames = req.files['event_attendence_photos'] ? req.files['event_attendence_photos'].map(file => file.filename) : [];

    let data = await run(
      event_name, event_date, event_time, event_organizing_club, 
      student_count, faculty_count, event_mode, faculty_cooridinator, 
      event_description, program_outcome, event_feedback, 
      eventAttendanceFileNames, eventAttendanceFileNames
    );

    res.json({
      status: 200,
      message: 'API is working properly',
      data: data,
      images: images
    });
  } catch (err) {
    return res.status(400).json({
      status: 400,
      message: 'Something Went Wrong',
      error: err.message
    });
  }
});

// Error handling middleware for Multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer error occurred during file upload
        console.log('Multer error:', err.message);
        res.status(400).json({ message: 'Multer error: ' + err.message });
    } else {
        // Handle other errors
        console.log('Other error occurred:', err.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;