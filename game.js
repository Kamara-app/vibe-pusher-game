// Game variables
let scene, camera, renderer;
let platform, character;
let velocity = new THREE.Vector3();
let speed = 0.15;
let gameActive = true;
let obstacles = []; // Array to store obstacles

// Direction tracking
let facingDirection = new THREE.Vector3(0, 0, -1); // Default facing forward (negative z)
let smileyFace, pushArm, cooldownIndicator;

// Enemy variables
let enemies = [];
const enemyCount = 5;
const enemySpeed = 0.1;
const enemyMinSize = 0.3;
const enemyMaxSize = 0.7;
const enemyColor = 0xFF0000;

// Bullet variables
let bullets = [];
let aimIndicator;
let raycaster = new THREE.Raycaster();

// Initialize the game
function init() {
    try {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Create camera - adjusted to be more from above
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 12, 8); // Changed from (0, 5, 10) to be higher and closer
        camera.lookAt(0, 0, 0);
        
        // Make camera globally accessible for aim indicator
        window.camera = camera;
        
        // Create renderer with error handling
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);
        } catch (renderError) {
            console.error("WebGL renderer creation failed:", renderError);
            const errorMessage = document.createElement('div');
            errorMessage.style.color = 'red';
            errorMessage.style.padding = '20px';
            errorMessage.textContent = 'Error: Could not initialize WebGL. Please check if your browser supports WebGL.';
            document.body.appendChild(errorMessage);
            return;
        }
        
        // Initialize raycaster
        raycaster = new THREE.Raycaster();
        
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
        initializeEnemies();
        
        // Initialize controls
        initControls();
        
        // Add reset button functionality
        document.getElementById('resetButton').addEventListener('click', resetGame);
        
        // Start animation loop
        animate();
    } catch (error) {
        console.error("Game initialization failed:", error);
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'red';
        errorMessage.style.padding = '20px';
        errorMessage.textContent = 'Error: Game initialization failed. Please refresh the page.';
        document.body.appendChild(errorMessage);
    }
}

// Create the circular platform with obstacles
function createPlatform() {
    // Main circular platform
    const platformRadius = 10;
    const platformGeometry = new THREE.CylinderGeometry(platformRadius, platformRadius, 1, 32);
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00 });
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 2; // Elevated from -0.5 to 2
    platform.userData.radius = platformRadius; // Store radius for physics calculations
    scene.add(platform);
    
    // Create obstacles
    createObstacles(platformRadius);
}

