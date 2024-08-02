// index.js
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Initialize Firebase
var serviceAccount = JSON.parse(${{ GOOGLE_APPLICATION_CREDENTIALS_JSON}})

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

db= admin.firestore()

// Initialize Express
const app = express();
app.use(bodyParser.json());

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sukhoberoi24@gmail.com',
        pass: 'stvx ogvr faur hlyq'
    }
});

// Endpoint to accept form responses
app.post('/submit-form', async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).send('Name and email are required.');
    }

    const uuid = uuidv4();

    await db.collection('responses').doc(uuid).set({ name, email });

    // Generate QR Code
    const qrCodePath = `./qrcodes/${uuid}.png`;
    await QRCode.toFile(qrCodePath, uuid);

    // Send email with QR code
    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Your QR Code',
        text: 'Here is your QR code.',
        attachments: [
            {
                filename: `${uuid}.png`,
                path: qrCodePath
            }
        ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send('Error sending email.');
        }
        fs.unlinkSync(qrCodePath); // Delete QR code file after sending email
        res.status(200).send('Form response received, data stored, and email sent.');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
