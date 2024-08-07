const run = require("../../helpers/gemini");
const verifyToken = require("../../middleware/authentication");

const express = require("express");
const router = express.Router();
const multer = require("multer");
const slugify = require("slugify");

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
  (req, res, next) => {
    upload.fields([
      { name: "event_photos", maxCount: 6 },
      { name: "event_attendence_photos", maxCount: 6 },
      { name: "event_poster", maxCount: 6 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          // Ignore this error and continue
          return next();
        }
        return res
          .status(400)
          .json({
            status: 400,
            message: "File upload error",
            error: err.message,
          });
      } else if (err) {
        return res
          .status(500)
          .json({
            status: 500,
            message: "File upload failed",
            error: err.message,
          });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const current_url = req.headers.host;
      const images = {
        kjcmt_header: `https://${current_url}/event_photo/kjcmt-header.png`,
        kjcmt_footer: `https://${current_url}/event_photo/kjcmt-footer.png`,
        event_photos: (req.files["event_photos"] || []).map(
          (file) => `https://${current_url}/event_photo/${file.filename}`
        ),
        event_attendence_photos: (
          req.files["event_attendence_photos"] || []
        ).map((file) => `https://${current_url}/event_photo/${file.filename}`),
        event_poster: (req.files["event_poster"] || []).map(
          (file) => `https://${current_url}/event_photo/${file.filename}`
        ),
      };

      const {
        event_name,
        event_date,
        event_time,
        event_organizing_club,
        student_count,
        faculty_count,
        event_mode,
        faculty_cooridinator,
        event_description,
        program_outcome,
        event_feedback,
      } = req.body;

      const eventAttendanceFileNames = req.files["event_attendence_photos"]
        ? req.files["event_attendence_photos"].map((file) => file.filename)
        : [];

      let geminiOut = await run(
        event_name,
        event_date,
        event_time,
        event_organizing_club,
        student_count,
        faculty_count,
        event_mode,
        faculty_cooridinator,
        event_description,
        program_outcome,
        event_feedback,
        eventAttendanceFileNames,
        eventAttendanceFileNames
      );

      
      // Extracting data from text
      const extractData = (text, label) => {
        if (typeof text !== "string") {
          console.error(`Expected string for text, but got ${typeof text}`);
          return "";
        }
        const regex = new RegExp(`\\*\\*${label}:\\*\\* ([^\\n]+)`);
        const match = text.match(regex);
        return match ? match[1].trim() : "";
      };

      const extractMultilineData = (text, label) => {
        if (typeof text !== "string") {
          console.error(`Expected string for text, but got ${typeof text}`);
          return "";
        }
        const regex = new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)(\\*\\*|$)`);
        const match = text.match(regex);
        return match ? match[1].trim() : "";
      };

      // Function to count words in a string
      const countWords = (str) => {
        return str.trim().split(/\s+/).length;
      };
      function runFromWeb(readmeData) {
        try {
          if (typeof readmeData !== "string") {
            console.error("readmeData is not a string:", readmeData);
            readmeData = JSON.stringify(readmeData);
          }

          // Extract data from the README string
          const extractFromReadme = (field) => {
            const regex = new RegExp(`\\*\\*${field}:\\*\\* ([^\\n]+)`);
            const match = readmeData.match(regex);
            return match ? match[1].trim() : "";
          };

          const extractMultilineFromReadme = (field) => {
            const regex = new RegExp(`## ${field}\\n([\\s\\S]*?)(?=\\n##|$)`);
            const match = readmeData.match(regex);
            return match ? match[1].trim() : "";
          };

          const data = {
            eventName: extractFromReadme("Event/Program Name"),
            date: extractFromReadme("Date"),
            time: extractFromReadme("Time"),
            organizingDept: extractFromReadme(
              "Organizing Department/Club/Cell"
            ),
            studentParticipants: extractFromReadme("Students"),
            facultyParticipants: extractFromReadme("Faculty"),
            mode: extractFromReadme("Mode of Event"),
            coordinator: extractFromReadme("Faculty Coordinator"),
            description: extractMultilineFromReadme("Event Description"),
            outcome: extractMultilineFromReadme("Program Outcome"),
            feedback: extractMultilineFromReadme("Feedback"),
            speakername: "roji thomas", //foram.speakername
            speakerph: "1234567890", //foram.speakerph
            speakeremail: "speaker@venue", //foram.speakeremail
            speakerdescp: "good and majestic speaker",
          };

          // Generate the HTML content
          
          const html = generateHTML(data);
          return html;
        } catch (error) {
          console.error("Error generating report:", error);
          return null;
        }
      }

      const generateHTML = (data) => {
        
        const createTableRow = (label, value) => {
          
          return value
            ? `
              <tr>
                  <th>${label}</th>
                  <td>${value}</td>
              </tr>
          `
            : "";
        };

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
      <div class="page">
          <div class="page-content">
              <img src="https://doc-gen-api.onrender.com/event_photo/kjcmt-header.png" alt="Header" class="header">
              
              <div class="content">
                  <table>
                      ${createTableRow("Title of Activity", data.eventName)}
                      ${createTableRow("Date", data.date)}
                      
                      ${createTableRow(
                        "Department/Club/Cell",
                        data.organizingDept
                      )}
                      ${createTableRow(
                        "Total Student Participants",
                        data.studentParticipants
                      )}
                      ${createTableRow(
                        "Total Faculty Participants",
                        data.facultyParticipants
                      )}
                      ${createTableRow("Mode of Event", data.mode)}
                      ${createTableRow("Faculty Coordinator", data.coordinator)}
                      ${createTableRow("Event Description", data.description)}
                  </table>
              </div>
              
              <img src="https://doc-gen-api.onrender.com/event_photo/kjcmt-footer.png" alt="Footer" class="footer">
          </div>
      </div>
  
      <div class="page">
          <div class="page-content">
              <img src="https://doc-gen-api.onrender.com/event_photo/kjcmt-header.png" alt="Header" class="header">
              
              <div class="content">
                  <table>
                      ${
                        data.speakername ||
                        data.speakerph ||
                        data.speakeremail ||
                        data.speakerdescp
                          ? `
                      <tr>
                          <th>Speaker Information</th>
                          <td>
                              ${
                                data.speakername
                                  ? `<strong>Name:</strong> ${data.speakername}<br>`
                                  : ""
                              }
                              ${
                                data.speakerph
                                  ? `<strong>Phone:</strong> ${data.speakerph}<br>`
                                  : ""
                              }
                              ${
                                data.speakeremail
                                  ? `<strong>Email:</strong> ${data.speakeremail}<br>`
                                  : ""
                              }
                              ${
                                data.speakerdescp
                                  ? `<strong>Description:</strong> ${data.speakerdescp}`
                                  : ""
                              }
                          </td>
                      </tr>
                      `
                          : ""
                      }
                      ${createTableRow("Feedback", data.feedback)}
                      ${createTableRow("Program Outcome", data.outcome)}
                      // foram  
                      ${
                        // data.images &&
                        event_photos &&
                        event_photos.length > 0
                          ? `
                      <tr>
                          <th>Event Photographs</th>
                          <td>
                              <div class="image-grid">
                            //foram.  ${event_photos
                              .map(
                                (src) => `<img src="${src}" alt="Event Photo">`
                              )
                              .join("")}
                              </div>
                          </td>
                      </tr>
                      `
                          : ""
                      }
                      // foram
                      ${
                        // data.images &&
                        images.event_poster &&
                        images.event_poster.length > 0
                          ? `
                      <tr>
                          <th>Event Poster</th>
                          <td>
                              <div class="image-grid">
                              
                                  ${images.event_poster
                                    .map(
                                      (src) =>
                                        `<img src="${src}" alt="Event Poster">`
                                    )
                                    .join("")}
                              </div>
                          </td>
                      </tr>
                      `
                          : ""
                      }
                  </table>
              </div>
              
              <img src="https://doc-gen-api.onrender.com/event_photo/kjcmt-footer.png" alt="Footer" class="footer">
          </div>
      </div>
      //foram
      ${
        // data.images &&
        images.event_attendence_photos &&
        images.event_attendence_photos.length > 0
          ? `
      <div class="page">
          <div class="page-content">
              <img src="https://doc-gen-api.onrender.com/event_photo/kjcmt-header.png" alt="Header" class="header">
              
              <div class="content">
                  <table>
                      <tr>
                          <th>Participants List</th>
                          <td>
                              <div class="image-grid">
                                  ${images.event_attendence_photos
                                    .map(
                                      (src) =>
                                        `<img src="${src}" alt="Attendance Sheet">`
                                    )
                                    .join("")}
                              </div>
                          </td>
                      </tr>
                  </table>
                  <div class="name">
                      <p class="co">Name & Signature of Co-ordinator</p>
                      <p>Principal</p>
                  </div>
                  <div class="cmi">
                      Fr. Dr. Joshy George
                  </div>
              </div>
              
              <img src="https://doc-gen-api.onrender.com/event_photo/kjcmt-footer.png" alt="Footer" class="footer">
          </div>
      </div>
      `
          : ""
      }
  </body>
  </html>
  `;
      };
      const html = await runFromWeb(geminiOut);
      // console.log(html);
      
      var fs = require("fs");
      fs.writeFile("output.html", html, function (err) {
        if (err) {
          return console.log(err);
        }

        console.log("The file was saved!");
      });
      

      res.json({
        status: 200,
        message: "API is working properly",
        // data: data,
        images: html,
      });
    } catch (err) {
      return res.status(400).json({
        status: 400,
        message: "Something Went Wrong",
        error: err.message,
      });
    }
  }
);

// Error handling middleware for Multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer error occurred during file upload
    console.log("Multer error:", err.message);
    res.status(400).json({ message: "Multer error: " + err.message });
  } else {
    // Handle other errors
    console.log("Other error occurred:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
