const run = require('../../helpers/gemini')

const express = require('express');
const router = express.Router();

router.post('/generate', async (req, res) => {
    const { event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome } = req.body;
    let data = await run(event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome )
    res.json({
        status: 200,
        message: 'API is working properly',
        data:data
    });
});

module.exports = router;