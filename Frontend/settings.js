const API_BASE_URL = "http://127.0.0.1:5000";


async function loadSettings() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/settings-data`
        );

        const data = await response.json();

        if (data.success && data.settings) {

            document.getElementById("email").value =
                data.settings.email || "admin@example.com";

        }

    } catch (error) {

        console.error("Settings load error:", error);

        document.getElementById("email").value =
            "admin@example.com";
    }
}


async function saveSettings() {

    const email =
        document.getElementById("email").value.trim();

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    if (!email) {

        alert("Please enter your email / login ID.");

        return;
    }


    if (newPassword || confirmPassword || currentPassword) {

        if (!currentPassword) {

            alert("Please enter your current password.");

            return;
        }


        if (!newPassword) {

            alert("Please enter a new password.");

            return;
        }


        if (newPassword !== confirmPassword) {

            alert("New passwords do not match.");

            return;
        }


        if (newPassword.length < 6) {

            alert("Password must contain at least 6 characters.");

            return;
        }
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/settings-data`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    email: email,

                    currentPassword: currentPassword,

                    newPassword: newPassword
                })
            }
        );


        const data = await response.json();


        if (data.success) {

            showSaveMessage("✓ Changes saved");

            document.getElementById(
                "currentPassword"
            ).value = "";

            document.getElementById(
                "newPassword"
            ).value = "";

            document.getElementById(
                "confirmPassword"
            ).value = "";

        } else {

            alert(
                data.message || "Unable to save changes."
            );
        }


    } catch (error) {

        console.error("Save settings error:", error);

        alert(
            "Unable to connect to the server."
        );
    }
}


function showSaveMessage(message) {

    const saveMessage =
        document.getElementById("saveMessage");

    saveMessage.textContent = message;

    saveMessage.style.display = "inline";


    setTimeout(() => {

        saveMessage.style.display = "none";

    }, 2500);
}


document.addEventListener(
    "DOMContentLoaded",
    loadSettings
);