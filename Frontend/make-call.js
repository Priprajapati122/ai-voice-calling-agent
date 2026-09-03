const phoneInput = document.getElementById("phoneNumber");
const startCallBtn = document.getElementById("startCallBtn");
const statusBox = document.getElementById("statusBox");
const statusMessage = document.getElementById("statusMessage");


phoneInput.addEventListener("input", () => {

    // Only numbers
    phoneInput.value =
        phoneInput.value.replace(/\D/g, "");

});


function showStatus(message, type = "") {

    statusBox.classList.add("show");

    statusMessage.textContent = message;

    statusMessage.className = "status-message";

    if (type) {
        statusMessage.classList.add(type);
    }
}

async function startCall() {

    const phoneNumber = phoneInput.value.trim();

    if (!phoneNumber) {
        showStatus(
            "Please enter a mobile number.",
            "error"
        );

        phoneInput.focus();
        return;
    }

    if (phoneNumber.length !== 10) {
        showStatus(
            "Please enter a valid 10 digit mobile number.",
            "error"
        );

        phoneInput.focus();
        return;
    }

    const fullNumber = "+91" + phoneNumber;

    showStatus(
        "Starting AI call...",
        ""
    );

    try {

        const response = await fetch(
            "http://localhost:5000/make-call",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    phone_number: fullNumber
                })
            }
        );

        const data = await response.json();

        if (response.ok) {

            showStatus(
                "Call started successfully. Please check your phone.",
                "success"
            );

            console.log(
                "Call response:",
                data
            );

        } else {

            showStatus(
                data.error || "Unable to start the call.",
                "error"
            );

            console.error(
                "Call error:",
                data
            );
        }

    } catch (error) {

        console.error(
            "Request error:",
            error
        );

        showStatus(
            "Cannot connect to the backend. Make sure Flask is running.",
            "error"
        );
    }
}
 

function logout() {

    localStorage.removeItem("voiceAgentLoggedIn");

    window.location.href = "login.html";
}