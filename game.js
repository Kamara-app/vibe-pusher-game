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
    createCharacter();
    
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

// Create the player character
function createCharacter() {
    const characterGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const characterMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    character = new THREE.Mesh(characterGeometry, characterMaterial);
    character.position.set(0, 3, 0); // Updated to be on top of the elevated platform (2 + 0.5 + 0.5)
    scene.add(character);
    
    // Create smiley face indicator for direction
    const smileyGeometry = new THREE.CircleGeometry(0.2, 32);
    const smileyMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    smileyFace = new THREE.Mesh(smileyGeometry, smileyMaterial);
    
    // Add eyes and mouth to the smiley
    const leftEyeGeometry = new THREE.CircleGeometry(0.05, 16);
    const rightEyeGeometry = new THREE.CircleGeometry(0.05, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
    leftEye.position.set(-0.07, 0.05, 0.01);
    smileyFace.add(leftEye);
    
    const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial);
    rightEye.position.set(0.07, 0.05, 0.01);
    smileyFace.add(rightEye);
    
    // Create a smile using a curved line
    const smileGeometry = new THREE.BufferGeometry();
    const smileCurve = new THREE.EllipseCurve(
        0, -0.03, // center
        0.1, 0.05, // x radius, y radius
        Math.PI, 0, // start angle, end angle
        true // clockwise
    );
    const smilePoints = smileCurve.getPoints(20);
    smileGeometry.setFromPoints(smilePoints);
    const smileMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const smile = new THREE.Line(smileGeometry, smileMaterial);
    smile.position.z = 0.01;
    smileyFace.add(smile);
    
    // Position the smiley face in front of the character
    updateSmileyPosition();
    scene.add(smileyFace);
    
    // Create push arm
    const armGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    pushArm = new THREE.Mesh(armGeometry, armMaterial);
    pushArm.visible = false; // Hide initially
    scene.add(pushArm);
}

// Update smiley face position based on character position and facing direction
function updateSmileyPosition() {
    // Position smiley face 0.8 units in front of the character in the facing direction
    smileyFace.position.copy(character.position);
    smileyFace.position.add(facingDirection.clone().multiplyScalar(0.8));
    
    // Make smiley face look in the same direction as the character
    smileyFace.lookAt(smileyFace.position.clone().add(facingDirection));
}

// Update push arm position and rotation
function updatePushArm() {
    if (isPushing) {
        pushArm.visible = true;
        pushArm.position.copy(character.position);
        
        // Position the arm in front of the character
        pushArm.position.add(facingDirection.clone().multiplyScalar(0.4));
        
        // Rotate the arm to align with the facing direction
        if (Math.abs(facingDirection.x) > Math.abs(facingDirection.z)) {
            // Facing left or right
            pushArm.rotation.y = facingDirection.x > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
            // Facing forward or backward
            pushArm.rotation.y = facingDirection.z > 0 ? Math.PI : 0;
        }
    } else {
        pushArm.visible = false;
    }
}

// Create enemies
function createEnemies() {
    // Clear existing enemies
    for (let i = 0; i < enemies.length; i++) {
        scene.remove(enemies[i]);
    }
    enemies = [];
    
    // Create new enemies
    for (let i = 0; i < enemyCount; i++) {
        const enemyGeometry = new THREE.SphereGeometry(enemySize, 32, 32);
        const enemyMaterial = new THREE.MeshStandardMaterial({ color: enemyColor });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        
        // Random position on the platform
        const x = Math.random() * 16 - 8; // Range: -8 to 8
        const z = Math.random() * 16 - 8; // Range: -8 to 8
        enemy.position.set(x, platform.position.y + enemySize + 0.5, z);
        
        // Add random movement direction
        enemy.direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
        
        // Add change direction timer
        enemy.nextDirectionChange = Math.random() * 2000 + 1000; // 1-3 seconds
        enemy.lastDirectionChange = Date.now();
        
        scene.add(enemy);
        enemies.push(enemy);
    }
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
    updateSmileyPosition();
    
    // Update push arm position
    updatePushArm();
    
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