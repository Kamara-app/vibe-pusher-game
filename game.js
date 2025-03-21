// Game variables
let scene, camera, renderer;
let platform, character;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = true;
let velocity = new THREE.Vector3();
let gravity = 0.2;
let jumpStrength = 4; // Reduced from 6 to 4
let speed = 0.2;
let gameActive = true;

// Direction tracking
let facingDirection = new THREE.Vector3(0, 0, -1); // Default facing forward (negative z)
let smileyFace, pushArm;
let isPushing = false;
let pushCooldown = false;
let lastPushTime = 0;
const PUSH_COOLDOWN_TIME = 500; // 500ms cooldown
const PUSH_DISTANCE = 2; // How far the push affects
const PUSH_FORCE = 2; // How strong the push is

// Enemy variables
let enemies = [];
const enemyCount = 5;
const enemySpeed = 0.1;
const enemySize = 0.4;
const enemyColor = 0xFF0000;

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera - adjusted to be more from above
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 8); // Changed from (0, 5, 10) to be higher and closer
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create platform
    createPlatform();
    
    // Create character
    initializeCharacter();
    
    // Create enemies
    createEnemies();
    
    // Add event listeners for controls
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    
    // Add reset button functionality
    document.getElementById('resetButton').addEventListener('click', resetGame);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Start animation loop
    animate();
}

// Create the platform without borders
function createPlatform() {
    // Main platform
    const platformGeometry = new THREE.BoxGeometry(20, 1, 20);
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00 });
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 2; // Elevated from -0.5 to 2
    scene.add(platform);
    
    // Removed all border objects (northBorder, southBorder, eastBorder, westBorder)
}

// Create the player character and related elements
function initializeCharacter() {
    // Create the main character, direction indicator, and push arm
    character = createCharacter(scene);
    smileyFace = createDirectionIndicator(scene);
    pushArm = createPushArm(scene);
    
    // Position the smiley face in front of the character
    updateSmileyPosition(smileyFace, character, facingDirection);
}

// Create enemies
function createEnemies() {
    // Clear existing enemies
    for (let i = 0; i < enemies.length; i++) {
        scene.remove(enemies[i]);
    }
    enemies = [];
    
    // Create new enemies using the function from characters.js
    enemies = createEnemies(scene, platform, enemyCount, enemySize, enemyColor);
}

// Update enemy positions
function updateEnemies() {
    const now = Date.now();
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Check if it's time to change direction
        if (now - enemy.lastDirectionChange > enemy.nextDirectionChange) {
            enemy.direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize();
            
            enemy.nextDirectionChange = Math.random() * 2000 + 1000;
            enemy.lastDirectionChange = now;
        }
        
        // Move enemy
        enemy.position.x += enemy.direction.x * enemySpeed;
        enemy.position.z += enemy.direction.z * enemySpeed;
        
        // Keep enemy on platform
        if (enemy.position.x < -9) {
            enemy.position.x = -9;
            enemy.direction.x *= -1;
        } else if (enemy.position.x > 9) {
            enemy.position.x = 9;
            enemy.direction.x *= -1;
        }
        
        if (enemy.position.z < -9) {
            enemy.position.z = -9;
            enemy.direction.z *= -1;
        } else if (enemy.position.z > 9) {
            enemy.position.z = 9;
            enemy.direction.z *= -1;
        }
    }
}

// Check for collisions between player and enemies
function checkCollisions() {
    const playerRadius = 0.5;
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const distance = character.position.distanceTo(enemy.position);
        
        // If collision detected
        if (distance < playerRadius + enemySize) {
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
function pushAttack() {
    if (pushCooldown) return;
    
    isPushing = true;
    pushCooldown = true;
    lastPushTime = Date.now();
    
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
            enemy.direction.copy(facingDirection);
        }
    }
    
    // Reset push state after a short delay
    setTimeout(() => {
        isPushing = false;
    }, 200);
    
    // Reset cooldown after the specified time
    setTimeout(() => {
        pushCooldown = false;
    }, PUSH_COOLDOWN_TIME);
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
            // Space now performs push attack
            pushAttack();
            break;
            
        case 'KeyE':
            // E key now performs jump
            if (canJump) {
                velocity.y = jumpStrength;
                canJump = false;
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
function updateCharacter() {
    // Apply gravity
    velocity.y -= gravity;
    character.position.y += velocity.y * 0.1;
    
    // Check if character is on the ground
    if (character.position.y <= platform.position.y + 1 && isOnPlatform()) {
        character.position.y = platform.position.y + 1; // platform height + half character height + half platform height
        velocity.y = 0;
        canJump = true;
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
    
    // Update smiley face position
    updateSmileyPosition(smileyFace, character, facingDirection);
    
    // Update push arm position
    updatePushArm(pushArm, character, facingDirection, isPushing);
    
    // Check if character fell off the platform
    if (!isOnPlatform() && character.position.y < 3) {
        canJump = false;
        // Let gravity do its work
    }
    
    // Check if character fell too far
    if (character.position.y < platform.position.y - 12) {
        gameOver();
    }
    
    // Update camera to follow character - adjusted to be more from above
    camera.position.x = character.position.x;
    camera.position.y = character.position.y + 10; // Higher above the character
    camera.position.z = character.position.z + 6; // Closer to the character
    camera.lookAt(character.position);
}

// Check if character is above the platform
function isOnPlatform() {
    return (
        character.position.x >= -10 && 
        character.position.x <= 10 && 
        character.position.z >= -10 && 
        character.position.z <= 10
    );
}

// Game over function
function gameOver() {
    gameActive = false;
    document.getElementById('gameOver').style.display = 'block';
}

// Reset game function
function resetGame() {
    character.position.set(0, platform.position.y + 1, 0); // Updated to be on top of the elevated platform
    velocity.set(0, 0, 0);
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    canJump = true;
    gameActive = true;
    facingDirection.set(0, 0, -1); // Reset facing direction
    isPushing = false;
    pushCooldown = false;
    document.getElementById('gameOver').style.display = 'none';
    
    // Recreate enemies
    createEnemies();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (gameActive) {
        updateCharacter();
        updateEnemies();
        checkCollisions();
    }
    
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
window.onload = init;