const cron = require("node-cron");
const axios = require("axios");

// Timezone for Singapore (UTC+8)
const TIMEZONE = "Asia/Kolkata";

// Constants
const BASE_URL = "https://ai-king.onrender.com";
const UPLOAD_URL = `${BASE_URL}/upload`;
const MAX_CALLS = 6;
const INTERVAL_MS = 90 * 1000; // 1.5 minutes

// Weekdays
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Upload schedule per day (HH:mm format)
const uploadSchedule = {
    Sunday: ["06:40", "11:00", "15:45", "20:40"],
    Monday: ["08:10", "13:10", "18:00"],
    Tuesday: ["07:20", "11:30", "16:00", "21:00"],
    Wednesday: ["07:50", "12:30", "18:10"],
    Thursday: ["07:00", "11:20", "15:30", "20:30"],
    Friday: ["08:00", "12:45", "17:30"],
    Saturday: ["07:40", "11:50", "16:15", "21:10"]
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
function ai_king() {
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


module.exports = { ai_king };
