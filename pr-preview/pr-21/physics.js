// Physics-related functionality

// Physics constants
const GRAVITY = 0.2;
const PUSH_DISTANCE = 2; // How far the push affects
const PUSH_FORCE = 3; // How strong the push is

// Platform boundary constants
const PLATFORM_HALF_WIDTH = 10; // Half width of the platform
const PLAYER_BOUNDARY = 9.5; // Player movement boundary
const ENEMY_BOUNDARY = 9; // Enemy movement boundary

// Apply physics to character
function applyPhysics(character, velocity, platform) {
    // Apply gravity
    velocity.y -= GRAVITY;
    character.position.y += velocity.y * 0.1;
    
    // Check if character is on the ground
    if (character.position.y <= platform.position.y + 1 && isOnPlatform(character, platform)) {
        character.position.y = platform.position.y + 1; // platform height + half character height + half platform height
        velocity.y = 0;
    }
    
    // Check if character fell too far
    if (character.position.y < platform.position.y - 12) {
        return false; // Game over
    }
    
    return true; // Game continues
}

// Apply physics to enemy
function applyEnemyPhysics(enemy, platform) {
    // If enemy is not on platform, apply gravity
    if (!isOnPlatform(enemy, platform)) {
        // If enemy doesn't have velocity yet, initialize it
        if (!enemy.userData.velocity) {
            enemy.userData.velocity = { y: 0 };
        }
        
        // Apply gravity
        enemy.userData.velocity.y -= GRAVITY;
        enemy.position.y += enemy.userData.velocity.y * 0.1;
        
        // Mark enemy as falling
        enemy.userData.isFalling = true;
    } else if (enemy.position.y <= platform.position.y + enemy.userData.size + 0.5) {
        // Enemy is on platform and at or below the correct height
        enemy.position.y = platform.position.y + enemy.userData.size + 0.5;
        if (enemy.userData.velocity) {
            enemy.userData.velocity.y = 0;
        }
        enemy.userData.isFalling = false;
    }
    
    // Check if enemy fell too far (remove from game)
    if (enemy.position.y < platform.position.y - 12) {
        return false; // Enemy should be removed
    }
    
    return true; // Enemy stays in game
}

// Check if character is above the platform
function isOnPlatform(character, platform) {
    return (
        character.position.x >= -PLATFORM_HALF_WIDTH && 
        character.position.x <= PLATFORM_HALF_WIDTH && 
        character.position.z >= -PLATFORM_HALF_WIDTH && 
        character.position.z <= PLATFORM_HALF_WIDTH
    );
}

// Check for collisions between player and enemies
function checkCollisions(character, enemies, velocity) {
    const playerRadius = 0.5;
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const distance = character.position.distanceTo(enemy.position);
        
        // If collision detected
        if (distance < playerRadius + enemy.userData.size) {
            // Push player away from enemy
            const pushDirection = new THREE.Vector3()
                .subVectors(character.position, enemy.position)
                .normalize();
            
            character.position.x += pushDirection.x * 0.2;
            character.position.z += pushDirection.z * 0.2;
            
            // Optional: make the player bounce a bit
            velocity.y = 1;
        }
    }
}

// Perform push attack
function pushAttack(character, enemies, facingDirection) {
    // Check for enemies in front of the player
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Calculate vector from player to enemy
        const toEnemy = new THREE.Vector3().subVectors(enemy.position, character.position);
        
        // Project this vector onto the facing direction to get distance in that direction
        const distanceInFacingDirection = toEnemy.dot(facingDirection);
        
        // Calculate perpendicular distance (how far off the center line the enemy is)
        const perpendicularVector = new THREE.Vector3().copy(toEnemy);
        perpendicularVector.sub(facingDirection.clone().multiplyScalar(distanceInFacingDirection));
        const perpendicularDistance = perpendicularVector.length();
        
        // If enemy is in front of player (within a cone) and within push distance
        if (distanceInFacingDirection > 0 && 
            distanceInFacingDirection < PUSH_DISTANCE && 
            perpendicularDistance < PUSH_DISTANCE / 2) {
            
            // Apply push velocity to the enemy instead of instantly moving them
            if (!enemy.userData.pushVelocity) {
                enemy.userData.pushVelocity = new THREE.Vector3();
            }
            
            // Set the push velocity in the direction of the push
            enemy.userData.pushVelocity.copy(facingDirection).multiplyScalar(PUSH_FORCE);
            
            // Also change the enemy's direction
            enemy.userData.direction.copy(facingDirection);
        }
    }
}

// Check if player is falling
function isPlayerFalling(character, velocity, platform) {
    return character.position.y > platform.position.y + 1.1 && velocity.y < 0;
}