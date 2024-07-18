const run = require('../../helpers/gemini')

const express = require('express');
const router = express.Router();
const multer = require('multer')
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

// router.post('/generate', event_photos_upload.array('event_photos', 6), event_attendence_upload.array('event_attendence_photos', 6), async (req, res, next) => {

//     console.log('Uploaded files:', req.eventPhotosFileNames);
//     console.log('Uploaded files:', req.eventAttendanceFileNames);


//     // const { event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome } = req.body;
//     // let data = await run(event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome, req.eventAttendanceFileNames, req.eventAttendanceFileNames)
//     res.json({
//         status: 200,
//         message: 'API is working properly',
//         // data: data
//     });
// });
// router.post('/generate',
//     event_photos_upload.array('event_photos', 6), // Handle 'event_photos' field
//     event_attendence_upload.array('event_attendence_photos', 6), // Handle 'event_attendence_photos' field
//     async (req, res, next) => {
//         console.log('Uploaded files - Event Photos:', req.eventPhotosFileNames);
//         console.log('Uploaded files - Event Attendance Photos:', req.eventAttendanceFileNames);

//         // Handle uploaded files or call functions to process them
//         // Example:
//         // const data = await processFiles(req.eventPhotosFileNames, req.eventAttendanceFileNames);

//         res.json({
//             status: 200,
//             message: 'Files uploaded successfully',
//             // data: data // Include any additional data you want to send back
//         });
//     });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'event_photos_uploads/');
    },
    filename: (req, file, cb) => {
        const filename = Date.now() + '-' + file.originalname;
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
        }
        cb(null, filename);
    },
});
const upload = multer({ storage: storage });

router.post('/generate',
    upload.fields([
        { name: 'event_photos', maxCount: 6 },
        { name: 'event_attendence_photos', maxCount: 6 }
    ]),
    async (req, res, next) => {
        try {
            // console.log('Uploaded files - Event Photos:', req.eventPhotosFileNames);
            // console.log('Uploaded files - Event Attendance Photos:', req.eventAttendanceFileNames);
            const current_url = req.header.host
            const images = {
                event_photos: req.eventPhotosFileNames.map((filename) => `https://${req.headers.host}/event_photo/${filename}`),
                event_attendence_photos: req.eventAttendanceFileNames.map((filename) => `https://${req.headers.host}/event_photo/${filename}`)
            }

            const { event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome, event_feedback } = req.body;
            let data = await run(event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome, event_feedback, req.eventAttendanceFileNames, req.eventAttendanceFileNames)
            res.json({
                status: 200,
                message: 'API is working properly',
                data: data,
                images: images
            });
        } catch (err) {
            return res.status(400).json({
                status: 400,
                message: 'Error creating user',
                error: err
            })
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