const API_BASE_URL = "/api";

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    setGreeting();
});


function setGreeting() {

    const hour = new Date().getHours();

    let greeting = "Good Evening";

    if (hour < 12) {
        greeting = "Good Morning";
    } else if (hour < 18) {
        greeting = "Good Afternoon";
    }

    document.getElementById("greeting").textContent =
        `${greeting}, Admin`;
}


async function loadDashboard() {

    try {

        const response = await fetch(`${API_BASE_URL}/calls`);

        if (!response.ok) {
            throw new Error("Failed to fetch calls");
        }

        const calls = await response.json();

        updateStatistics(calls);
        displayRecentCalls(calls);

    } catch (error) {

        console.error("Dashboard Error:", error);

        document.getElementById("recentCallsContainer").innerHTML = `
            <div class="empty-state">
                Unable to load call history.
            </div>
        `;
    }
}


function updateStatistics(calls) {

    const totalCalls = calls.length;

    const completedCalls = calls.filter(
        call => call.status === "completed"
    ).length;

    const failedCalls = calls.filter(
        call =>
            call.status === "failed" ||
            call.status === "busy" ||
            call.status === "no-answer" ||
            call.status === "canceled"
    ).length;

    const totalSeconds = calls.reduce(
        (total, call) => total + Number(call.duration || 0),
        0
    );

    const totalMinutes = Math.floor(totalSeconds / 60);

    document.getElementById("totalCalls").textContent =
        totalCalls;

    document.getElementById("completedCalls").textContent =
        completedCalls;

    document.getElementById("failedCalls").textContent =
        failedCalls;

    document.getElementById("totalDuration").textContent =
        `${totalMinutes}m`;
}


function displayRecentCalls(calls) {

    const container =
        document.getElementById("recentCallsContainer");

    if (!calls || calls.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No calls have been made yet.
            </div>
        `;

        return;
    }

    const recentCalls = calls.slice(0, 6);

    let tableHTML = `
        <table class="calls-table">

            <thead>
                <tr>
                    <th>PHONE NUMBER</th>
                    <th>STATUS</th>
                    <th>DURATION</th>
                    <th>RECORDING</th>
                    <th>TRANSCRIPT</th>
                    <th>DATE</th>
                </tr>
            </thead>

            <tbody>
    `;

    recentCalls.forEach(call => {

        const status = call.status || "unknown";

        const duration =
            formatDuration(call.duration);

        const date =
            formatDate(call.created_at);


        // Recording
        // Recording
let recordingHTML = `<span style="color:#667085;">Not available</span>`;

if (call.recording_url) {

    recordingHTML = `
        <audio
            controls
            preload="none"
            style="width:180px; height:35px;"
            src="${API_BASE_URL}/recording/${call.id}">
        </audio>
    `;
}


        // Transcript
        let transcriptHTML =
            `<span style="color:#667085;">Not available</span>`;

        if (call.transcript) {

            const transcript =
                escapeHTML(call.transcript);

            const shortTranscript =
                transcript.length > 80
                    ? transcript.substring(0, 80) + "..."
                    : transcript;

            transcriptHTML = `
                <span
                    title="${transcript}"
                    style="
                        display:inline-block;
                        max-width:220px;
                        color:#b9c1cf;
                        cursor:pointer;
                    "
                >
                    ${shortTranscript}
                </span>
            `;
        }


        tableHTML += `
            <tr>

                <td>
                    <span class="phone-number">
                        ${escapeHTML(call.phone_number || "-")}
                    </span>
                </td>

                <td>
                    <span class="status ${status}">
                        ${status}
                    </span>
                </td>

                <td>
                    ${duration}
                </td>

                <td>
                    ${recordingHTML}
                </td>

                <td>
                    ${transcriptHTML}
                </td>

                <td>
                    ${date}
                </td>

            </tr>
        `;
    });


    tableHTML += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}


function formatDuration(seconds) {

    seconds = Number(seconds || 0);

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;


    if (minutes === 0) {
        return `${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}


function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function logout() {

    localStorage.removeItem("voiceAgentLoggedIn");

    window.location.href = "login.html";
}