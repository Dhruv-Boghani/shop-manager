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
  Sunday:    ["08:15", "11:45", "15:30", "19:00", "21:30"],
  Monday:    ["07:30", "10:00", "13:00", "17:10", "20:20"],
  Tuesday:   ["08:00", "11:10", "14:15", "18:45", "21:00"],
  Wednesday: ["07:50", "10:45", "13:20", "16:30"],
  Thursday:  ["08:20", "11:30", "14:45", "17:15", "20:45", "22:00"],
  Friday:    ["08:05", "11:00", "13:50", "16:40", "20:30"],
  Saturday:  ["07:40", "10:20", "12:50", "16:00", "19:30"]
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
function kanishka__07__() {
  console.log("🚀 Scheduler initialized. Will set upload tasks daily at 6 AM India time.");

  // Function to schedule today's tasks
  const scheduleTodayUploads = () => {
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
  };

  // Run once immediately on startup
  scheduleTodayUploads();

  // Then run daily at 6 AM
  cron.schedule('0 6 * * *', scheduleTodayUploads, {
    timezone: TIMEZONE
  });
}


module.exports = { kanishka__07__ };
