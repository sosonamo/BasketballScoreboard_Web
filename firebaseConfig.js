import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: process.env.APP_API_KEY,
    authDomain: process.env.APP_AUTH_DOMAIN,
    databaseURL: process.env.APP_FIREBASE_DATABASE_URL,
    projectId: process.env.APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.APP_FIREBASE_APP_ID,
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 다른 파일에서 쓸 수 있게 전역 변수로 등록하거나 export 합니다.
window.db = db;
window.dbRef = ref;
window.dbSet = set;
window.dbGet = get;
window.dbChild = child;
window.dbOnValue = onValue;

console.log("Firebase가 성공적으로 로드되었습니다.");
