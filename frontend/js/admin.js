document.addEventListener("DOMContentLoaded", async function () {
    const statsTable = document.getElementById("stats-table");
    const statsBody = document.getElementById("stats-body");
    const statusMessage = document.getElementById("status-message");

    // Get logged-in admin email from sessionStorage (set this after login)
    const adminEmail = sessionStorage.getItem("email");

    if (!adminEmail) {
        statusMessage.textContent = "Unauthorized. Please log in as admin.";
        return;
    }

    try {
        // Fetch API stats from backend
        const response = await fetch(`https://agautam-27-ai-attendance-system-term-3fnn.onrender.com/admin/stats?email=${adminEmail}`);
        const data = await response.json();

        if (!response.ok) {
            statusMessage.textContent = data.message || "Failed to fetch stats.";
            return;
        }

        // Populate table with users' API usage
        data.users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.apiCount}</td>
            `;
            statsBody.appendChild(row);
        });

        statsTable.style.display = "table"; // Show the table once populated
    } catch (error) {
        statusMessage.textContent = "Error fetching data.";
        console.error("Fetch error:", error);
    }
});
