const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

var serviceAccount = JSON.parse(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

db = admin.firestore();

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Middleware to check date and time
const checkFormOpen = (req, res, next) => {
  const currentTime = new Date();
  const closeTime = new Date("2024-08-14T09:30:00Z"); // 3 PM IST in UTC
  const isOpen = true//currentTime < closeTime
  if (!isOpen) {
    return res.status(403).json({ message: "Form submissions are now closed." });
  }
  next();
};

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 2, // Limit each IP to 2 requests per `window`
  message: "Too many requests from this IP, please try again after 10 minutes",
  statusCode: 429,
});
//app.use("/submit-form", limiter);

// Apply the form open check middleware to the form submission route
app.post("/submit-form", checkFormOpen, async (req, res) => {
  const {
    name,
    registrationNo,
    year,
    department,
    email,
    phone,
    domains, // Updated to handle domains instead of individual fields
  } = req.body;

  if (
    !name ||
    !registrationNo ||
    !year ||
    !department ||
    !email ||
    !phone ||
    !domains.length // Ensure at least one domain is selected
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const snapshot = await db
    .collection("recruitment")
    .where("email", "==", email)
    .get();

  if (!snapshot.empty) {
    return res.status(400).json({ message: "Email is already registered." });
  }

  const uuid = uuidv4();

  await db.collection("recruitment").doc(uuid).set({
    name,
    registrationNo,
    year,
    department,
    email,
    phone,
    domains, // Store the selected domains
  });

  const domainForms = {
    "AI/ML": "https://docs.google.com/forms/d/e/1FAIpQLSc0qVZ9FXQqN8yi3V7WFHSz41LOCmdOZ9JKyqO95N-UEmKuUA/viewform?usp=sf_link",
    "Web Dev": "https://forms.gle/xYYwbuPnm6ZJCHhi6",
    "App Dev": "https://forms.gle/oXieDZiehoK492jo7",
    "Creatives": "https://forms.gle/MezbLEtNouKSdpPk9",
    "Sponsorships": "https://forms.gle/qeAz4tTpAZ2aTksZA",
    "Corporate": "https://forms.gle/9hw52K9TvAa55iUd9",
    "Editorial": "https://docs.google.com/forms/d/e/1FAIpQLSfQ4eEU51giQUnwDc7e0CGBj_zMAMpgwvtZ3mGkik-UQq3IGQ/viewform",
  };
  
  
  let formLinksHtml = "<p>Here are the links to the forms for your selected domains:</p><ul>";
  domains.forEach((domain) => {
    if (domainForms[domain]) {
      formLinksHtml += `<li><a href="${domainForms[domain]}" target="_blank">${domain} Form</a></li>`;
    }
  });
  formLinksHtml += "</ul>";

  // Send email with Google Form links
  const mailOptions = {
    from: "Coding Ninjas Club SRM",
    to: email,
    subject: `Round 1 for Coding Ninjas Club SRM Recruitment`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="text-align: center; color: #333;">Hello ${name},</h2>
        <p style="text-align: center; color: #555;">Thank you for applying to be part of Coding Ninjas Club SRM. Please complete the following form(s) by <strong>13th September</strong> as this will be your Round 1 for the recruitment process:</p>
        ${formLinksHtml}
        <p style="text-align: center; color: #aaa;">Coding Ninjas Club SRM</p>
      </div>
    `,
  };
  
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,//process.env.GOOGLE_EMAIL,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error.message)
      return res.status(500).json({ message: "Error sending email. Please contact so8215@srmist.edu.in for issues." });
    }
    res.status(200).json({
      message:
        "You have been registered successfully. A confirmation email has been sent to you.",
    });
  });
});

app.set("trust proxy", 1);
app.get("/ip", (request, response) => response.send(request.ip));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
