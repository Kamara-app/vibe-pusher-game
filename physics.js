// Physics-related functionality

// Physics constants
const GRAVITY = 0.2;
const PUSH_DISTANCE = 2; // How far the push affects
const PUSH_FORCE = 2; // How strong the push is (reduced from 3)
const PUSH_DURATION = 500; // How long the push effect lasts (in ms)

// Platform boundary constants
const PLATFORM_HALF_WIDTH = 10; // Half width of the platform
const PLAYER_BOUNDARY = 9.5; // Player movement boundary
const ENEMY_BOUNDARY = 9; // Enemy movement boundary
const PLATFORM_HEIGHT = 1; // Height of platform surface

// Apply physics to character
function applyPhysics(character, velocity, platform) {
    // Store previous position before applying physics
    const previousY = character.position.y;
    
    // Check if character is on the platform
    if (!isOnPlatform(character, platform) || velocity.y < 0) {
        // Apply gravity only if not on platform or already falling
        velocity.y -= GRAVITY;
        character.position.y += velocity.y * 0.1;
    }
    
    // Check if character is on the ground
    // Only set position when falling onto platform from above (velocity.y < 0)
    if (character.position.y <= platform.position.y + PLATFORM_HEIGHT && 
        velocity.y <= 0 && 
        isOnPlatform(character, platform)) {
        character.position.y = platform.position.y + PLATFORM_HEIGHT; // platform height + half character height
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
    // If enemy doesn't have velocity yet, initialize it
    if (!enemy.userData.velocity) {
        enemy.userData.velocity = { y: 0 };
    }
    
    // Check if enemy is on the platform
    const onPlatform = isOnPlatform(enemy, platform);
    
    // If enemy is not on platform or is already falling, apply gravity
    if (!onPlatform || enemy.userData.velocity.y < 0) {
        // Apply gravity
        enemy.userData.velocity.y -= GRAVITY;
        enemy.position.y += enemy.userData.velocity.y * 0.1;
        
        // Mark enemy as falling
        enemy.userData.isFalling = true;
    }
    
    // Check if enemy is on the ground
    // Only set position when falling onto platform from above (velocity.y < 0)
    if (enemy.position.y <= platform.position.y + PLATFORM_HEIGHT && 
        (enemy.userData.velocity.y <= 0 || enemy.userData.isOnPlatform) && 
        onPlatform) {
        
        enemy.position.y = platform.position.y + PLATFORM_HEIGHT;
        enemy.userData.velocity.y = 0;
        enemy.userData.isFalling = false;
        enemy.userData.isOnPlatform = true;
    }
    
    // Apply push force over time if enemy is being pushed
    if (enemy.userData.isPushed) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - enemy.userData.pushStartTime;
        
        // Apply push force for the duration
        if (elapsedTime < PUSH_DURATION) {
            // Calculate remaining push force based on time elapsed (quadratic easing out)
            const progress = elapsedTime / PUSH_DURATION;
            const remainingForceFactor = 1 - (progress * progress);
            
            // Apply the push force gradually
            const pushForceThisFrame = enemy.userData.pushVelocity.clone().multiplyScalar(remainingForceFactor * 0.1);
            enemy.position.x += pushForceThisFrame.x;
            enemy.position.z += pushForceThisFrame.z;
            
            // No platform boundary restrictions for enemies
        } else {
            // Push effect has ended
            enemy.userData.isPushed = false;
        }
    }
    
    // Check if enemy fell too far (remove from game)
    if (enemy.position.y < platform.position.y - 12) {
        return false; // Enemy should be removed
    }
    
    return true; // Enemy stays in game
}

// Check if character is on the platform
function isOnPlatform(character, platform) {
    // Check horizontal position (x-z coordinates)
    const isAbovePlatform = (
        character.position.x >= -PLATFORM_HALF_WIDTH && 
        character.position.x <= PLATFORM_HALF_WIDTH && 
        character.position.z >= -PLATFORM_HALF_WIDTH && 
        character.position.z <= PLATFORM_HALF_WIDTH
    );
    
    // Check vertical position (y coordinate)
    // Character is considered on platform if they're at or very slightly above platform height
    const isAtPlatformHeight = (
        Math.abs(character.position.y - (platform.position.y + PLATFORM_HEIGHT)) < 0.1
    );
    
    return isAbovePlatform && isAtPlatformHeight;
}

// Check for collisions between player and enemies
function checkCollisions(character, enemies, velocity) {
    const playerRadius = 0.5;
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const distance = character.position.distanceTo(enemy.position);
        
        // If collision detected - use the actual enemy size for accurate collision
        if (distance < playerRadius + enemy.userData.size) {
            // Push player away from enemy - larger enemies push harder
            const pushDirection = new THREE.Vector3()
                .subVectors(character.position, enemy.position)
                .normalize();
            
            // Push strength proportional to enemy size
            const pushStrength = 0.15 + (enemy.userData.size / enemyMaxSize) * 0.1;
            
            character.position.x += pushDirection.x * pushStrength;
            character.position.z += pushDirection.z * pushStrength;
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
            
            // Initialize push velocity if it doesn't exist
            if (!enemy.userData.pushVelocity) {
                enemy.userData.pushVelocity = new THREE.Vector3();
            }
            
            // Calculate push force based on enemy size - smaller enemies get pushed farther
            const sizeFactor = 1 - ((enemy.userData.size - enemyMinSize) / (enemyMaxSize - enemyMinSize)); // Normalize size to a factor
            const adjustedPushForce = PUSH_FORCE * (0.7 + sizeFactor * 0.3); // Between 70-100% of push force
            
            // Set the push velocity in the direction of the push
            enemy.userData.pushVelocity.copy(facingDirection).multiplyScalar(adjustedPushForce);
            
            // Set the push state and start time
            enemy.userData.isPushed = true;
            enemy.userData.pushStartTime = Date.now();
            
            // Also change the enemy's direction
            enemy.userData.direction.copy(facingDirection);
        }
    }
}

// Check if player is falling
function isPlayerFalling(character, velocity, platform) {
    return character.position.y > platform.position.y + PLATFORM_HEIGHT + 0.1 && velocity.y < 0;
}