// Input handling functionality

// Control states
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isPushing = false;
let pushCooldown = false;
let lastPushTime = 0;
const PUSH_COOLDOWN_TIME = 500; // 500ms cooldown

// Initialize controls
function initControls() {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', onWindowResize, false);
}

// Handle key down events
function onKeyDown(event) {
    if (!gameActive) return;
    
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
            
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
            
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
            
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
            
        case 'Space':
            // Space performs push attack
            if (!pushCooldown) {
                isPushing = true;
                pushCooldown = true;
                lastPushTime = Date.now();
                
                // Perform the push attack
                pushAttack(character, enemies, facingDirection);
                
                // Reset push state after a short delay (matching the push animation to the effect duration)
                setTimeout(() => {
                    isPushing = false;
                }, 500);
                
                // Reset cooldown after the specified time
                setTimeout(() => {
                    pushCooldown = false;
                }, PUSH_COOLDOWN_TIME);
            }
            break;
    }
}

// Handle key up events
function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
            
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
            
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
            
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

// Calculate movement direction based on key states
function calculateMovementDirection() {
    const direction = new THREE.Vector3(0, 0, 0);
    
    if (moveForward) direction.z -= 1;
    if (moveBackward) direction.z += 1;
    if (moveLeft) direction.x -= 1;
    if (moveRight) direction.x += 1;
    
    // Normalize the direction vector for consistent speed in all directions
    if (direction.length() > 0) {
        direction.normalize();
    }
    
    return direction;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update character position based on controls
function updateCharacterPosition(character, speed, velocity, platform) {
    // Check if player is falling
    const falling = isPlayerFalling(character, velocity, platform);
    
    // If player is falling, don't allow horizontal movement
    if (falling) {
        return;
    }
    
    // Calculate the movement direction based on key states
    const movementDirection = calculateMovementDirection();
    
    // Only update position and facing direction if there's movement
    if (movementDirection.length() > 0) {
        // Update character position
        character.position.x += movementDirection.x * speed;
        character.position.z += movementDirection.z * speed;
        
        // Update facing direction to match movement direction
        facingDirection.copy(movementDirection);
        
        // Update character sprite orientation based on movement direction
        updateCharacterSprite(movementDirection);
    }
    
    // No platform boundary restrictions for player
}

// Update character sprite based on movement direction
function updateCharacterSprite(direction) {
    // Determine the primary direction for sprite orientation
    // For diagonal movement, prioritize the up/down component for visual representation
    
    // Handle diagonal up cases specially
    if (direction.z < 0) {  // Any upward movement
        if (direction.x < 0) {
            // Diagonal up-left
            character.mesh.rotation.y = Math.PI / 4; // 45 degrees
            character.eyes.rotation.x = -Math.PI / 6; // Tilt eyes up slightly
        } else if (direction.x > 0) {
            // Diagonal up-right
            character.mesh.rotation.y = -Math.PI / 4; // -45 degrees
            character.eyes.rotation.x = -Math.PI / 6; // Tilt eyes up slightly
        } else {
            // Pure up
            character.mesh.rotation.y = 0;
            character.eyes.rotation.x = -Math.PI / 4; // Tilt eyes up
        }
    } else if (direction.z > 0) {  // Any downward movement
        if (direction.x < 0) {
            // Diagonal down-left
            character.mesh.rotation.y = Math.PI * 3/4; // 135 degrees
            character.eyes.rotation.x = Math.PI / 6; // Tilt eyes down slightly
        } else if (direction.x > 0) {
            // Diagonal down-right
            character.mesh.rotation.y = -Math.PI * 3/4; // -135 degrees
            character.eyes.rotation.x = Math.PI / 6; // Tilt eyes down slightly
        } else {
            // Pure down
            character.mesh.rotation.y = Math.PI;
            character.eyes.rotation.x = Math.PI / 4; // Tilt eyes down
        }
    } else {
        // Pure horizontal movement
        if (direction.x < 0) {
            // Pure left
            character.mesh.rotation.y = Math.PI / 2; // 90 degrees
            character.eyes.rotation.x = 0; // Reset eye tilt
        } else if (direction.x > 0) {
            // Pure right
            character.mesh.rotation.y = -Math.PI / 2; // -90 degrees
            character.eyes.rotation.x = 0; // Reset eye tilt
        }
    }
}