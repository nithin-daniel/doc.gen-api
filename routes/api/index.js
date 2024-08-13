const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const verifyToken = require("../../middleware/authentication");
const run = require("../../helpers/gemini");
const slugify = require("slugify");

// // Multer configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     let uploadPath = 'uploads/';
//     if (file.fieldname === 'event_photos') uploadPath += 'event_photos/';
//     else if (file.fieldname === 'event_attendence_photos') uploadPath += 'event_attendence/';
//     else if (file.fieldname === 'event_poster') uploadPath += 'event_poster/';
    
//     fs.mkdirSync(uploadPath, { recursive: true });
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage: storage });


// const upload = multer({ dest: 'uploads/' })

const event_photos = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "event_photos_uploads/");
  },
  filename: (req, file, cb) => {
    // Generate the unique filename
    const filename = Date.now() + "-" + file.originalname;

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
    cb(null, "event_attendence_uploads/");
  },
  filename: (req, file, cb) => {
    // Generate the unique filename
    const filename = Date.now() + "-" + file.originalname;

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
  const name = filename.split(".").slice(0, -1).join(".");
  return slugify(name, { lower: true, strict: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "event_photos_uploads/");
  },
  filename: (req, file, cb) => {
    const slug = generateSlug(file.originalname);
    const extension = file.originalname.split(".").pop();
    const filename = `${Date.now()}-${slug}.${extension}`;

    if (file.fieldname === "event_photos") {
      if (!req.eventPhotosFileNames) {
        req.eventPhotosFileNames = [];
      }
      req.eventPhotosFileNames.push(filename);
    } else if (file.fieldname === "event_attendence_photos") {
      if (!req.eventAttendanceFileNames) {
        req.eventAttendanceFileNames = [];
      }
      req.eventAttendanceFileNames.push(filename);
    } else if (file.fieldname === "event_poster") {
      if (!req.eventPosterFileNames) {
        req.eventPosterFileNames = [];
      }
      req.eventPosterFileNames.push(filename);
    }
    cb(null, filename);
  },
});
const upload = multer({ storage: storage });

