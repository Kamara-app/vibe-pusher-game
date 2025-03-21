// Physics-related functionality

// Physics constants
const GRAVITY = 0.2;
const PUSH_DISTANCE = 5; // How far the push affects
const PUSH_FORCE = 2; // How strong the push is

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

// Check if character is above the platform
function isOnPlatform(character, platform) {
    return (
        character.position.x >= -10 && 
        character.position.x <= 10 && 
        character.position.z >= -10 && 
        character.position.z <= 10
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
            
            // Push the enemy away
            const pushVector = facingDirection.clone().multiplyScalar(PUSH_FORCE);
            enemy.position.add(pushVector);
            
            // Also change the enemy's direction
            enemy.userData.direction.copy(facingDirection);
        }
    }
}
