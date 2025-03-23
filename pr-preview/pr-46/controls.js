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

// Mobile control states
let isTouchDevice = false;
let joystickActive = false;
let joystickVector = { x: 0, y: 0 };

// Initialize controls
function initControls() {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', onWindowResize, false);
    
    // Check if device supports touch events
    isTouchDevice = ('ontouchstart' in window) || 
                    (navigator.maxTouchPoints > 0) || 
                    (navigator.msMaxTouchPoints > 0);
    
    // Initialize mobile controls if on a touch device
    if (isTouchDevice) {
        initMobileControls();
    }
}

// Initialize mobile controls
function initMobileControls() {
    // Show mobile controls
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
        mobileControls.style.display = 'block';
    }
    
    // Joystick setup
    const joystickContainer = document.getElementById('joystick-container');
    const joystick = document.getElementById('joystick');
    
    if (joystickContainer && joystick) {
        // Joystick touch start
        joystickContainer.addEventListener('touchstart', function(e) {
            e.preventDefault();
            joystickActive = true;
            updateJoystickPosition(e);
        });
        
        // Joystick touch move
        joystickContainer.addEventListener('touchmove', function(e) {
            e.preventDefault();
            if (joystickActive) {
                updateJoystickPosition(e);
            }
        });
        
        // Joystick touch end
        joystickContainer.addEventListener('touchend', function(e) {
            e.preventDefault();
            joystickActive = false;
            resetJoystick();
        });
        
        // Joystick touch cancel
        joystickContainer.addEventListener('touchcancel', function(e) {
            e.preventDefault();
            joystickActive = false;
            resetJoystick();
        });
    }
    
    // Push button setup
    const pushButton = document.getElementById('push-button');
    
    if (pushButton) {
        // Push button touch start
        pushButton.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (!pushCooldown) {
                isPushing = true;
                pushCooldown = true;
                lastPushTime = Date.now();
                
                // Add cooldown class
                pushButton.classList.add('cooldown');
                
                // Perform the push attack
                pushAttack(character, enemies, facingDirection);
                
                // Reset push state after a short delay
                setTimeout(() => {
                    isPushing = false;
                }, 500);
                
                // Reset cooldown after the specified time
                setTimeout(() => {
                    pushCooldown = false;
                    pushButton.classList.remove('cooldown');
                }, PUSH_COOLDOWN_TIME);
            }
        });
    }
}

// Update joystick position and movement vector
function updateJoystickPosition(e) {
    if (!gameActive) return;
    
    const joystickContainer = document.getElementById('joystick-container');
    const joystick = document.getElementById('joystick');
    
    if (!joystickContainer || !joystick) return;
    
    const containerRect = joystickContainer.getBoundingClientRect();
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    
    // Get touch position
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    
    // Calculate distance from center
    let deltaX = touchX - containerCenterX;
    let deltaY = touchY - containerCenterY;
    
    // Calculate distance
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Limit joystick movement to container radius
    const maxDistance = containerRect.width / 2;
    if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        deltaX *= ratio;
        deltaY *= ratio;
    }
    
    // Update joystick position
    joystick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    // Update joystick vector (normalized)
    const normalizedX = deltaX / maxDistance;
    const normalizedY = deltaY / maxDistance;
    
    // Update movement based on joystick position
    moveLeft = normalizedX < -0.2;
    moveRight = normalizedX > 0.2;
    moveForward = normalizedY < -0.2;
    moveBackward = normalizedY > 0.2;
    
    // Store joystick vector for potential analog movement
    joystickVector.x = normalizedX;
    joystickVector.y = normalizedY;
}

// Reset joystick position and movement
function resetJoystick() {
    const joystick = document.getElementById('joystick');
    
    if (joystick) {
        joystick.style.transform = 'translate(-50%, -50%)';
    }
    
    // Reset movement states
    moveLeft = false;
    moveRight = false;
    moveForward = false;
    moveBackward = false;
    
    // Reset joystick vector
    joystickVector.x = 0;
    joystickVector.y = 0;
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
                
                // Update push button visual if it exists
                const pushButton = document.getElementById('push-button');
                if (pushButton) {
                    pushButton.classList.add('cooldown');
                }
                
                // Perform the push attack
                pushAttack(character, enemies, facingDirection);
                
                // Reset push state after a short delay (matching the push animation to the effect duration)
                setTimeout(() => {
                    isPushing = false;
                }, 500);
                
                // Reset cooldown after the specified time
                setTimeout(() => {
                    pushCooldown = false;
                    
                    // Update push button visual if it exists
                    if (pushButton) {
                        pushButton.classList.remove('cooldown');
                    }
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
    
    // For touch devices, use joystick vector for more precise control if active
    if (isTouchDevice && joystickActive) {
        // Only override if joystick is being used (vector is non-zero)
        if (Math.abs(joystickVector.x) > 0.1 || Math.abs(joystickVector.y) > 0.1) {
            direction.x = joystickVector.x;
            direction.z = joystickVector.y;
        }
    }
    
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
    // Safety check to ensure character and its components exist
    if (!character || !character.mesh) {
        console.warn('Character or character.mesh is undefined');
        return;
    }
    
    // Determine the primary direction for sprite orientation
    if (direction.z < 0) {  // Any upward movement
        if (direction.x < 0) {
            // Diagonal up-left
            character.mesh.rotation.y = Math.PI / 4; // 45 degrees
        } else if (direction.x > 0) {
            // Diagonal up-right
            character.mesh.rotation.y = -Math.PI / 4; // -45 degrees
        } else {
            // Pure up
            character.mesh.rotation.y = 0;
        }
        // Set eye rotation if eyes exist
        if (character.eyes && character.eyes.rotation) {
            character.eyes.rotation.x = -Math.PI / 6; // Tilt eyes up
        }
    } else if (direction.z > 0) {  // Any downward movement
        if (direction.x < 0) {
            // Diagonal down-left
            character.mesh.rotation.y = Math.PI * 3/4; // 135 degrees
        } else if (direction.x > 0) {
            // Diagonal down-right
            character.mesh.rotation.y = -Math.PI * 3/4; // -135 degrees
        } else {
            // Pure down
            character.mesh.rotation.y = Math.PI;
        }
        // Set eye rotation if eyes exist
        if (character.eyes && character.eyes.rotation) {
            character.eyes.rotation.x = Math.PI / 6; // Tilt eyes down
        }
    } else {
        // Pure horizontal movement
        if (direction.x < 0) {
            // Pure left
            character.mesh.rotation.y = Math.PI / 2; // 90 degrees
        } else if (direction.x > 0) {
            // Pure right
            character.mesh.rotation.y = -Math.PI / 2; // -90 degrees
        }
        // Reset eye tilt if eyes exist
        if (character.eyes && character.eyes.rotation) {
            character.eyes.rotation.x = 0;
        }
    }
}