const cron = require("node-cron");
const axios = require("axios");

// Timezone for Singapore (UTC+8)
const TIMEZONE = "Asia/Kolkata";

// Constants
const BASE_URL = "https://cartoon-07kk.onrender.com";
const UPLOAD_URL = `${BASE_URL}/upload`;
const MAX_CALLS = 6;
const INTERVAL_MS = 90 * 1000; // 1.5 minutes

// Weekdays
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Upload schedule per day (HH:mm format)
const uploadSchedule = {
    Sunday: ["07:10", "16:00"],
    Monday: ["06:50", "20:20"],
    Tuesday: ["08:05", "17:30"],
    Wednesday: ["07:30", "21:15"],
    Thursday: ["07:45", "17:00"],
    Friday: ["06:55", "20:00"],
    Saturday: ["07:25", "16:50"]
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
function cartoon() {
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


module.exports = { cartoon };
