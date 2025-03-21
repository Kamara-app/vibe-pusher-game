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
            facingDirection.set(0, 0, -1);
            break;
            
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            facingDirection.set(-1, 0, 0);
            break;
            
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            facingDirection.set(0, 0, 1);
            break;
            
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            facingDirection.set(1, 0, 0);
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
                }, 300);
                
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
    
    // Move character based on controls
    if (moveForward) {
        character.position.z -= speed;
        facingDirection.set(0, 0, -1);
    }
    
    if (moveBackward) {
        character.position.z += speed;
        facingDirection.set(0, 0, 1);
    }
    
    if (moveLeft) {
        character.position.x -= speed;
        facingDirection.set(-1, 0, 0);
    }
    
    if (moveRight) {
        character.position.x += speed;
        facingDirection.set(1, 0, 0);
    }
    
    // Keep player on platform
    if (character.position.x < -PLAYER_BOUNDARY) character.position.x = -PLAYER_BOUNDARY;
    if (character.position.x > PLAYER_BOUNDARY) character.position.x = PLAYER_BOUNDARY;
    if (character.position.z < -PLAYER_BOUNDARY) character.position.z = -PLAYER_BOUNDARY;
    if (character.position.z > PLAYER_BOUNDARY) character.position.z = PLAYER_BOUNDARY;
}