// Create obstacles on the platform
function createObstacles(platformRadius) {
    // Clear any existing obstacles
    for (let i = 0; i < obstacles.length; i++) {
        scene.remove(obstacles[i]);
    }
    obstacles = [];
    
    // Create 4 obstacles
    const obstaclePositions = [
        { x: 4, z: 4 },
        { x: -5, z: 2 },
        { x: 0, z: -6 },
        { x: -3, z: -4 }
    ];
    
    const obstacleTypes = [
        { type: 'box', width: 1.5, height: 2, depth: 1.5, color: 0x8B4513 },
        { type: 'cylinder', radius: 1, height: 2, color: 0x708090 },
        { type: 'box', width: 2, height: 1.5, depth: 1, color: 0x8B4513 },
        { type: 'cylinder', radius: 0.8, height: 3, color: 0x708090 }
    ];
    
    for (let i = 0; i < obstaclePositions.length; i++) {
        let obstacle;
        const pos = obstaclePositions[i];
        const type = obstacleTypes[i];
        
        // Make sure obstacle is within platform radius
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (distanceFromCenter + 1 > platformRadius) {
            // Adjust position to be within platform
            const scale = (platformRadius - 1) / distanceFromCenter;
            pos.x *= scale;
            pos.z *= scale;
        }
        
        if (type.type === 'box') {
            const geometry = new THREE.BoxGeometry(type.width, type.height, type.depth);
            const material = new THREE.MeshStandardMaterial({ color: type.color });
            obstacle = new THREE.Mesh(geometry, material);
            obstacle.userData.type = 'box';
            obstacle.userData.width = type.width;
            obstacle.userData.depth = type.depth;
        } else {
            const geometry = new THREE.CylinderGeometry(type.radius, type.radius, type.height, 16);
            const material = new THREE.MeshStandardMaterial({ color: type.color });
            obstacle = new THREE.Mesh(geometry, material);
            obstacle.userData.type = 'cylinder';
            obstacle.userData.radius = type.radius;
        }
        
        obstacle.position.set(pos.x, platform.position.y + type.height/2, pos.z);
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

// Initialize character and related elements
function initializeCharacter() {
    // Create the main character, direction indicator, and push arm
    character = createCharacter(scene);
    smileyFace = createDirectionIndicator(scene);
    pushArm = createPushArm(scene);
    cooldownIndicator = createCooldownIndicator(scene);
    aimIndicator = createAimIndicator(scene);
    
    // Position the smiley face in front of the character
    updateSmileyPosition(smileyFace, character, facingDirection);
}

// Initialize enemies
function initializeEnemies() {
    // Clear existing enemies
    for (let i = 0; i < enemies.length; i++) {
        scene.remove(enemies[i]);
    }
    enemies = [];
    
    // Create new enemies
    enemies = createEnemies(scene, platform, enemyCount, enemyMinSize, enemyMaxSize, enemyColor);
}

// Game over function
function gameOver() {
    gameActive = false;
    document.getElementById('gameOver').style.display = 'block';
}

// Reset game function
function resetGame() {
    try {
        // Reset character position and state
        if (character && platform) {
            character.position.set(0, platform.position.y + 1, 0);
        }
        
        // Reset physics and controls
        velocity.set(0, 0, 0);
        moveForward = false;
        moveBackward = false;
        moveLeft = false;
        moveRight = false;
        gameActive = true;
        facingDirection.set(0, 0, -1);
        isPushing = false;
        pushCooldown = false;
        isShooting = false;
        shootCooldown = false;
        
        // Hide game over screen
        document.getElementById('gameOver').style.display = 'none';
        
        // Clean up bullets
        for (let i = 0; i < bullets.length; i++) {
            cleanupBullet(bullets[i], scene);
        }
        bullets = [];
        
        // Hide aim indicator
        if (aimIndicator) {
            aimIndicator.visible = false;
        }
        
        // Recreate enemies
        initializeEnemies();
    } catch (error) {
        console.error("Error resetting game:", error);
        
        // Fallback reset for critical elements
        bullets = [];
        if (aimIndicator) aimIndicator.visible = false;
        document.getElementById('gameOver').style.display = 'none';
        gameActive = true;
    }
}

// Update character state
function updateCharacter() {
    // Apply physics - with safety check
    if (typeof applyPhysics === 'function') {
        if (!applyPhysics(character, velocity, platform)) {
            gameOver();
            return;
        }
    } else {
        // Fallback physics if applyPhysics is not defined
        velocity.y -= 0.01; // Simple gravity
        character.position.y += velocity.y;
        
        // Simple platform collision
        if (character.position.y < platform.position.y + 1) {
            character.position.y = platform.position.y + 1;
            velocity.y = 0;
        }
        
        // Check if character is on platform
        const distanceFromCenter = Math.sqrt(
            Math.pow(character.position.x, 2) + 
            Math.pow(character.position.z, 2)
        );
        
        if (distanceFromCenter > platform.userData.radius) {
            return false; // Character fell off
        }
    }
    
    // Update character position based on controls
    updateCharacterPosition(character, speed, velocity, platform);
    
    // Calculate aim direction
    const aimDirection = calculateAimDirection();
    
    // Update character rotation based on aim direction
    updateCharacterAim(character, aimDirection);
    
    // Update smiley face position
    updateSmileyPosition(smileyFace, character, facingDirection);
    
    // Update push arm position
    updatePushArm(pushArm, character, facingDirection, isPushing);
    
    // Update cooldown indicator - make sure to pass camera for proper orientation
    updateCooldownIndicator(cooldownIndicator, character, pushCooldown, lastPushTime, PUSH_COOLDOWN_TIME);
    
    // Update aim indicator
    if (isAiming && aimIndicator) {
        try {
            // Cast a ray from the camera through the mouse position
            raycaster.setFromCamera(mousePosition, camera);
            
            // Calculate the point where the ray intersects the platform plane
            const platformPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -platform.position.y);
            const targetPoint = new THREE.Vector3();
            
            // Check if the ray intersects the platform plane
            if (raycaster.ray.intersectPlane(platformPlane, targetPoint)) {
                // Update aim indicator position
                aimIndicator.visible = true;
                updateAimIndicator(aimIndicator, targetPoint, new THREE.Vector3(0, 1, 0));
            } else {
                aimIndicator.visible = false;
            }
        } catch (error) {
            console.error("Error updating aim indicator:", error);
            aimIndicator.visible = false;
        }
    } else if (aimIndicator) {
        aimIndicator.visible = false;
    }
    
    // Update camera to follow character - adjusted to be more from above
    camera.position.x = character.position.x;
    camera.position.y = character.position.y + 10; // Higher above the character
    camera.position.z = character.position.z + 6; // Closer to the character
    camera.lookAt(character.position);
}

// Animation loop
function animate() {
    try {
        window.animationFrameId = requestAnimationFrame(animate);
        
        if (gameActive) {
            try {
                updateCharacter();
            } catch (e) {
                console.error("Error updating character:", e);
                // Try to recover character position if there's an error
                if (character && platform) {
                    character.position.y = platform.position.y + 1;
                }
            }
            
            // Update game elements with error handling
            try { 
                if (typeof updateEnemies === 'function') {
                    enemies = updateEnemies(enemies, enemySpeed, platform); 
                }
            } catch (e) { console.error("Error updating enemies:", e); }
            
            try { 
                if (typeof updateBullets === 'function') {
                    bullets = updateBullets(bullets, scene, enemies); 
                }
            } catch (e) { console.error("Error updating bullets:", e); }
            
            try { 
                if (typeof checkCollisions === 'function') {
                    checkCollisions(character, enemies, velocity); 
                }
            } catch (e) { console.error("Error checking collisions:", e); }
            
            try { 
                if (typeof checkObstacleCollisions === 'function') {
                    checkObstacleCollisions(character, obstacles); 
                }
            } catch (e) { console.error("Error checking obstacle collisions:", e); }
        }
        
        // Render scene
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    } catch (error) {
        console.error("Animation loop error:", error);
        
        // Cancel current animation frame to prevent cascading errors
        if (window.animationFrameId) {
            cancelAnimationFrame(window.animationFrameId);
        }
        
        // Try to restart animation after a short delay
        setTimeout(() => {
            window.animationFrameId = requestAnimationFrame(animate);
        }, 1000);
    }
}

// Initialize the game when the page loads
window.onload = init;