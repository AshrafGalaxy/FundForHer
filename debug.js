require('dotenv').config({path: '.env.local'});
const admin = require('firebase-admin');

try {
  console.log("PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log("EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
  console.log("KEY_EXISTS:", !!process.env.FIREBASE_PRIVATE_KEY);
  
  if (process.env.FIREBASE_PRIVATE_KEY) {
      console.log("KEY HEAD:", process.env.FIREBASE_PRIVATE_KEY.substring(0, 30));
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '') : undefined
    })
  });
  
  admin.firestore().collection('scholarships').limit(1).get()
    .then(() => { console.log('DB SUCCESS'); process.exit(0); })
    .catch(e => { console.log('DB ERROR:', e.message); process.exit(1); });

} catch (e) {
  console.log('INIT ERROR:', e.message);
  process.exit(1);
}