router.post(
  "/generate",
  verifyToken,
  upload.fields([
    { name: "event_photos", maxCount: 6 },
    { name: "event_attendence_photos", maxCount: 6 },
    { name: "event_poster", maxCount: 6 },
  ]),
  async (req, res) => {
    try {
      const current_url = req.headers.host;
      const images = {
        kjcmt_header: `http://${current_url}/event_photo/kjcmt-header.png`,
        kjcmt_footer: `http://${current_url}/event_photo/kjcmt-footer.png`,
        event_photos: (req.files["event_photos"] || []).map(
          (file) => `http://${current_url}/event_photo/${file.filename}`
        ),
        event_attendence_photos: (req.files["event_attendence_photos"] || []).map(
          (file) => `http://${current_url}/event_photo/${file.filename}`
        ),
        event_poster: (req.files["event_poster"] || []).map(
          (file) => `http://${current_url}/event_photo/${file.filename}`
        ),
      };

      // Generate AI content
      const geminiOut = await run(
        req.body.event_name,
        req.body.event_date,
        req.body.event_time,
        req.body.event_organizing_club,
        req.body.student_count,
        req.body.faculty_count,
        req.body.event_mode,
        req.body.faculty_cooridinator,
        req.body.event_description,
        req.body.program_outcome,
        req.body.event_feedback,
        req.files["event_attendence_photos"] ? req.files["event_attendence_photos"].map(file => file.filename) : [],
        req.files["event_attendence_photos"] ? req.files["event_attendence_photos"].map(file => file.filename) : []
      );

      const extractedData = extractDataFromGeminiOutput(geminiOut);
      const html = generateHTML(extractedData, images);

      // Save HTML to file (optional)
      fs.writeFile("output.html", html, function (err) {
        if (err) {
          console.error("Error saving HTML file:", err);
        } else {
          console.log("The HTML file was saved!");
        }
      });

      res.json({
        status: 200,
        message: "Report generated successfully",
        html: html,
      });
    } catch (err) {
      console.error("Error generating report:", err);
      res.status(500).json({
        status: 500,
        message: "Error generating report",
        error: err.message,
      });
    }
  }
);
function extractDataFromGeminiOutput(geminiOut) {
  console.log(geminiOut);
  
  const processText = (text) => {
    // Convert asterisk bullet points to HTML unordered list
    text = text.replace(/^\s*\*\s*/gm, '<li>');
    if (text.includes('<li>')) {
      text = '<ul>' + text + '</ul>';
    }
    text = text.replace(/<\/li><li>/g, '</li>\n<li>');
    text = text.replace(/<li>(.*?)<\/li>/g, '<li>$1</li>');
    
    // Convert double asterisks to bold HTML tags
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
    return text.trim();
  };
  
  const extract = (field) => {
    const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*([^\\n]+)`);
    const match = geminiOut.match(regex);
    return match ? processText(match[1]) : "";
  };
  
  const extractMultiline = (field) => {
    const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`);
    const match = geminiOut.match(regex);
    return match ? processText(match[1]) : "";
  };
  
  return {
    eventName: extract("Event/Program Name"),
    date: extract("Date"),
    time: extract("Time"),
    organizingDept: extract("Organizing Department/Club/Cell"),
    studentParticipants: extract("Total Student Participants"),
    facultyParticipants: extract("Total Faculty Participants"),
    mode: extract("Mode of Event"),
    coordinator: extract("Faculty Coordinator"),
    description: extractMultiline("Brief Event/Program Description"),
    outcome: extractMultiline("Program Outcome"),
    feedback: extractMultiline("Feedback"),
    speakerName: extract("Speaker Name"),
    speakerPhone: extract("Speaker Phone"),
    speakerEmail: extract("Speaker Email"),
    speakerDescription: extractMultiline("Speaker Description")
  };
}
function generateHTML(data, images) {
  const createTableRow = (label, value) => {
    if (value == null || value === '') return ''; // Skip if value is null, undefined, or empty string
    return `
      <tr>
          <th>${label}</th>
          <td>${value}</td>
      </tr>
    `;
  };

  const createImageGrid = (images, altText) => {
    if (!images || images.length === 0) return '';
    return `
      <div class="image-grid">
          ${images.map(src => `<img src="${src}" alt="${altText}">`).join('')}
      </div>
    `;
  };

  const createSpeakerInfo = (speaker) => {
    if (!speaker.name) return '';
    let info = `<strong>Name:</strong> ${speaker.name}<br>`;
    if (speaker.phone) info += `<strong>Phone:</strong> ${speaker.phone}<br>`;
    if (speaker.email) info += `<strong>Email:</strong> ${speaker.email}<br>`;
    if (speaker.description) info += `<strong>Description:</strong> ${speaker.description}`;
    return `
      <tr>
        <th>Speaker Information</th>
        <td>${info}</td>
      </tr>
    `;
  };

  const createPage = (content) => {
    if (!content.trim()) return ''; // Skip empty pages
    return `
      <div class="page">
        <div class="page-content">
          <img src="${images.kjcmt_header}" alt="Header" class="header">
          <div class="content">
            ${content}
          </div>
          <img src="${images.kjcmt_footer}" alt="Footer" class="footer">
        </div>
      </div>
    `;
  };

  const mainInfo = `
    <table>
      ${createTableRow("Title of Activity", data.eventName)}
      ${createTableRow("Date", data.date)}
      ${createTableRow("Time", data.time)}
      ${createTableRow("Department/Club/Cell", data.organizingDept)}
      ${createTableRow("Total Student Participants", data.studentParticipants)}
      ${createTableRow("Total Faculty Participants", data.facultyParticipants)}
      ${createTableRow("Mode of Event", data.mode)}
      ${createTableRow("Faculty Coordinator", data.coordinator)}

${data.description && data.description.length < 800 ? `${createTableRow("Event Description", data.description)}`: ''}   
 </table>
  `;

  const createDescriptionPage = (description) => {
    if (!description || description.length < 800) return '';
    return createPage(`
      <table>
      ${createTableRow("Event Description", data.description)}
      </table>
      `);
  };

  const additionalInfo = `
    <table>
      ${createSpeakerInfo({
        name: data.speakerName,
        phone: data.speakerPhone,
        email: data.speakerEmail,
        description: data.speakerDescription
      })}
      ${createTableRow("Feedback", data.feedback)}
      ${createTableRow("Program Outcome", data.outcome)}
      ${images.event_photos && images.event_photos.length > 0 ? `
        <tr>
          <th>Event Photographs</th>
          <td>${createImageGrid(images.event_photos, "Event Photo")}</td>
        </tr>
      ` : ''}
      ${images.event_photos && images.event_photos.length <= 3 && images.event_poster && images.event_poster.length > 0 ? `
        <tr>
          <th>Event Poster</th>
          <td>${createImageGrid(images.event_poster, "Event Poster")}</td>
        </tr>
      ` : ''}
    </table>
  `;

  const attendanceList = images.event_attendence_photos && images.event_attendence_photos.length > 0 ? `
    <table>
    ${images.event_photos && images.event_photos.length > 3 && images.event_poster && images.event_poster.length > 0 ? `
      <tr>
        <th>Event Poster</th>
        <td>${createImageGrid(images.event_poster, "Event Poster")}</td>
      </tr>
    ` : ''}
      <tr>
        <th>Participants List</th>
        <td>${createImageGrid(images.event_attendence_photos, "Attendance Sheet")}</td>
      </tr>
    </table>
    <div class="name">
      <p class="co">Name & Signature of Co-ordinator</p>
      <p>Principal</p>
    </div>
    <div class="cmi">
      Fr. Dr. Joshy George
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Report</title>
        <style>
            @page {
                size: A4;
                margin: 0;
            }
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f0f0f0;
            }
            .page {
                width: 21cm;
                height: 29.7cm;
                margin: auto;
                padding: 1cm;
                box-sizing: border-box;
                position: relative;
                page-break-after: always;
                background-color: white;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .page-content {
                border: 2px solid #000;
                height: calc(100% - 2cm);
                padding: 1cm;
                position: relative;
            }
            .page:last-child {
                page-break-after: auto;
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                vertical-align: top;
            }
            th {
                background-color: #f2f2f2;
                font-weight: bold;
                text-align: left;
                width: 30%;
            }
            .header, .footer {
                width: calc(100% - 4cm);
                height: auto;
                position: absolute;
                left: 2cm;
                right: 2cm;
            }
            .header {
                top: 1cm;
            }
            .footer {
                bottom: 1cm;
            }
            .content {
                margin-top: 3cm;
                margin-bottom: 4cm;
            }
            .image-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 10px;
            }
            .image-grid img {
                width: 100%;
                height: auto;
                object-fit: contain;
            }
            .name {
                text-align: center;
                font-weight: bold;
                font-size: 15px;
                margin-top: 100px;
                display: flex;
            }
            .co {
                margin-right: 220px;
                margin-left: 30px;
            }
            .cmi {
                text-align: center;
                font-weight: bold;
                font-size: 15px;
                margin-top: -5px;
                margin-left: 350px;
            }
            @media print {
                body {
                    background-color: white;
                }
                .page {
                    margin: 0;
                    box-shadow: none;
                }
                .page-break {
                    page-break-before: always;
                }
            }
            .event-photos-container {
                width: 100%;
                height: 100px;
                overflow-y: auto;
                border: 1px solid #ddd;
            }
            .event-photos-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
                padding: 10px;
            }
            .event-photos-grid img {
                width: 100%;
                height: 100px;
                object-fit: cover;
            }
            .image-grid img,
            .event-photos-grid img {
                max-width: 100%;
                max-height: 150px;
                object-fit: contain;
            }
        </style>
    </head>
    <body>
        ${createPage(mainInfo)}
            ${createDescriptionPage(data.description)}
        ${createPage(additionalInfo)}
        ${createPage(attendanceList)}
    </body>
    </html>`;
}

// Error handling middleware for Multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.log("Multer error:", err.message);
    res.status(400).json({ message: "File upload error: " + err.message });
  } else {
    console.log("Other error occurred:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;