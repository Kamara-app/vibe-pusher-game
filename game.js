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
    initializeEnemies();
    
    // Initialize controls
    initControls();
    
    // Add reset button functionality
    document.getElementById('resetButton').addEventListener('click', resetGame);
    
    // Start animation loop
    animate();
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
    
    // Create obstacles with movement properties
    const obstacleConfigs = [
        { 
            pos: { x: 4, z: 4 },
            type: { type: 'box', width: 1.5, height: 2, depth: 1.5, color: 0x8B4513 },
            movement: { 
                pattern: 'linear', 
                speed: 0.03, 
                direction: new THREE.Vector3(-1, 0, 0),
                maxDistance: 6
            }
        },
        { 
            pos: { x: -5, z: 2 },
            type: { type: 'cylinder', radius: 1, height: 2, color: 0x708090 },
            movement: { 
                pattern: 'circular', 
                speed: 0.02, 
                radius: 3,
                angle: 0
            }
        },
        { 
            pos: { x: 0, z: -6 },
            type: { type: 'box', width: 2, height: 1.5, depth: 1, color: 0x8B4513 },
            movement: { 
                pattern: 'zigzag', 
                speed: 0.04, 
                direction: new THREE.Vector3(1, 0, 1).normalize(),
                changeTimer: 0,
                changeInterval: 2000
            }
        },
        { 
            pos: { x: -3, z: -4 },
            type: { type: 'cylinder', radius: 0.8, height: 3, color: 0x708090 },
            movement: { 
                pattern: 'bounce', 
                speed: 0.05, 
                direction: new THREE.Vector3(0.7, 0, 0.7).normalize(),
                originalPos: { x: -3, z: -4 }
            }
        }
    ];
    
    for (let i = 0; i < obstacleConfigs.length; i++) {
        let obstacle;
        const config = obstacleConfigs[i];
        const pos = config.pos;
        const type = config.type;
        
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
        
        // Set initial position
        obstacle.position.set(pos.x, platform.position.y + type.height/2, pos.z);
        
        // Store movement properties in userData
        obstacle.userData.movement = config.movement;
        
        // For bounce pattern, store original position
        if (config.movement.pattern === 'bounce') {
            obstacle.userData.movement.originalPos = {
                x: obstacle.position.x,
                z: obstacle.position.z
            };
        }
        
        // For linear pattern, store starting position for distance calculation
        if (config.movement.pattern === 'linear') {
            obstacle.userData.movement.startPos = {
                x: obstacle.position.x,
                z: obstacle.position.z
            };
            obstacle.userData.movement.currentDistance = 0;
            obstacle.userData.movement.movingForward = true;
        }
        
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
    character.position.set(0, platform.position.y + 1, 0); // Updated to be on top of the elevated platform
    velocity.set(0, 0, 0);
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    gameActive = true;
    facingDirection.set(0, 0, -1); // Reset facing direction
    isPushing = false;
    pushCooldown = false;
    document.getElementById('gameOver').style.display = 'none';
    
    // Recreate enemies
    initializeEnemies();
}

// Update character state
function updateCharacter() {
    // Apply physics
    if (!applyPhysics(character, velocity, platform)) {
        gameOver();
        return;
    }
    
    // Update character position based on controls
    updateCharacterPosition(character, speed, velocity, platform);
    
    // Update smiley face position
    updateSmileyPosition(smileyFace, character, facingDirection);
    
    // Update push arm position
    updatePushArm(pushArm, character, facingDirection, isPushing);
    
    // Update cooldown indicator - make sure to pass camera for proper orientation
    updateCooldownIndicator(cooldownIndicator, character, pushCooldown, lastPushTime, PUSH_COOLDOWN_TIME);
    
    // Update camera to follow character - adjusted to be more from above
    camera.position.x = character.position.x;
    camera.position.y = character.position.y + 10; // Higher above the character
    camera.position.z = character.position.z + 6; // Closer to the character
    camera.lookAt(character.position);
}

