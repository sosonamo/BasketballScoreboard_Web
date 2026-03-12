import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBnCVeGdWtZF0gsKWNi7kyTHIIuhARN-3I",
    authDomain: "basketball-scoreboard-fe190.firebaseapp.com",
    databaseURL: "https://basketball-scoreboard-fe190-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "basketball-scoreboard-fe190",
    storageBucket: "basketball-scoreboard-fe190.firebasestorage.app",
    messagingSenderId: "711030691576",
    appId: "1:711030691576:web:6530895dfed9cd66c14d0d",
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 다른 파일에서 쓸 수 있게 전역 변수로 등록하거나 export 합니다.
window.db = db;
window.dbRef = ref;
window.dbSet = set;
window.dbGet = get;
window.dbChild = child;

console.log("Firebase가 성공적으로 로드되었습니다.");
