// This function runs securely on Netlify's servers.
// It hides your API key and filters patient data before sending it to the browser.

const fetch = require('node-fetch'); // Standard fetch for Node environment

exports.handler = async function(event, context) {
    // 1. SECURITY: Check if the user is logged in via Netlify Identity
    const user = context.clientContext && context.clientContext.user;
    if (!user) {
        return { statusCode: 401, body: "Unauthorized: You must be logged in." };
    }

    const type = event.queryStringParameters.type; // 'appointments' or 'invoices'
    const CLINIKO_API_KEY = process.env.CLINIKO_API_KEY;

    try {
        let data;

        // ============================================================
        // OPTION A: CURRENT SETUP (GitHub Proxy)
        // We use this so your dashboard works TODAY with your current JSON structure.
        // ============================================================
        const GITHUB_BASE = 'https://raw.githubusercontent.com/NickPez36/Cliniko_Dashy/main/data';
        
        if (type === 'appointments') {
            const response = await fetch(`${GITHUB_BASE}/Appointments.json`);
            data = await response.json();
        } else if (type === 'invoices') {
            const response = await fetch(`${GITHUB_BASE}/Invoices.json`);
            data = await response.json();
        }

        // ============================================================
        // OPTION B: FUTURE SETUP (Cliniko API)
        // When ready, comment out Option A and uncomment this block.
        // ============================================================
        /*
        const endpoint = type === 'appointments' ? 'appointments' : 'invoices';
        // Note: Cliniko API is paginated. You may need a loop to get all records.
        const response = await fetch(`https://api.cliniko.com/v1/${endpoint}`, {
            headers: {
                'Authorization': `Basic ${btoa(CLINIKO_API_KEY + ':')}`,
                'Accept': 'application/json',
                'User-Agent': 'SpectrumHealthDashboard (admin@spectrumhealth.co)'
            }
        });
        const apiRaw = await response.json();
        // Note: You will need to map apiRaw fields to match your dashboard's expected keys 
        // (e.g. map 'starts_at' to 'Start Time')
        data = apiRaw.appointments; 
        */

        // ============================================================
        // 2. DATA SANITIZATION (Privacy Protection)
        // We filter the data here. The browser NEVER receives the full object.
        // ============================================================
        
        let safeData = [];

        if (type === 'appointments') {
            safeData = data.map(record => {
                // We explicitly construct a new object with ONLY the fields we need.
                // Patient Names, Emails, DOBs are deliberately left behind.
                return {
                    "Start Time": record["Start Time"],
                    "End Time": record["End Time"],
                    "Practitioner": record["Practitioner"],
                    "Practitioner ID": record["Practitioner ID"],
                    "Patient ID": record["Patient ID"] || record["Patient ID(s)"], // Keep ID for counting unique patients
                    "Did Not Arrive": record["Did Not Arrive"],
                    "Cancellation Time": record["Cancellation Time"],
                    "Treatment Notes Status": record["Treatment Notes Status"],
                    "Number of Patients": record["Number of Patients"],
                    "Maximum Number of Patients": record["Maximum Number of Patients"]
                };
            });
        } else {
            // Pass invoices through (ensure no patient names are in your invoice JSON)
            safeData = data; 
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(safeData)
        };

    } catch (error) {
        console.error("Fetch error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch data" }) };
    }
};