// Update obstacle positions based on their movement patterns
function updateObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        const movement = obstacle.userData.movement;
        
        if (!movement) continue;
        
        switch (movement.pattern) {
            case 'linear':
                // Linear back-and-forth movement
                if (movement.movingForward) {
                    obstacle.position.x += movement.direction.x * movement.speed;
                    obstacle.position.z += movement.direction.z * movement.speed;
                    movement.currentDistance += movement.speed;
                    
                    if (movement.currentDistance >= movement.maxDistance) {
                        movement.movingForward = false;
                    }
                } else {
                    obstacle.position.x -= movement.direction.x * movement.speed;
                    obstacle.position.z -= movement.direction.z * movement.speed;
                    movement.currentDistance -= movement.speed;
                    
                    if (movement.currentDistance <= 0) {
                        movement.movingForward = true;
                    }
                }
                break;
                
            case 'circular':
                // Circular movement
                movement.angle += movement.speed;
                const newX = movement.startPos ? movement.startPos.x : obstacle.position.x;
                const newZ = movement.startPos ? movement.startPos.z : obstacle.position.z;
                
                obstacle.position.x = newX + Math.cos(movement.angle) * movement.radius;
                obstacle.position.z = newZ + Math.sin(movement.angle) * movement.radius;
                break;
                
            case 'zigzag':
                // Change direction periodically
                const now = Date.now();
                if (now - movement.changeTimer > movement.changeInterval) {
                    // Rotate direction by a random angle
                    const angle = (Math.random() * Math.PI/2) - Math.PI/4; // -45 to +45 degrees
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    
                    // Rotate the direction vector
                    const newX = movement.direction.x * cos - movement.direction.z * sin;
                    const newZ = movement.direction.x * sin + movement.direction.z * cos;
                    
                    movement.direction.x = newX;
                    movement.direction.z = newZ;
                    movement.direction.normalize();
                    
                    movement.changeTimer = now;
                }
                
                // Move in current direction
                obstacle.position.x += movement.direction.x * movement.speed;
                obstacle.position.z += movement.direction.z * movement.speed;
                
                // Keep within platform bounds
                const distanceFromCenter = Math.sqrt(
                    Math.pow(obstacle.position.x, 2) + 
                    Math.pow(obstacle.position.z, 2)
                );
                
                if (distanceFromCenter > platform.userData.radius - 1) {
                    // Reflect direction when hitting the edge
                    const normal = new THREE.Vector3(
                        obstacle.position.x, 
                        0, 
                        obstacle.position.z
                    ).normalize();
                    
                    // Reflect direction vector around normal
                    const dot = movement.direction.dot(normal);
                    movement.direction.sub(normal.multiplyScalar(2 * dot));
                    
                    // Move slightly inward
                    const inwardDir = normal.clone().multiplyScalar(-0.1);
                    obstacle.position.x += inwardDir.x;
                    obstacle.position.z += inwardDir.z;
                }
                break;
                
            case 'bounce':
                // Move in current direction
                obstacle.position.x += movement.direction.x * movement.speed;
                obstacle.position.z += movement.direction.z * movement.speed;
                
                // Check if obstacle is too far from its original position
                const distFromOrigin = Math.sqrt(
                    Math.pow(obstacle.position.x - movement.originalPos.x, 2) + 
                    Math.pow(obstacle.position.z - movement.originalPos.z, 2)
                );
                
                // Check if obstacle is near platform edge
                const distanceFromCenter = Math.sqrt(
                    Math.pow(obstacle.position.x, 2) + 
                    Math.pow(obstacle.position.z, 2)
                );
                
                if (distFromOrigin > 6 || distanceFromCenter > platform.userData.radius - 1) {
                    // Bounce back toward original position
                    const toOrigin = new THREE.Vector3(
                        movement.originalPos.x - obstacle.position.x,
                        0,
                        movement.originalPos.z - obstacle.position.z
                    ).normalize();
                    
                    // Mix current direction with direction to origin
                    movement.direction.x = (movement.direction.x + toOrigin.x) / 2;
                    movement.direction.z = (movement.direction.z + toOrigin.z) / 2;
                    movement.direction.normalize();
                }
                break;
        }
        
        // Initialize startPos for circular movement if not set
        if (movement.pattern === 'circular' && !movement.startPos) {
            movement.startPos = {
                x: obstacle.position.x,
                z: obstacle.position.z
            };
        }
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (gameActive) {
        updateCharacter();
        updateObstacles();
        enemies = updateEnemies(enemies, enemySpeed, platform);
        checkCollisions(character, enemies, velocity);
        checkObstacleCollisions(character, obstacles);
    }
    
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
window.onload = init;