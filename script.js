async function fetchProfiles() {
    const usernames = document.getElementById('usernames').value
        .split('\n')
        .map(username => username.trim())
        .filter(username => username.length > 0);

    if (usernames.length === 0) {
        alert('Please enter at least one username');
        return;
    }

    const resultDiv = document.getElementById('result');
    resultDiv.textContent = 'Fetching profiles...';

    try {
        const response = await fetch('fetch_profiles.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usernames })
        });

        const data = await response.json();
        resultDiv.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        resultDiv.textContent = 'Error fetching profiles: ' + error.message;
    }
} 