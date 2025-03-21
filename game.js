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

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
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
    if (character.position.y <= 3 && isOnPlatform()) {
        character.position.y = 3; // 2 (platform height) + 0.5 (half character height) + 0.5 (half platform height)
        velocity.y = 0;
        canJump = true;
    }
    
    // Move character based on controls
    if (moveForward) {
        character.position.z -= speed;
    }
    
    if (moveBackward) {
        character.position.z += speed;
    }
    
    if (moveLeft) {
        character.position.x -= speed;
    }
    
    if (moveRight) {
        character.position.x += speed;
    }
    
    // Check if character fell off the platform
    if (!isOnPlatform() && character.position.y < 3) {
        canJump = false;
        // Let gravity do its work
    }
    
    // Check if character fell too far
    if (character.position.y < -10) {
        gameOver();
    }
    
    // Update camera to follow character
    camera.position.x = character.position.x;
    camera.position.z = character.position.z + 10;
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
    character.position.set(0, 3, 0); // Updated to be on top of the elevated platform
    velocity.set(0, 0, 0);
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    canJump = true;
    gameActive = true;
    document.getElementById('gameOver').style.display = 'none';
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (gameActive) {
        updateCharacter();
    }
    
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
window.onload = init;