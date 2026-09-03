const API_BASE_URL = "/api";

let callsData = [];


document.addEventListener("DOMContentLoaded", () => {

    loadCalls();

    document
        .getElementById("searchInput")
        .addEventListener("input", filterCalls);

    document
        .getElementById("statusFilter")
        .addEventListener("change", filterCalls);

});


/* LOAD CALLS */

async function loadCalls() {

    const tableBody =
        document.getElementById("callsTableBody");

    try {

        const response =
            await fetch(`${API_BASE_URL}/calls`);

        if (!response.ok) {
            throw new Error("Unable to load call history");
        }

        callsData =
            await response.json();

        displayCalls(callsData);

    } catch (error) {

        console.error("Call History Error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        Unable to load call history.
                        <br><br>
                        Make sure Flask backend is running.
                    </div>
                </td>
            </tr>
        `;
    }
}


/* DISPLAY CALLS */

function displayCalls(calls) {

    const tableBody =
        document.getElementById("callsTableBody");


    if (!calls || calls.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        No calls found.
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML = calls.map(call => {

        const status =
            call.status || "unknown";

        const duration =
            formatDuration(call.duration);

        const date =
            formatDate(call.created_at);


        let recordingHTML =
            `<span class="not-available">Not available</span>`;


        if (call.recording_url) {

    recordingHTML = `
        <button
            class="recording-btn"
            onclick="openRecording(${call.id})"
        >
            ▶ Play
        </button>
    `;
}


        return `
            <tr>

                <td>
                    <span class="phone-number">
                        ${escapeHTML(call.phone_number || "-")}
                    </span>
                </td>

                <td>
                    <span class="status ${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>
                    ${duration}
                </td>

                <td>
                    ${date}
                </td>

                <td>
                    ${recordingHTML}
                </td>

                <td>
                    <button
                        class="view-btn"
                        onclick="viewCall(${call.id})"
                    >
                        View Details
                    </button>
                </td>

            </tr>
        `;

    }).join("");
}


/* SEARCH + STATUS FILTER */

function filterCalls() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase()
            .trim();


    const status =
        document
            .getElementById("statusFilter")
            .value;


    const filtered =
        callsData.filter(call => {

            const phone =
                String(call.phone_number || "")
                    .toLowerCase();

            const sid =
                String(call.call_sid || "")
                    .toLowerCase();

            const matchesSearch =
                !search ||
                phone.includes(search) ||
                sid.includes(search);


            const matchesStatus =
                status === "all" ||
                call.status === status;


            return matchesSearch && matchesStatus;

        });


    displayCalls(filtered);
}


/* VIEW CALL */

async function viewCall(callId) {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/calls/${callId}`
            );


        if (!response.ok) {
            throw new Error("Unable to load call details");
        }


        const call =
            await response.json();


        populateCallDetails(call);

        document
            .getElementById("detailsModal")
            .classList.add("show");


    } catch (error) {

        console.error(error);

        alert(
            "Unable to load call details."
        );
    }
}


/* POPULATE MODAL */

function populateCallDetails(call) {

    document.getElementById("modalCallSid").textContent =
        call.call_sid || "Call details";


    document.getElementById("detailPhone").textContent =
        call.phone_number || "-";


    document.getElementById("detailStatus").textContent =
        call.status || "-";


    document.getElementById("detailDuration").textContent =
        formatDuration(call.duration);


    document.getElementById("detailDate").textContent =
        formatDate(call.created_at);


    /* RECORDING */

    const recordingContainer =
        document.getElementById("detailRecording");


   if (call.recording_url) {

    recordingContainer.innerHTML = `
        <audio
            controls
            preload="metadata"
            src="${API_BASE_URL}/recording/${call.id}"
        ></audio>
    `;

} else {

        recordingContainer.innerHTML = `
            <div class="not-available-box">
                Recording not available yet.
            </div>
        `;
    }


    /* TRANSCRIPT */

    const transcript =
        document.getElementById("detailTranscript");


    if (call.transcript) {

        transcript.textContent =
            call.transcript;

    } else {

        transcript.textContent =
            "Transcript not available yet.";
    }


    /* SUMMARY */

    const summary =
        document.getElementById("detailSummary");


    if (call.summary) {

        summary.textContent =
            call.summary;

    } else {

        summary.textContent =
            "Summary not available yet.";
    }
}


/* RECORDING */

function openRecording(callId) {

    const recordingUrl =
        `${API_BASE_URL}/recording/${callId}`;

    window.open(
        recordingUrl,
        "_blank"
    );
}


/* CLOSE MODAL */

function closeDetails() {

    document
        .getElementById("detailsModal")
        .classList.remove("show");
}


/* CLOSE ON OUTSIDE CLICK */

document
    .getElementById("detailsModal")
    .addEventListener(
        "click",
        function(event) {

            if (event.target === this) {
                closeDetails();
            }

        }
    );


/* FORMAT DURATION */

function formatDuration(seconds) {

    seconds =
        Number(seconds || 0);


    const minutes =
        Math.floor(seconds / 60);


    const remainingSeconds =
        seconds % 60;


    if (minutes === 0) {

        return `${remainingSeconds}s`;

    }


    return `${minutes}m ${remainingSeconds}s`;
}


/* FORMAT DATE */

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(dateString);


    if (isNaN(date.getTime())) {
        return dateString;
    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* HTML ESCAPE */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ATTRIBUTE ESCAPE */

function escapeAttribute(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/* LOGOUT */

function logout() {

    localStorage.removeItem(
        "voiceAgentLoggedIn"
    );

    window.location.href =
        "login.html";
}