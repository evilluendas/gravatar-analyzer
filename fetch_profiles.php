<?php
header('Content-Type: application/json');

// Load configuration
$config = file_exists(__DIR__ . '/config.php') 
    ? require __DIR__ . '/config.php'
    : ['gravatar_api_key' => null];

// Read the POST data
$input = json_decode(file_get_contents('php://input'), true);
$inputs = $input['inputs'] ?? [];

// Initialize results array
$results = [];

// API base URL
$baseUrl = 'https://api.gravatar.com/v3/profiles/';

foreach ($inputs as $input) {
    $value = $input['value'];
    $type = $input['type'];
    
    try {
        // If it's an email, hash it
        $identifier = $type === 'email' ? hash('sha256', strtolower(trim($value))) : $value;
        
        // Make request to Gravatar API
        $ch = curl_init($baseUrl . urlencode($identifier));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        // Add API key if configured
        if (!empty($config['gravatar_api_key'])) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $config['gravatar_api_key']
            ]);
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $results[$value] = json_decode($response, true);
        } else {
            $results[$value] = [
                'error' => 'Profile not found or API error',
                'status' => $httpCode
            ];
        }
    } catch (Exception $e) {
        $results[$value] = [
            'error' => $e->getMessage()
        ];
    }
}

echo json_encode($results, JSON_PRETTY_PRINT); 