<?php
// Tank Game Backend
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// File to store game data
$dataFile = 'game_data.json';

// Initialize data file if it doesn't exist
if (!file_exists($dataFile)) {
    $initialData = [
        'games' => [],
        'players' => [
            1 => ['wins' => 0, 'losses' => 0],
            2 => ['wins' => 0, 'losses' => 0]
        ]
    ];
    file_put_contents($dataFile, json_encode($initialData));
}

// Get the request method
$method = $_SERVER['REQUEST_METHOD'];

// Handle different requests
if ($method === 'POST') {
    // Save game result
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['action']) && $input['action'] === 'save_game') {
        $winner = intval($input['winner']);
        $loser = intval($input['loser']);
        $score = $input['score'] ?? '0-0';
        
        $response = saveGameResult($winner, $loser, $score);
        echo json_encode($response);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} else if ($method === 'GET') {
    // Get records or leaderboard
    if (isset($_GET['action'])) {
        if ($_GET['action'] === 'get_records') {
            $response = getRecentGames();
            echo json_encode($response);
        } else if ($_GET['action'] === 'get_leaderboard') {
            $response = getLeaderboard();
            echo json_encode($response);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'No action specified']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function saveGameResult($winner, $loser, $score) {
    global $dataFile;
    
    $data = json_decode(file_get_contents($dataFile), true);
    
    // Add new game record
    $game = [
        'player1' => 1,
        'player2' => 2,
        'winner' => $winner,
        'score' => $score,
        'timestamp' => date('c')
    ];
    
    array_unshift($data['games'], $game);
    
    // Update player stats
    updatePlayerStats($data, $winner, $loser);
    
    // Keep only last 10 games
    $data['games'] = array_slice($data['games'], 0, 10);
    
    // Save data
    if (file_put_contents($dataFile, json_encode($data))) {
        return ['success' => true];
    } else {
        return ['success' => false, 'error' => 'Failed to save data'];
    }
}

function updatePlayerStats(&$data, $winner, $loser) {
    // Update winner stats
    if (isset($data['players'][$winner])) {
        $data['players'][$winner]['wins']++;
    } else {
        $data['players'][$winner] = ['wins' => 1, 'losses' => 0];
    }
    
    // Update loser stats
    if (isset($data['players'][$loser])) {
        $data['players'][$loser]['losses']++;
    } else {
        $data['players'][$loser] = ['wins' => 0, 'losses' => 1];
    }
}

function getRecentGames() {
    global $dataFile;
    
    $data = json_decode(file_get_contents($dataFile), true);
    return ['success' => true, 'games' => $data['games'] ?? []];
}

function getLeaderboard() {
    global $dataFile;
    
    $data = json_decode(file_get_contents($dataFile), true);
    $players = $data['players'] ?? [];
    
    // Sort players by wins (descending) and losses (ascending)
    uasort($players, function($a, $b) {
        if ($a['wins'] == $b['wins']) {
            return $a['losses'] - $b['losses'];
        }
        return $b['wins'] - $a['wins'];
    });
    
    return ['success' => true, 'players' => $players];
}
?>