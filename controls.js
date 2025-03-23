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

// Shooting controls
let isShooting = false;
let shootCooldown = false;
let lastShootTime = 0;
const SHOOT_COOLDOWN_TIME = 300; // 300ms cooldown
let mousePosition = new THREE.Vector2();
let isAiming = false;

// Initialize controls
function initControls() {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', onWindowResize, false);
    
    // Add mouse event listeners for shooting
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    
    // Prevent context menu on right click
    document.addEventListener('contextmenu', (event) => event.preventDefault(), false);
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

// Handle mouse move events
function onMouseMove(event) {
    // Calculate normalized device coordinates (-1 to +1)
    mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Set aiming flag
    isAiming = true;
    
    // Prevent default behavior to avoid text selection
    event.preventDefault();
}

// Handle mouse down events
function onMouseDown(event) {
    if (!gameActive) return;
    
    // Left mouse button (0) for shooting
    if (event.button === 0) {
        // Only shoot if not on cooldown
        if (!shootCooldown) {
            isShooting = true;
            shootCooldown = true;
            lastShootTime = Date.now();
            
            // Get aim direction from mouse position
            const aimDirection = calculateAimDirection();
            
            // Create a bullet
            const newBullet = createBullet(scene, character.position.clone(), aimDirection);
            bullets.push(newBullet);
            
            // Reset shooting state after a short delay
            setTimeout(() => {
                isShooting = false;
            }, 100);
            
            // Reset cooldown after the specified time
            setTimeout(() => {
                shootCooldown = false;
            }, SHOOT_COOLDOWN_TIME);
        }
    }
}

// Handle mouse up events
function onMouseUp(event) {
    // Left mouse button (0) for shooting
    if (event.button === 0) {
        isShooting = false;
    }
}

// Calculate aim direction from mouse position
function calculateAimDirection() {
    try {
        // Create a raycaster
        const raycaster = new THREE.Raycaster();
        
        // Make sure camera exists
        if (!camera) {
            console.warn("Camera not initialized for raycaster");
            return facingDirection.clone();
        }
        
        // Set raycaster from camera and mouse position
        raycaster.setFromCamera(mousePosition, camera);
        
        // Create a plane at the platform height
        const platformHeight = platform ? platform.position.y : 2;
        const platformPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -platformHeight);
        const targetPoint = new THREE.Vector3();
        
        // Check if the ray intersects the platform plane
        if (raycaster.ray.intersectPlane(platformPlane, targetPoint)) {
            // Make sure character exists
            if (!character || !character.position) {
                console.warn("Character not initialized for aim direction");
                return new THREE.Vector3(0, 0, -1);
            }
            
            // Calculate direction from character to target point
            const direction = new THREE.Vector3()
                .subVectors(targetPoint, character.position);
            
            // Keep the direction horizontal (y = 0)
            direction.y = 0;
            
            // Make sure to normalize again after setting y to 0
            if (direction.length() > 0) {
                direction.normalize();
                return direction;
            }
        }
        
        // Fallback to current facing direction if no intersection
        return facingDirection ? facingDirection.clone() : new THREE.Vector3(0, 0, -1);
    } catch (error) {
        console.error("Error calculating aim direction:", error);
        return new THREE.Vector3(0, 0, -1);
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

// Update character rotation based on aim direction
function updateCharacterAim(character, aimDirection) {
    // Only update rotation if we're aiming and not moving
    if (isAiming && calculateMovementDirection().length() === 0) {
        // Calculate angle from aim direction
        const angle = Math.atan2(aimDirection.x, aimDirection.z);
        
        // Update character rotation
        character.mesh.rotation.y = angle;
        
        // Update facing direction to match aim direction
        facingDirection.copy(aimDirection);
    }
}