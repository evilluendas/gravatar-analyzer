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

function isEmail(input) {
    // Basic email validation regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

// Add collapsible functionality
document.querySelector('.collapsible').addEventListener('click', function() {
    this.classList.toggle('active');
    const content = this.nextElementSibling;
    if (content.style.display === 'block') {
        content.style.display = 'none';
        this.textContent = 'See full JSON';
    } else {
        content.style.display = 'block';
        this.textContent = 'Hide JSON';
    }
});

function calculateProfileStats(profileData) {
    const profiles = Object.entries(profileData)
        .filter(([_, profile]) => !profile.error)
        .map(([input, profile]) => ({ ...profile, input }));
    
    const total = profiles.length;
    if (total === 0) return null;

    const stats = {
        customName: profiles.filter(p => p.display_name && p.display_name !== p.input).length,
        about: profiles.filter(p => p.description || p.location || p.job_title || p.company || p.pronunciation || p.pronouns).length,
        verifiedAccounts: profiles.filter(p => p.verified_accounts && p.verified_accounts.length > 0).length,
        links: profiles.filter(p => p.links && p.links.length > 0).length,
        customDesign: profiles.filter(p => p.background_color).length,
        headerImage: profiles.filter(p => p.header_image).length,
        photos: profiles.filter(p => p.gallery && p.gallery.length > 0).length,
        interests: profiles.filter(p => hasNonEmptyValues(p.interests)).length,
        contactInfo: profiles.filter(p => hasNonEmptyValues(p.contact_info)).length,
        sendMoney: profiles.filter(p => hasNonEmptyValues(p.payments)).length,
        customDomain: profiles.filter(p => p.profile_url && !p.profile_url.includes('gravatar.com')).length
    };

    return { stats, total };
}

function formatStatsDetail(count, total) {
    const percentage = ((count / total) * 100).toFixed(1);
    return `${count} (${percentage}%)`;
}

async function fetchProfiles() {
    const inputs = document.getElementById('usernames').value
        .split('\n')
        .map(input => input.trim())
        .filter(input => input.length > 0);

    if (inputs.length === 0) {
        alert('Please enter at least one username or email');
        return;
    }

    const resultDiv = document.getElementById('result');
    const statsDiv = document.getElementById('stats');
    const collapsibleBtn = document.querySelector('.collapsible');
    const contentDiv = collapsibleBtn.nextElementSibling;
    
    // Show fetching message in stats div
    statsDiv.style.display = 'block';
    statsDiv.textContent = `Fetching profiles... (0 of ${inputs.length})`;
    
    document.getElementById('downloadBtn').style.display = 'none';
    collapsibleBtn.style.display = 'none';
    contentDiv.style.display = 'none';

    // Reset and start stats
    fetchStats = {
        startTime: new Date(),
        endTime: null,
        profilesChecked: inputs.length,
        apiCalls: inputs.length
    };

    try {
        // Split inputs into smaller chunks to show progress
        const CHUNK_SIZE = 5;
        const chunks = [];
        for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
            chunks.push(inputs.slice(i, i + CHUNK_SIZE));
        }

        let results = {};
        let processed = 0;

        // Process chunks sequentially
        for (const chunk of chunks) {
            // Prepare the data with type information
            const processedInputs = chunk.map(input => ({
                value: input,
                type: isEmail(input) ? 'email' : 'username'
            }));

            const response = await fetch('fetch_profiles.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ inputs: processedInputs })
            });

            const chunkData = await response.json();
            results = { ...results, ...chunkData };
            
            processed += chunk.length;
            statsDiv.textContent = `Fetching profiles... (${processed} of ${inputs.length})`;
        }

        profileData = results;
        fetchStats.endTime = new Date();
        
        // Update UI
        resultDiv.textContent = JSON.stringify(profileData, null, 2);
        document.getElementById('downloadBtn').style.display = 'inline-block';
        collapsibleBtn.style.display = 'block';
        
        // Calculate stats
        const processingTime = (fetchStats.endTime - fetchStats.startTime) / 1000;
        const publicProfiles = Object.values(profileData).filter(profile => !profile.error).length;
        const percentage = ((publicProfiles / fetchStats.profilesChecked) * 100).toFixed(1);
        
        // Display stats
        let statsHtml = `${fetchStats.profilesChecked} profiles checked • ${fetchStats.apiCalls} API calls • ${processingTime.toFixed(1)} seconds<br>` +
                       `${publicProfiles} public profiles found (${percentage}%)`;

        // Add detailed stats if there's at least one public profile
        if (publicProfiles > 0) {
            const { stats, total } = calculateProfileStats(profileData);
            statsHtml += '<br><br>Of these profiles:' +
                `<br>• Custom name: ${formatStatsDetail(stats.customName, total)}` +
                `<br>• About section: ${formatStatsDetail(stats.about, total)}` +
                `<br>• Verified accounts: ${formatStatsDetail(stats.verifiedAccounts, total)}` +
                `<br>• Links: ${formatStatsDetail(stats.links, total)}` +
                (stats.customDesign ? `<br>• Custom design: ${formatStatsDetail(stats.customDesign, total)}` : '') +
                (stats.headerImage ? `<br>• Header image: ${formatStatsDetail(stats.headerImage, total)}` : '') +
                `<br>• Photos: ${formatStatsDetail(stats.photos, total)}` +
                `<br>• Interests: ${formatStatsDetail(stats.interests, total)}` +
                `<br>• Contact info: ${formatStatsDetail(stats.contactInfo, total)}` +
                `<br>• Send money: ${formatStatsDetail(stats.sendMoney, total)}` +
                `<br>• Custom domain: ${formatStatsDetail(stats.customDomain, total)}`;
        }

        statsDiv.innerHTML = statsHtml;
    } catch (error) {
        resultDiv.textContent = 'Error fetching profiles: ' + error.message;
        statsDiv.style.display = 'none';
        collapsibleBtn.style.display = 'none';
        contentDiv.style.display = 'none';
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