// Physics-related functionality

// Physics constants
const GRAVITY = 0.2;
const PUSH_DISTANCE = 2; // How far the push affects
const PUSH_FORCE = 2; // How strong the push is (reduced from 3)
const PUSH_DURATION = 500; // How long the push effect lasts (in ms)

// Platform boundary constants
const PLATFORM_RADIUS = 10; // Radius of the circular platform
const PLAYER_BOUNDARY = 9.5; // Player movement boundary (slightly less than radius)
const ENEMY_BOUNDARY = 9; // Enemy movement boundary
const PLATFORM_HEIGHT = 1; // Height of platform surface

// Apply physics to character
function applyPhysics(character, velocity, platform) {
    // Store previous position before applying physics
    const previousY = character.position.y;
    
    // Always apply gravity unless character is confirmed to be on platform
    const onPlatform = isOnPlatform(character, platform);
    if (!onPlatform) {
        // Apply gravity when not on platform
        velocity.y -= GRAVITY;
        character.position.y += velocity.y * 0.1;
    }
    
    // Check if character is on the ground or should land on it
    // Character lands if they're at or below platform height, falling, and above the platform horizontally
    const distanceFromCenter = Math.sqrt(
        Math.pow(character.position.x - platform.position.x, 2) + 
        Math.pow(character.position.z - platform.position.z, 2)
    );
    const isAbovePlatform = distanceFromCenter <= PLATFORM_RADIUS;
    
    if (character.position.y <= platform.position.y + PLATFORM_HEIGHT && 
        velocity.y <= 0 && 
        isAbovePlatform) {
        character.position.y = platform.position.y + PLATFORM_HEIGHT;
        velocity.y = 0;
    }
    
    // Enforce circular platform boundary
    const distanceFromCenter = Math.sqrt(
        Math.pow(character.position.x - platform.position.x, 2) + 
        Math.pow(character.position.z - platform.position.z, 2)
    );
    
    if (distanceFromCenter > PLAYER_BOUNDARY) {
        // Push character back inside the platform
        const angle = Math.atan2(
            character.position.z - platform.position.z,
            character.position.x - platform.position.x
        );
        
        character.position.x = platform.position.x + Math.cos(angle) * PLAYER_BOUNDARY;
        character.position.z = platform.position.z + Math.sin(angle) * PLAYER_BOUNDARY;
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
    
    // Always apply gravity unless enemy is confirmed to be on platform
    if (!onPlatform) {
        // Apply gravity
        enemy.userData.velocity.y -= GRAVITY;
        enemy.position.y += enemy.userData.velocity.y * 0.1;
        
        // Mark enemy as falling
        enemy.userData.isFalling = true;
    }
    
    // Check if enemy is on the ground or should land on it
    // Calculate if enemy is above platform horizontally
    const distanceFromCenter = Math.sqrt(
        Math.pow(enemy.position.x - platform.position.x, 2) + 
        Math.pow(enemy.position.z - platform.position.z, 2)
    );
    const isAbovePlatform = distanceFromCenter <= PLATFORM_RADIUS;
    
    if (enemy.position.y <= platform.position.y + PLATFORM_HEIGHT && 
        enemy.userData.velocity.y <= 0 && 
        isAbovePlatform) {
        
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
            
            // Check for obstacle collisions
            checkEnemyObstacleCollisions(enemy, obstacles);
        } else {
            // Push effect has ended
            enemy.userData.isPushed = false;
        }
    }
    
    // Enforce circular platform boundary for enemies
    const distanceFromCenter = Math.sqrt(
        Math.pow(enemy.position.x - platform.position.x, 2) + 
        Math.pow(enemy.position.z - platform.position.z, 2)
    );
    
    if (distanceFromCenter > ENEMY_BOUNDARY) {
        // If enemy is pushed off the platform, let it fall
        if (!enemy.userData.isPushed) {
            // Otherwise, keep it on the platform
            const angle = Math.atan2(
                enemy.position.z - platform.position.z,
                enemy.position.x - platform.position.x
            );
            
            enemy.position.x = platform.position.x + Math.cos(angle) * ENEMY_BOUNDARY;
            enemy.position.z = platform.position.z + Math.sin(angle) * ENEMY_BOUNDARY;
        }
    }
    
    // Check if enemy fell too far (remove from game)
    if (enemy.position.y < platform.position.y - 12) {
        return false; // Enemy should be removed
    }
    
    return true; // Enemy stays in game
}

