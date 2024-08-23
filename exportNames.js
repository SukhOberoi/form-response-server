const admin = require("firebase-admin");
const fs = require("fs");
require("dotenv").config();

var serviceAccount = JSON.parse(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function exportScannedRecordsToJson() {
  try {
    const responsesRef = db.collection('responses');
    const snapshot = await responsesRef.where('is_scanned', '==', true).get();

    if (snapshot.empty) {
      console.log('No matching documents.');
      return;
    }

    const scannedRecords = [];
    snapshot.forEach(doc => {
      const { name, email } = doc.data();
      scannedRecords.push({ name, email });
    });

    // Write the data to a JSON file
    const filePath = './scannedRecords.json';
    fs.writeFileSync(filePath, JSON.stringify(scannedRecords, null, 2));

    console.log(`Scanned records exported successfully to ${filePath}`);
  } catch (error) {
    console.error('Error exporting scanned records:', error);
  }
}

exportScannedRecordsToJson();
