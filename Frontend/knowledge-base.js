const API_BASE_URL = "http://localhost:5000";

let knowledgeData = [];


document.addEventListener("DOMContentLoaded", () => {

    loadKnowledge();

    document
        .getElementById("searchInput")
        .addEventListener("input", filterKnowledge);

    document
        .getElementById("categoryFilter")
        .addEventListener("change", filterKnowledge);

    document
        .getElementById("knowledgeForm")
        .addEventListener("submit", addKnowledge);

});


/* LOAD KNOWLEDGE */

async function loadKnowledge() {

    const grid =
        document.getElementById("knowledgeGrid");

    try {

        const response =
            await fetch(`${API_BASE_URL}/knowledge-base`);

        if (!response.ok) {
            throw new Error("Unable to load knowledge base");
        }

        knowledgeData =
            await response.json();

        populateCategories();

        displayKnowledge(knowledgeData);

    } catch (error) {

        console.error(error);

        grid.innerHTML = `
            <div class="empty-state">
                Unable to load knowledge base.
                <br><br>
                Make sure Flask backend is running.
            </div>
        `;
    }
}


/* CATEGORY FILTER */

function populateCategories() {

    const filter =
        document.getElementById("categoryFilter");

    const categories = [
        ...new Set(
            knowledgeData
                .map(item => item.category)
                .filter(category => category)
        )
    ];

    filter.innerHTML = `
        <option value="all">All Categories</option>
    `;

    categories.forEach(category => {

        const option =
            document.createElement("option");

        option.value = category;
        option.textContent = category;

        filter.appendChild(option);

    });
}


/* DISPLAY */

function displayKnowledge(data) {

    const grid =
        document.getElementById("knowledgeGrid");


    if (!data || data.length === 0) {

        grid.innerHTML = `
            <div class="empty-state">
                No knowledge found.
            </div>
        `;

        return;
    }


    grid.innerHTML = data.map(item => {

        const title =
            escapeHTML(item.title || "Untitled");

        const category =
            escapeHTML(item.category || "General");

        const content =
            escapeHTML(item.content || "");

        const date =
            formatDate(item.updated_at || item.created_at);


        return `
            <div class="knowledge-card">

                <div class="knowledge-top">

                    <div>

                        <h3 class="knowledge-title">
                            ${title}
                        </h3>

                        <span class="category-badge">
                            ${category}
                        </span>

                    </div>

                </div>


                <div class="knowledge-content">
                    ${content}
                </div>


                <div class="knowledge-footer">

                    <span class="knowledge-date">
                        Updated ${date}
                    </span>

                    <button
                        class="delete-btn"
                        onclick="deleteKnowledge(${item.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>
        `;

    }).join("");
}


/* SEARCH + FILTER */

function filterKnowledge() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase()
            .trim();


    const category =
        document
            .getElementById("categoryFilter")
            .value;


    const filtered =
        knowledgeData.filter(item => {

            const matchesSearch =
                !search ||
                (item.title || "")
                    .toLowerCase()
                    .includes(search) ||
                (item.content || "")
                    .toLowerCase()
                    .includes(search) ||
                (item.category || "")
                    .toLowerCase()
                    .includes(search);


            const matchesCategory =
                category === "all" ||
                item.category === category;


            return matchesSearch && matchesCategory;

        });


    displayKnowledge(filtered);
}


/* ADD KNOWLEDGE */

async function addKnowledge(event) {

    event.preventDefault();


    const title =
        document
            .getElementById("title")
            .value
            .trim();

    const category =
        document
            .getElementById("category")
            .value
            .trim();

    const content =
        document
            .getElementById("content")
            .value
            .trim();


    const message =
        document.getElementById("formMessage");


    if (!title || !content) {

        message.textContent =
            "Title and content are required.";

        message.className =
            "form-message error";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/knowledge-base`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        title,
                        category,
                        content
                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Unable to add knowledge"
            );

        }


        message.textContent =
            "Knowledge added successfully.";

        message.className =
            "form-message success";


        document
            .getElementById("knowledgeForm")
            .reset();


        await loadKnowledge();


        setTimeout(() => {
            closeModal();
        }, 700);


    } catch (error) {

        console.error(error);

        message.textContent =
            error.message;

        message.className =
            "form-message error";
    }
}


/* DELETE */

async function deleteKnowledge(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this knowledge?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/knowledge-base/${id}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Unable to delete knowledge"
            );

        }


        await loadKnowledge();


    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete knowledge."
        );
    }
}


/* MODAL */

function openModal() {

    document
        .getElementById("modalOverlay")
        .classList.add("show");

    document
        .getElementById("title")
        .focus();
}


function closeModal() {

    document
        .getElementById("modalOverlay")
        .classList.remove("show");

    document
        .getElementById("knowledgeForm")
        .reset();

    const message =
        document.getElementById("formMessage");

    message.textContent = "";

    message.className =
        "form-message";
}


/* CLOSE WHEN CLICKING OUTSIDE */

document
    .getElementById("modalOverlay")
    .addEventListener("click", function(event) {

        if (event.target === this) {
            closeModal();
        }

    });


/* DATE */

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(dateString);


    if (isNaN(date.getTime())) {
        return dateString;
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* SECURITY */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* LOGOUT */

function logout() {

    localStorage.removeItem(
        "voiceAgentLoggedIn"
    );

    window.location.href =
        "login.html";
}