const cron = require("node-cron");
const axios = require("axios");

// Timezone for Singapore (UTC+8)
const TIMEZONE = "Asia/Kolkata";

// Constants
const BASE_URL = "https://echonights-07.onrender.com";
const UPLOAD_URL = `${BASE_URL}/upload`;
const MAX_CALLS = 6;
const INTERVAL_MS = 90 * 1000; // 1.5 minutes

// Weekdays
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Upload schedule per day (HH:mm format)
const uploadSchedule = {
  Sunday:    ["07:45", "09:30", "11:00", "13:15", "15:45", "18:00", "20:10", "22:00"],
  Monday:    ["08:20", "10:40", "13:00", "15:15", "17:30", "19:45", "21:50"],
  Tuesday:   ["07:30", "09:15", "11:30", "13:50", "16:00", "18:10", "20:20", "22:15"],
  Wednesday: ["08:00", "10:10", "12:25", "14:40", "17:00", "19:20", "21:35", "23:00"],
  Thursday:  ["07:50", "09:45", "11:30", "13:15", "15:00", "17:10", "19:00", "21:10"],
  Friday:    ["08:10", "10:30", "12:00", "14:20", "16:40", "18:00", "20:15", "22:30"],
  Saturday:  ["07:30", "09:00", "11:15", "13:45", "16:10", "18:30", "20:50"]
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
function echonights__07__() {
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


module.exports = { echonights__07__ };
