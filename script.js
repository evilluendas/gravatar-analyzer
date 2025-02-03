let profileData = null; // Store the fetched data globally
let fetchStats = {
    startTime: null,
    endTime: null,
    profilesChecked: 0,
    apiCalls: 0
};

function toggleDropdown() {
    document.getElementById("downloadDropdown").classList.toggle("show");
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    if (!event.target.matches('#downloadBtn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let dropdown of dropdowns) {
            if (dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
    }
}

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
    const statsDiv = document.getElementById('stats');
    resultDiv.textContent = `Fetching profiles... (0 of ${usernames.length})`;
    document.getElementById('downloadBtn').style.display = 'none';
    statsDiv.textContent = '';

    // Reset and start stats
    fetchStats = {
        startTime: new Date(),
        endTime: null,
        profilesChecked: usernames.length,
        apiCalls: usernames.length
    };

    try {
        // Split usernames into smaller chunks to show progress
        const CHUNK_SIZE = 5;
        const chunks = [];
        for (let i = 0; i < usernames.length; i += CHUNK_SIZE) {
            chunks.push(usernames.slice(i, i + CHUNK_SIZE));
        }

        let results = {};
        let processed = 0;

        // Process chunks sequentially
        for (const chunk of chunks) {
            const response = await fetch('fetch_profiles.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usernames: chunk })
            });

            const chunkData = await response.json();
            results = { ...results, ...chunkData };
            
            processed += chunk.length;
            resultDiv.textContent = `Fetching profiles... (${processed} of ${usernames.length})`;
        }

        profileData = results;
        fetchStats.endTime = new Date();
        
        // Update UI
        resultDiv.textContent = JSON.stringify(profileData, null, 2);
        document.getElementById('downloadBtn').style.display = 'inline-block';
        
        // Calculate and display stats
        const processingTime = (fetchStats.endTime - fetchStats.startTime) / 1000;
        statsDiv.textContent = `${fetchStats.profilesChecked} profiles checked • ${fetchStats.apiCalls} API calls • ${processingTime.toFixed(1)} seconds`;
    } catch (error) {
        resultDiv.textContent = 'Error fetching profiles: ' + error.message;
        statsDiv.textContent = '';
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} - ${hours}:${minutes}`;
}

function hasNonEmptyValues(obj) {
    if (!obj) return false;
    // For arrays of objects
    if (Array.isArray(obj)) {
        return obj.some(item => hasNonEmptyValues(item));
    }
    // For objects
    if (typeof obj === 'object') {
        return Object.values(obj).some(value => 
            value !== null && 
            value !== undefined && 
            value !== '' &&
            value !== false &&
            (typeof value !== 'object' || hasNonEmptyValues(value))
        );
    }
    // For primitive values
    return true;
}

function downloadAsCsv(includeHeaders = true) {
    if (!profileData) return;

    // Define CSV headers
    const headers = [
        'Gravatar username',
        'Profile URL',
        'Display name',
        "It's public",
        'Custom name',
        'About',
        'Verified accounts',
        'Links',
        'Custom design',
        'Header image',
        'Photos',
        'Interests',
        'Contact info',
        'Send money',
        'Custom domain',
        'Last edit',
        'Registration date'
    ];

    // Convert profile data to CSV rows
    const rows = Object.entries(profileData).map(([username, data]) => {
        const profileUrl = `https://gravatar.com/${username}`;
        const isPublic = !data.error;
        
        // If not public, return row with empty fields except username and profile URL
        if (!isPublic) {
            return [
                username,
                profileUrl,
                '', // Display Name
                'No',
                '', // Custom name
                '', // About
                '', // Verified Accounts
                '', // Links
                '', // Custom design
                '', // Header image
                '', // Photos
                '', // Interests
                '', // Contact info
                '', // Send money
                '', // Custom domain
                '', // Last edit
                ''  // Registration date
            ];
        }
        
        // Check for custom domain
        const customDomain = data.profile_url && !data.profile_url.includes('gravatar.com') 
            ? data.profile_url 
            : 'No';

        // About section logic
        let aboutStatus = 'No';
        if (data.description) {
            aboutStatus = 'Yes';
        } else if (data.location || data.job_title || data.company || 
                  data.pronunciation || data.pronouns) {
            aboutStatus = 'Partially';
        }

        return [
            username,
            profileUrl,
            data.display_name || '',
            'Yes',
            data.display_name && data.display_name !== username ? 'Yes' : 'No',
            aboutStatus,
            data.verified_accounts && data.verified_accounts.length > 0 ? 'Yes' : 'No',
            data.links && data.links.length > 0 ? 'Yes' : 'No',
            data.background_color ? 'Yes' : 'No',
            data.header_image ? 'Yes' : 'No',
            data.gallery && data.gallery.length > 0 ? 'Yes' : 'No',
            hasNonEmptyValues(data.interests) ? 'Yes' : 'No',
            hasNonEmptyValues(data.contact_info) ? 'Yes' : 'No',
            hasNonEmptyValues(data.payments) ? 'Yes' : 'No',
            customDomain,
            formatDate(data.last_profile_edit),
            formatDate(data.registration_date)
        ];
    });

    // Create CSV content
    const csvContent = [
        ...(includeHeaders ? [headers.join(',')] : []),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and trigger download with timestamp in filename
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .replace('Z', '');
    
    const headersSuffix = includeHeaders ? '-with-headers' : '';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gravatar_profiles_${timestamp}${headersSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Close dropdown after download
    document.getElementById("downloadDropdown").classList.remove("show");
}

// Add keyboard shortcut handler
document.getElementById('usernames').addEventListener('keydown', function(e) {
    // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); // Prevent default behavior
        fetchProfiles();
    }
}); 