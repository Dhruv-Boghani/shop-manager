const cron = require("node-cron");
const axios = require("axios");

// Timezone for Singapore (UTC+8)
const TIMEZONE = "Asia/Kolkata";

// Constants
const BASE_URL = "https://motivat-hindi.onrender.com";
const UPLOAD_URL = `${BASE_URL}/upload`;
const MAX_CALLS = 6;
const INTERVAL_MS = 90 * 1000; // 1.5 minutes

// Weekdays
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Upload schedule per day (HH:mm format)
const uploadSchedule = {
    Sunday: ["08:00", "12:30", "17:00"],
    Monday: ["07:00", "11:00", "15:30", "20:10"],
    Tuesday: ["08:10", "13:00", "18:00"],
    Wednesday: ["06:45", "11:30", "16:00", "21:00"],
    Thursday: ["07:20", "11:15", "15:40"],
    Friday: ["08:00", "13:30", "19:00"],
    Saturday: ["07:10", "12:00", "16:30", "21:20"]
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
function motivate_hindi() {
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


module.exports = { motivate_hindi };
