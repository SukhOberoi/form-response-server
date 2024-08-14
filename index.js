const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");
const fs = require("fs");
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
  const closeTime = new Date('2024-08-14T09:30:00Z'); // 3 PM IST in UTC

  if (currentTime > closeTime) {
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
app.use("/submit-form", limiter);

// Apply the form open check middleware to the form submission route
app.post("/submit-form", checkFormOpen, async (req, res) => {
  const {
    name,
    registrationNo,
    year,
    department,
    email,
    phone,
    whatsapp,
    hackerrankId,
  } = req.body;

  if (
    !name ||
    !registrationNo ||
    !year ||
    !department ||
    !email ||
    !phone ||
    !whatsapp ||
    !hackerrankId
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const snapshot = await db
    .collection("responses")
    .where("email", "==", email)
    .get();

  if (!snapshot.empty) {
    return res.status(400).json({ message: "Email is already registered." });
  }

  const uuid = uuidv4();

  await db.collection("responses").doc(uuid).set({
    name,
    registrationNo,
    year,
    department,
    email,
    phone,
    whatsapp,
    hackerrankId,
  });

  // Generate QR Code
  const qrCodePath = `./qrcodes/${uuid}.png`;
  await QRCode.toFile(qrCodePath, uuid);
  const qrCodeBase64 = fs.readFileSync(qrCodePath, { encoding: "base64" });
  const event = "Campus Quest Epilogue: Code, Compete, Excel";
  // Send email with QR code
  const mailOptions = {
    from: "your-email@gmail.com",
    to: email,
    subject: `Your Entry Pass for ${event}`,
    html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                  <h2 style="text-align: center; color: #333;">Hello ${name},</h2>
                  <p style="text-align: center; color: #555;">Thank you for registering for ${event}. Here is your QR code:</p>
                  <div style="text-align: center; margin: 20px 0;">
                      <img src="cid:unique@nodemailer.com" alt="QR Code" style="width: 200px; height: 200px;"/>
                  </div>
                  <p style="text-align: center; color: #555;">Present the QR Code while entering the venue</p>
                  <p style="text-align: center; color: #aaa;">Coding Ninjas Club SRM</p>
              </div>
          `,
    attachments: [
      {
        filename: `${uuid}.png`,
        path: qrCodePath,
        cid: "unique@nodemailer.com",
      },
    ],
  };
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "codingninjasatsrm@gmail.com",
      pass: process.env.appPass,
    },
  });
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: "Error sending email." });
    }
    fs.unlinkSync(qrCodePath); // Delete QR code file after sending email
    res.status(200).json({
      message:
        "You have been registered successfully. This QR code has been emailed to you. Present this for entry at the venue.",
      qrCode: qrCodeBase64,
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
