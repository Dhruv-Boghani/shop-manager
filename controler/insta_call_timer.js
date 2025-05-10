const cron = require("node-cron");
const axios = require("axios");

// Timezone for Singapore (UTC+8)
const TIMEZONE = "Asia/Singapore";

// Constants
const BASE_URL = "https://insta-uploader.onrender.com";
const UPLOAD_URL = `${BASE_URL}/upload`;
const MAX_CALLS = 6;
const INTERVAL_MS = 90 * 1000; // 1.5 minutes

// Weekdays
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Upload schedule per day (HH:mm format)
const uploadSchedule = {
  Sunday:    ["11:33", "16:00", "19:42", "23:15"],
  Monday:    ["11:15", "15:20", "19:10", "23:30"],
  Tuesday:   ["11:40", "15:50", "19:45", "23:00"],
  Wednesday: ["11:20", "15:40", "19:25", "23:40"],
  Thursday:  ["11:50", "16:10", "19:35", "22:50"],
  Friday:    ["11:25", "15:15", "19:05", "23:35"],
  Saturday:  ["12:45", "15:55", "19:30", "23:20"],
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

module.exports = startScheduler;
