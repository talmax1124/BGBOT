function fetchChannels(botId) {
    fetch(`/api/channels/${botId}`)
        .then(response => response.json())
        .then(channels => {
            const select = document.getElementById(`channel-select-${botId}`);
            select.innerHTML = ''; // Clear previous options

            if (!Array.isArray(channels)) {
                throw new Error("Invalid channel data format");
            }

            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = `#${channel.name}`;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching channels:', error);
            const select = document.getElementById(`channel-select-${botId}`);
            select.innerHTML = '<option disabled selected>Error loading channels</option>';
        });
}

function fetchAndRenderBotList() {
    const container = document.getElementById('bot-list');
    container.innerHTML = '🔎 Loading bots linked to your Discord servers...';

    fetch('/botlist')
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data.userBotsList)) {
                throw new Error("Invalid bot list data");
            }

            if (data.userBotsList.length === 0) {
                container.innerHTML = '<p>No bots available.</p>';
                return;
            }

            container.innerHTML = ''; // Clear loading message

            data.userBotsList.forEach(bot => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded shadow mb-4';

                const title = document.createElement('h2');
                title.className = 'text-xl font-bold mb-2';
                title.textContent = bot.name || 'Unnamed Bot';

                const commandList = document.createElement('ul');
                commandList.className = 'list-disc list-inside';

                if (Array.isArray(bot.commands)) {
                    bot.commands.forEach(cmd => {
                        const li = document.createElement('li');
                        li.textContent = cmd.name + (cmd.enabled ? ' ✅' : ' ❌');
                        commandList.appendChild(li);
                    });
                }

                card.appendChild(title);
                card.appendChild(commandList);

                // Channel selection functionality
                const select = document.createElement('select');
                select.id = `channel-select-${bot.clientId}`;
                select.className = 'bg-gray-200 rounded p-2 mb-2';
                select.innerHTML = '<option disabled selected>Select a channel</option>';

                card.appendChild(select);
                container.appendChild(card);

                // Fetch channels for this bot
                fetchChannels(bot.clientId);
            });

            // Store bots info in localStorage for session persistence
            localStorage.setItem('userBotsList', JSON.stringify(data.userBotsList));
        })
        .catch(error => {
            console.error('Error loading bots:', error);
            container.innerHTML = '<p>Error loading bots.</p>';
        });
}

// Call it when DOM is loaded
document.addEventListener('DOMContentLoaded', fetchAndRenderBotList);

// Modal logic for submitting FAQ
document.getElementById("faqButton").addEventListener("click", function() {
    document.getElementById("faqModal").classList.remove("hidden");
});

document.getElementById("closeModal").addEventListener("click", function() {
    document.getElementById("faqModal").classList.add("hidden");
});

document.getElementById("faqForm").addEventListener("submit", function(event) {
    event.preventDefault();
    
    const question = document.getElementById("question").value;
    const answer = document.getElementById("answer").value;
    const channel = document.getElementById("channel").value;
    
    if (!question || !answer || !channel) {
        alert("Please fill in all fields.");
        return;
    }
    
    // Submit the FAQ (you can send it to your server here)
    console.log("Submitted FAQ:", { question, answer, channel });
    
    // Close the modal
    document.getElementById("faqModal").classList.add("hidden");
});

// Encrypt data before storing
localStorage.setItem('userData', CryptoJS.AES.encrypt(JSON.stringify(userData), 'your-secret-key').toString());

// Decrypt when accessing it
const decryptedData = CryptoJS.AES.decrypt(localStorage.getItem('userData'), 'your-secret-key').toString(CryptoJS.enc.Utf8);
const userData = JSON.parse(decryptedData);