// Check for collisions between enemies and obstacles
function checkEnemyObstacleCollisions(enemy, obstacles) {
    const enemyRadius = enemy.userData.size || 0.5;
    
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        let collision = false;
        
        if (obstacle.userData.type === 'box') {
            // Box collision detection
            const halfWidth = obstacle.userData.width / 2;
            const halfDepth = obstacle.userData.depth / 2;
            
            // Calculate closest point on box to enemy
            const closestX = Math.max(obstacle.position.x - halfWidth, 
                            Math.min(enemy.position.x, obstacle.position.x + halfWidth));
            const closestZ = Math.max(obstacle.position.z - halfDepth, 
                            Math.min(enemy.position.z, obstacle.position.z + halfDepth));
            
            // Calculate distance from closest point to enemy
            const distance = Math.sqrt(
                Math.pow(enemy.position.x - closestX, 2) + 
                Math.pow(enemy.position.z - closestZ, 2)
            );
            
            collision = distance < enemyRadius;
        } else if (obstacle.userData.type === 'cylinder') {
            // Cylinder collision detection
            const distance = Math.sqrt(
                Math.pow(enemy.position.x - obstacle.position.x, 2) + 
                Math.pow(enemy.position.z - obstacle.position.z, 2)
            );
            
            collision = distance < (enemyRadius + obstacle.userData.radius);
        }
        
        if (collision) {
            // Push enemy away from obstacle
            const pushDirection = new THREE.Vector3()
                .subVectors(enemy.position, obstacle.position)
                .normalize();
            
            enemy.position.x += pushDirection.x * 0.2;
            enemy.position.z += pushDirection.z * 0.2;
            
            // Slightly redirect the enemy's push velocity if being pushed
            if (enemy.userData.isPushed && enemy.userData.pushVelocity) {
                // Reflect the push velocity based on the obstacle normal
                const dot = enemy.userData.pushVelocity.dot(pushDirection);
                enemy.userData.pushVelocity.sub(
                    pushDirection.multiplyScalar(2 * dot)
                );
            }
        }
    }
}

// Check if character is on the platform
function isOnPlatform(character, platform) {
    // Check horizontal position (x-z coordinates) for circular platform
    const distanceFromCenter = Math.sqrt(
        Math.pow(character.position.x - platform.position.x, 2) + 
        Math.pow(character.position.z - platform.position.z, 2)
    );
    
    const isAbovePlatform = distanceFromCenter <= PLATFORM_RADIUS;
    
    // Check vertical position (y coordinate)
    // Character is considered on platform if they're at the platform height (with minimal tolerance)
    const isAtPlatformHeight = (
        Math.abs(character.position.y - (platform.position.y + PLATFORM_HEIGHT)) < 0.05
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

// Check for collisions with obstacles
function checkObstacleCollisions(character, obstacles) {
    const playerRadius = 0.5;
    
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        let collision = false;
        
        if (obstacle.userData.type === 'box') {
            // Box collision detection
            const halfWidth = obstacle.userData.width / 2;
            const halfDepth = obstacle.userData.depth / 2;
            
            // Calculate closest point on box to character
            const closestX = Math.max(obstacle.position.x - halfWidth, 
                            Math.min(character.position.x, obstacle.position.x + halfWidth));
            const closestZ = Math.max(obstacle.position.z - halfDepth, 
                            Math.min(character.position.z, obstacle.position.z + halfDepth));
            
            // Calculate distance from closest point to character
            const distance = Math.sqrt(
                Math.pow(character.position.x - closestX, 2) + 
                Math.pow(character.position.z - closestZ, 2)
            );
            
            collision = distance < playerRadius;
        } else if (obstacle.userData.type === 'cylinder') {
            // Cylinder collision detection
            const distance = Math.sqrt(
                Math.pow(character.position.x - obstacle.position.x, 2) + 
                Math.pow(character.position.z - obstacle.position.z, 2)
            );
            
            collision = distance < (playerRadius + obstacle.userData.radius);
        }
        
        if (collision) {
            // Push character away from obstacle
            const pushDirection = new THREE.Vector3()
                .subVectors(character.position, obstacle.position)
                .normalize();
            
            character.position.x += pushDirection.x * 0.2;
            character.position.z += pushDirection.z * 0.2;
        }
    }
}

// Check if player is falling
function isPlayerFalling(character, velocity, platform) {
    return character.position.y > platform.position.y + PLATFORM_HEIGHT + 0.1 && velocity.y < 0;
}