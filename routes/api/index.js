const run = require('../../helpers/gemini')

const express = require('express');
const router = express.Router();
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })


router.post('/generate', upload.array('photos', 12), async (req, res, next) => {
    console.log(req.files);
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        },
    });
    const upload = multer({ storage: storage });

    // const { event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome } = req.body;
    // let data = await run(event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome)
    res.json({
        status: 200,
        message: 'API is working properly',
        // data: data
    });
});

module.exports = router;