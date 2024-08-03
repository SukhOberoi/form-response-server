const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const cors = require('cors');
require("dotenv").config();



var serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

db= admin.firestore()

// Initialize Express
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sukhoberoi24@gmail.com',
        pass: process.env.appPass
    }
});

// Endpoint to accept form responses
app.post('/submit-form', async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).send('Name and email are required.');
    }
    const snapshot = await db.collection('responses')
    .where('email', '==', email)
    .get();

if (!snapshot.empty) {
    return res.status(400).json({ message: 'Email is already registered.' });
}


    const uuid = uuidv4();

    await db.collection('responses').doc(uuid).set({ name, email });

    // Generate QR Code
    const qrCodePath = `./qrcodes/${uuid}.png`;
    await QRCode.toFile(qrCodePath, uuid);
    const qrCodeBase64 = fs.readFileSync(qrCodePath, { encoding: 'base64' });
    const event = "Campus Quest 3.0"
    // Send email with QR code
    const mailOptions = {
        from: 'your-email@gmail.com',
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
                cid: 'unique@nodemailer.com'
            }
        ]
    };


    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({message:'Error sending email.'});
        }
        fs.unlinkSync(qrCodePath); // Delete QR code file after sending email
        res.status(200).json({
            message: 'You have been registered successfully. This QR code has been emailed to you. Present this for entry at the venue.',
            qrCode: qrCodeBase64
        });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
