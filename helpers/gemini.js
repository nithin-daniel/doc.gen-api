require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

let apiKey = process.env.GEMINI_API;
console.log('API Key:', apiKey);

// Replace with your actual API key
// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
    const prompt = `Please provide the following details for generating a README report: 
(Event/Program Name: Authentic Tech Master 
Date: 24 - 08 - 2024 
Time: 10:00 AM - 4:00 PM 
Organizing Department/Club/Cell: Inovus Labs IEDC 
Total Student Participants: 100 Students 
Total Faculty Participants: 0 (No faculty participants) 
Mode of Event (Online/Offline): Offline 
Faculty Coordinator: Roji Thomas 
Brief Event/Program Description: National Level Hackathon focused on software development. The event was highly successful, with participation from 100 students. 
Program Outcome: The hackathon provided an excellent opportunity to enhance students' skills in software technology. Additionally, it boosted their confidence in presenting their work.) 
Don't change the above format and also use professional sentences and make the program description and outcome more DESCRIPTIVE for that use some gap contents (Only give the proper result only).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    console.log(text);

    // Save the response to a Markdown file
    fs.writeFile('response.md', text, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log('Response saved to response.md');
        }
    });

    // Extract data from the text
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
        outcome: extractMultilineData(text, 'Program Outcome')
    };

    // Inject the data into the HTML template
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.eventName} - Event Report</title>
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
        </style>
    </head>
    <body>
        <div class="page">
            <img src="https://via.placeholder.com/800x100.png?text=Header" alt="Header" class="header">
            
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
            
            <img src="https://via.placeholder.com/800x100.png?text=Footer" alt="Footer" class="footer">
        </div>
    
        <div class="page">
            <img src="https://via.placeholder.com/800x100.png?text=Header" alt="Header" class="header">
            
            <div class="content">
                <table>
                    <tr>
                        <th>Event Description</th>
                        <td>
                            <p>${data.description}</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <img src="https://via.placeholder.com/800x100.png?text=Footer" alt="Footer" class="footer">
        </div>
    
        <div class="page">
            <img src="https://via.placeholder.com/800x100.png?text=Header" alt="Header" class="header">
            
            <div class="content">
                <table>
                    <tr>
                        <th>Program Outcome</th>
                        <td>
                            <p>${data.outcome}</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <img src="https://via.placeholder.com/800x100.png?text=Footer" alt="Footer" class="footer">
        </div>
    
        <a href="#" class="download-btn" onclick="window.print()">Download Report</a>
    </body>
    </html>
    `;

    // Save the HTML template to a file
    fs.writeFile('report.html', htmlTemplate, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log('HTML report saved to report.html');
        }
    });
}

run()
