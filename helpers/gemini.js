require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const apiKey = process.env.GEMINI_API;

// Initialize Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run(event_name, event_date, event_time, event_organizing_club, student_count, faculty_count, event_mode, faculty_cooridinator, event_description, program_outcome) {
    const prompt = `Please provide the following details for generating a README report: 
    (Event/Program Name: ${event_name} 
    Date: ${event_date} 
    Time: ${event_time} 
    Organizing Department/Club/Cell:${event_organizing_club} 
    Total Student Participants:${student_count} 
    Total Faculty Participants:${faculty_count} 
    Mode of Event (Online/Offline): ${event_mode}  
    Faculty Coordinator: ${faculty_cooridinator} 
    Brief Event/Program Description: ${event_description} 
    Program Outcome: ${program_outcome} 
    Don't change the above format and also use professional sentences and make the program description and outcome more DESCRIPTIVE for that use some gap contents (Only give the proper result only).`;

    try {
        // Generate content using the generative AI model
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        console.log(text);

        // Extract data from the generated text using regular expressions
        const extractData = (text, label) => {
            const regex = new RegExp(`\\*\\*${label}:\\*\\* ([^\\n]+)`);
            const match = text.match(regex);
            return match ? match[1].trim() : '';
        };

        const extractMultilineData = (text, label) => {
            const regex = new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)(\\*\\*|$)`);
            const match = text.match(regex);
            return match ? match[1].trim() : '';
        };

        const data = {
            eventName: extractData(text, 'Event/Program Name'),
            date: extractData(text, 'Date'),
            time: extractData(text, 'Time'),
            organizingDept: extractData(text, 'Organizing Department/Club/Cell'),
            studentParticipants: extractData(text, 'Total Student Participants'),
            facultyParticipants: extractData(text, 'Total Faculty Participants'),
            mode: extractData(text, 'Mode of Event (Online/Offline)'),
            coordinator: extractData(text, 'Faculty Coordinator'),
            description: extractMultilineData(text, 'Brief Event/Program Description'),
            Highlight: extractMultilineData(text, 'Key Highlights'),
            outcome: extractMultilineData(text, 'Program Outcome'),
            plan: extractMultilineData(text, 'Future Plans'),
            Feedback: extractMultilineData(text, 'Feedback')
        };

        // Function to generate HTML dynamically based on extracted data
        const generateHTML = (data) => `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authentic Tech Master - Event Report</title>
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
                    }
                    .page {
                        width: 21cm;
                        height: 29.7cm;
                        margin: 0 auto;
                        padding: 1cm;
                        box-sizing: border-box;
                        border: 1px solid #000;
                        position: relative;
                        page-break-after: always;
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
                        width: calc(100% - 2cm);
                        height: auto;
                        position: absolute;
                        left: 1cm;
                        right: 1cm;
                    }
                    .header {
                        top: 1cm;
                    }
                    .footer {
                        bottom: 1cm;
                    }
                    .content {
                        margin-top: 3cm;
                        margin-bottom: 3cm;
                    }
                    .download-btn {
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #4CAF50;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                    @media print {
                        .download-btn {
                            display: none;
                        }
                    }
                    .image-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                        gap: 10px;
                    }
                    .image-grid img {
                        width: 100%;
                        height: auto;
                        object-fit: cover;
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <img src="/ASSET/11.png" alt="Header" class="header">
                    
                    <div class="content">
                        <table>
                            <tr>
                                <th colspan="2"><h1>${data.eventName}</h1></th>
                            </tr>
                            <tr>
                                <th>Event/Program Name</th>
                                <td>${data.eventName}</td>
                            </tr>
                            <tr>
                                <th>Date</th>
                                <td>${data.date}</td>
                            </tr>
                            <tr>
                                <th>Time</th>
                                <td>${data.time}</td>
                            </tr>
                            <tr>
                                <th>Organizing Department/Club/Cell</th>
                                <td>${data.organizingDept}</td>
                            </tr>
                            <tr>
                                <th>Total Student Participants</th>
                                <td>${data.studentParticipants}</td>
                            </tr>
                            <tr>
                                <th>Total Faculty Participants</th>
                                <td>${data.facultyParticipants}</td>
                            </tr>
                            <tr>
                                <th>Mode of Event</th>
                                <td>${data.mode}</td>
                            </tr>
                            <tr>
                                <th>Faculty Coordinator</th>
                                <td>${data.coordinator}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <img src="/ASSET/22.png" alt="Footer" class="footer">
                </div>

                <div class="page">
                    <img src="/ASSET/11.png" alt="Header" class="header">
                    
                    <div class="content">
                        <table>
                            <tr>
                                <th>Event Description</th>
                                <td>
                                    ${data.description}
                                    ${data.Highlight}
                                </td>
                            </tr>
                            <tr>
                                <th>Program Outcome</th>
                                <td>
                                    ${data.outcome}
                                    ${data.plan}
                                </td>
                            </tr>
                            <tr>
                                <th>Feedback</th>
                                <td>
                                    ${data.Feedback}
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <img src="/ASSET/22.png" alt="Footer" class="footer">
                </div>

               

                <div class="page">
                    <img src="/ASSET/11.png" alt="Header" class="header">
                    
                    <div class="content">
                        <table>
                            <tr>
                                <th>Event Photos</th>
                                <td>
                                    <div class="image-grid">
                                        <img src="photo1.jpg" alt="Event Photo 1">
                                        <img src="photo2.jpg" alt="Event Photo 2">
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <img src="/ASSET/22.png" alt="Footer" class="footer">
                </div>

                <div class="page">
                    <img src="/ASSET/11.png" alt="Header" class="header">
                    
                    <div class="content">
                        <table>
                            <tr>
                                <th>Attendance Sheets</th>
                                <td>
                                    <div class="image-grid">
                                        <img src="attendance1.jpg" alt="Attendance Sheet 1">
                                        <img src="attendance2.jpg" alt="Attendance Sheet 2">
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <img src="/ASSET/22.png" alt="Footer" class="footer">
                </div>

                <a href="#" class="download-btn" onclick="window.print()">Download PDF</a>
            </body>
            </html>
        `;

        // Generate the HTML content
        const html = generateHTML(data);

        // Write the generated HTML to a file
        fs.writeFileSync('report.html', html, 'utf8');
        console.log('HTML report generated successfully');
    } catch (error) {
        console.error('Error generating report:', error);
    }
}

module.exports = run;
