require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const verifyToken = require("../../middleware/authentication");
const run = require("../../helpers/gemini");
const slugify = require("slugify");

const { Reports } = require("../../models/users");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const generateSlug = (filename) => {
  const name = filename.split(".").slice(0, -1).join(".");
  return slugify(name, { lower: true, strict: true });
};

const upload = multer({ storage: multer.memoryStorage() });

const s3Client = new S3Client({
  region: "auto", // Region is automatically handled by R2
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const compressImage = async (buffer, maxSizeKB) => {
  let quality = 100;
  let imageBuffer;
  let sizeKB;

  do {
    imageBuffer = await sharp(buffer)
      .resize({ width: 800 }) // Adjust resize parameters if needed
      .jpeg({ quality })
      .toBuffer();

    sizeKB = imageBuffer.length / 1024;
    quality -= 10; // Decrease quality until under maxSizeKB
  } while (sizeKB > maxSizeKB && quality > 10);

  return imageBuffer;
};

router.post(
  "/generate",
  verifyToken,
  upload.fields([
    { name: "event_photos", maxCount: 6 },
    { name: "event_attendence_photos", maxCount: 6 },
    { name: "event_poster", maxCount: 6 },
    { name: "speaker_image", maxCount: 4 },
    { name: "program_sheet", maxCount: 2 },
    { name: "lor", maxCount: 2 },
    { name: "participant_certificate", maxCount: 2 },
    ,
  ]),
  async (req, res) => {
    try {
      const uploadPromises = [];
      const fileUrls = {
        event_photos: [],
        event_attendence_photos: [],
        event_poster: [],
        speaker_image: [],
        program_sheet: [],
        lor: [],
        participant_certificate: [],
      };

      const handleFiles = async (fieldName, req, uploadPromises, fileUrls) => {
        if (req.files[fieldName]) {
          for (const file of req.files[fieldName]) {
            let buffer = file.buffer;

            if (file.mimetype.startsWith("image/")) {
              buffer = await compressImage(buffer, 500); // Compress to 500KB
            }
            const folderName = fieldName;
            const fileExtension = file.originalname.split(".").pop();
            const fileName = `${Date.now()}_${file.originalname}`;
            const key = `${folderName}/${generateSlug(
              fileName
            )}.${fileExtension}`;

            const params = {
              Bucket: process.env.R2_BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: file.mimetype,
            };

            const command = new PutObjectCommand(params);
            uploadPromises.push(s3Client.send(command));
            fileUrls[fieldName].push(`${process.env.R2_PUBLIC}/${key}`); // Store the file URL
          }
        }
      };

      // Handle files for each field
      await Promise.all([
        handleFiles("event_photos", req, uploadPromises, fileUrls),
        handleFiles("event_attendence_photos", req, uploadPromises, fileUrls),
        handleFiles("event_poster", req, uploadPromises, fileUrls),
        handleFiles("speaker_image", req, uploadPromises, fileUrls),
        handleFiles("program_sheet", req, uploadPromises, fileUrls),
        handleFiles("lor", req, uploadPromises, fileUrls),
        handleFiles("participant_certificate", req, uploadPromises, fileUrls),
      ]);

      await Promise.all(uploadPromises);
      const current_url = req.headers.host;
      const images = {
        kjcmt_header: `http://${current_url}/event_photo/kjcmt-header.png`,
        kjcmt_footer: `http://${current_url}/event_photo/kjcmt-footer.png`,
        fileUrls,
      };
      // res.json({
      //   success: true,
      //   message: "Files uploaded successfully",
      //   images,
      // });
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
        req.files["event_attendence_photos"]
          ? req.files["event_attendence_photos"].map((file) => file.filename)
          : [],
        req.files["event_attendence_photos"]
          ? req.files["event_attendence_photos"].map((file) => file.filename)
          : []
      );
      const speaker_details = [
        (speakerName = req.body.speaker_name),
        (speakerPhone = req.body.phone_number),
        (speakerEmail = req.body.speaker_email),
        (speakerDescription = req.body.speaker_description),
      ];
      const extractedData = extractDataFromGeminiOutput(
        geminiOut,
        speaker_details
      );
      const html = generateHTML(extractedData, images);
      // console.log(html);

      res.send(html);
      // res.json({
      //   success: true,
      //   message: "HTML rendered successfully",
      //   html: html,
      //   images: images,
      // });
    } catch (error) {
      console.error("Error uploading files:", error);
      res
        .status(500)
        .json({ success: false, message: "Error", error: error.message });
    }

    function extractDataFromGeminiOutput(geminiOut, speaker_details) {
      const processText = (text) => {
        // Convert asterisk bullet points to HTML unordered list
        text = text.replace(/^\s*\*\s*/gm, "<li>");
        if (text.includes("<li>")) {
          text = "<ul>" + text + "</ul>";
        }
        text = text.replace(/<\/li><li>/g, "</li>\n<li>");
        text = text.replace(/<li>(.*?)<\/li>/g, "<li>$1</li>");

        // Convert double asterisks to bold HTML tags
        text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

        return text.trim();
      };

      const extract = (field) => {
        const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*([^\\n]+)`);
        const match = geminiOut.match(regex);
        return match ? processText(match[1]) : "";
      };

      const extractMultiline = (field) => {
        const regex = new RegExp(
          `\\*\\*${field}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`
        );
        const match = geminiOut.match(regex);
        return match ? processText(match[1]) : "";
      };
      console.log(speaker_details);
      console.log(speaker_details[1]);
      
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
        // speakerName: extract("Speaker Name"),
        speakerName: speaker_details[0],
        speakerPhone: speaker_details[1],
        speakerEmail: speaker_details[2],
        speakerDescription: speaker_details[3],
      };
    }
    function generateHTML(data, images) {
      const createTableRow = (label, value) => {
        if (value == null || value === "") return ""; // Skip if value is null, undefined, or empty string
        return `
            <tr>
                <th>${label}</th>
                <td>${value}</td>
            </tr>
          `;
      };
      const createImageGrid = (images, altText) => {
        if (!images || images.length === 0) return "";
        return `
    <div class="image-grid">
      ${images.map((src) => `<img src="${src}" alt="${altText}">`).join("")}
    </div>
  `;
      };

      const createSpeakerInfo = (speaker) => {
        if (!speaker.name) return "";
        let info = `<strong>Name:</strong> ${speaker.name}<br>`;
        if (speaker.phone)
          info += `<strong>Phone:</strong> ${speaker.phone}<br>`;
        if (speaker.email)
          info += `<strong>Email:</strong> ${speaker.email}<br>`;
        if (speaker.description)
          info += `<strong>Description:</strong> ${speaker.description}`;
        return `
            <tr>
              <th>Speaker Information</th>
              <td>${info}</td>
            </tr>
          `;
      };

      const createPage = (content) => {
        if (!content.trim()) return ""; // Skip empty pages
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

      ${
        data.description && data.description.length < 800
          ? `${createTableRow("Event Description", data.description)}`
          : ""
      }
       </table>
        `;

      const createDescriptionPage = (description) => {
        if (!description || description.length < 800) return "";
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
          description: data.speakerDescription,
        })}
        ${createTableRow("Feedback", data.feedback)}
        ${createTableRow("Program Outcome", data.outcome)}
        ${
          images.fileUrls.event_photos &&
          images.fileUrls.event_photos.length > 0
            ? `
          <tr>
            <th>Event Photographs</th>
            <td>${createImageGrid(
              images.fileUrls.event_photos,
              "Event Photo"
            )}</td>
          </tr>
        `
            : ""
        }
        ${
          images.fileUrls.event_photos &&
          images.fileUrls.event_photos.length <= 3 &&
          images.fileUrls.event_poster &&
          images.fileUrls.event_poster.length > 0
            ? `
          <tr>
            <th>Event Poster</th>
            <td>${createImageGrid(
              images.fileUrls.event_poster,
              "Event Poster"
            )}</td>
          </tr>
        `
            : ""
        }
      </table>
    `;

      const attendanceList =
        images.fileUrls.event_attendence_photos &&
        images.fileUrls.event_attendence_photos.length > 0
          ? `
        <table>
        ${
          images.fileUrls.event_photos &&
          images.fileUrls.event_photos.length > 3 &&
          images.fileUrls.event_poster &&
          images.fileUrls.event_poster.length > 0
            ? `
          <tr>
            <th>Event Poster</th>
            <td>${createImageGrid(
              images.fileUrls.event_poster,
              "Event Poster"
            )}</td>
          </tr>
        `
            : ""
        }
          <tr>
            <th>Participants List</th>
            <td>${createImageGrid(
              images.fileUrls.event_attendence_photos,
              "Attendance Sheet"
            )}</td>
          </tr>
        </table>
        <div class="name">
          <p class="co">Name & Signature of Co-ordinator</p>
          <p>Principal</p>
        </div>
        <div class="cmi">
          Fr. Dr. Joshy George
        </div>
      `
          : "";

      // Modify the createPage function to use the correct image URLs

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
    // res.json({
    //   success: true,
    //   message: "Files uploaded successfully",
    //   images,
    // });
  }
);

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
