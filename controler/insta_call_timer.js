const cron = require("node-cron");
const axios = require("axios");

// Timezone for Singapore (UTC+8)
const TIMEZONE = "Asia/Kolkata";

// Constants
const BASE_URL = "https://insta-uploader.onrender.com";
const UPLOAD_URL = `${BASE_URL}/upload`;
const MAX_CALLS = 6;
const INTERVAL_MS = 90 * 1000; // 1.5 minutes

// Weekdays
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Upload schedule per day (HH:mm format)
const uploadSchedule = {
  Sunday:    ["09:00", "11:00", "13:25", "15:30", "17:00", "19:10", "21:15"], // 7 reels - relaxed day, high activity
  Monday:    ["08:45", "12:50", "16:40", "19:15", "21:00"],          // 5 reels - work day, evening peaks
  Tuesday:   ["09:10", "13:20", "17:15", "19:40", "21:30"],          // 5 reels - light lunch + evening
  Wednesday: ["08:50", "13:10", "16:55", "18:30", "20:30", "22:00"], // 6 reels - midweek surge
  Thursday:  ["09:20", "13:40", "17:05", "19:20", "21:20"],          // 5 reels - pre-weekend push
  Friday:    ["08:55", "12:45", "16:35", "18:50", "20:30", "21:50"], // 6 reels - Friday night spike
  Saturday:  ["08:30", "10:00", "13:00", "17:00", "19:30", "21:45"], // 6 reels - weekend max
};

// Store references to active cron jobs
let activeJobs = [];

// Function to clear previous cron jobs
function clearPreviousJobs() {
  activeJobs.forEach(job => job.stop());
  activeJobs = [];
}

// Ping function: calls BASE_URL 6 times, then /upload once
function startPingAndUploadFlow() {
  let callCount = 0;

  const pingBaseURL = async () => {
    try {
      console.log(`[${new Date().toLocaleTimeString()}] Pinging base URL... (${callCount + 1})`);
      await axios.get(BASE_URL);
      callCount++;

      if (callCount >= MAX_CALLS) {
        clearInterval(pingInterval);
        console.log("✅ All base pings complete. Waiting 1 minute to call /upload...");

        setTimeout(async () => {
          try {
            console.log(`[${new Date().toLocaleTimeString()}] Calling /upload...`);
            await axios.get(UPLOAD_URL);
            console.log("✅ /upload call complete.");
          } catch (err) {
            console.error("❌ Error calling /upload:", err.message);
          }
        }, 60 * 1000);
      }
    } catch (err) {
      console.error("❌ Error pinging base URL:", err.message);
    }
  };

  // Start interval and immediate call
  const pingInterval = setInterval(pingBaseURL, INTERVAL_MS);
  pingBaseURL();
}

// Main exported function
function startScheduler() {
  console.log("🚀 Scheduler initialized. Will set upload tasks daily at 6 AM Singapore time.");

  // 6:00 AM daily scheduler
  cron.schedule('0 6 * * *', () => {
    const todayIndex = new Date().getDay();
    const todayName = weekDays[todayIndex];
    const times = uploadSchedule[todayName];

    console.log(`📅 ${todayName} - Setting upload times for: ${times.join(", ")}`);
    clearPreviousJobs();

    // Schedule today's uploads
    times.forEach(time => {
      const [hour, minute] = time.split(":");
      const job = cron.schedule(`${minute} ${hour} * * *`, startPingAndUploadFlow, {
        timezone: TIMEZONE,
      });
      activeJobs.push(job);
    });
  }, {
    timezone: TIMEZONE
  });
}

module.exports = { startScheduler };
