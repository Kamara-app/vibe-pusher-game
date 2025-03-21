// Character creation and management functions

// Create the player character
function createCharacter(scene) {
    const characterGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const characterMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    const character = new THREE.Mesh(characterGeometry, characterMaterial);
    character.position.set(0, 3, 0); // On top of the elevated platform (2 + 0.5 + 0.5)
    scene.add(character);
    
    return character;
}

// Create direction indicator (smiley face)
function createDirectionIndicator(scene) {
    // Create smiley face indicator for direction - increased size
    const smileyGeometry = new THREE.CircleGeometry(0.25, 32);
    const smileyMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const smileyFace = new THREE.Mesh(smileyGeometry, smileyMaterial);
    
    // Add eyes and mouth to the smiley - slightly larger eyes
    const leftEyeGeometry = new THREE.CircleGeometry(0.06, 16);
    const rightEyeGeometry = new THREE.CircleGeometry(0.06, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 0.06, 0.01);
    smileyFace.add(leftEye);
    
    const rightEye = new THREE.Mesh(rightEyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 0.06, 0.01);
    smileyFace.add(rightEye);
    
    // Create a more pronounced smile using a curved line
    const smileGeometry = new THREE.BufferGeometry();
    const smileCurve = new THREE.EllipseCurve(
        0, -0.04, // center - slightly lower
        0.12, 0.07, // x radius, y radius - larger smile
        Math.PI, 0, // start angle, end angle
        true // clockwise
    );
    const smilePoints = smileCurve.getPoints(30); // More points for smoother curve
    smileGeometry.setFromPoints(smilePoints);
    const smileMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000,
        linewidth: 2 // Thicker line for better visibility
    });
    const smile = new THREE.Line(smileGeometry, smileMaterial);
    smile.position.z = 0.01;
    smileyFace.add(smile);
    
    scene.add(smileyFace);
    return smileyFace;
}

// Create push arm for attack animation
function createPushArm(scene) {
    const armGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    const pushArm = new THREE.Mesh(armGeometry, armMaterial);
    pushArm.visible = false; // Hide initially
    scene.add(pushArm);
    
    return pushArm;
}

// Update smiley face position based on character position and facing direction
function updateSmileyPosition(smileyFace, character, facingDirection) {
    // Position smiley face 0.6 units in front of the character in the facing direction
    smileyFace.position.copy(character.position);
    
    // Add a small Y offset to position it slightly higher
    smileyFace.position.y += 0.15;
    
    // Position it closer to the character (0.6 instead of 0.8)
    smileyFace.position.add(facingDirection.clone().multiplyScalar(0.6));
    
    // Make smiley face look in the same direction as the character
    smileyFace.lookAt(smileyFace.position.clone().add(facingDirection));
    
    // Tilt the smiley face upward for better visibility from the camera
    // Apply a rotation to tilt it slightly upward (around the X-axis)
    smileyFace.rotation.x = Math.PI * 0.15;
}

// Update push arm position and rotation
function updatePushArm(pushArm, character, facingDirection, isPushing) {
    if (isPushing) {
        pushArm.visible = true;
        pushArm.position.copy(character.position);
        
        // Position the arm in front of the character
        pushArm.position.add(facingDirection.clone().multiplyScalar(0.4));
        
        // Rotate the arm to align with the facing direction
        pushArm.rotation.y = Math.atan2(facingDirection.x, facingDirection.z);
    } else {
        pushArm.visible = false;
    }
}

// Create enemies
function createEnemies(scene, platform, enemyCount, enemySize, enemyColor) {
    const enemies = [];
    
    // Create new enemies
    for (let i = 0; i < enemyCount; i++) {
        const enemyGeometry = new THREE.SphereGeometry(enemySize, 32, 32);
        const enemyMaterial = new THREE.MeshStandardMaterial({ color: enemyColor });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        
        // Random position on the platform
        const x = Math.random() * 16 - 8; // Range: -8 to 8
        const z = Math.random() * 16 - 8; // Range: -8 to 8
        enemy.position.set(x, platform.position.y + enemySize + 0.5, z);
        
        // Store enemy properties in userData for better organization
        enemy.userData = {
            size: enemySize,
            direction: new THREE.Vector3(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize(),
            nextDirectionChange: Math.random() * 2000 + 1000, // 1-3 seconds
            lastDirectionChange: Date.now(),
            isFalling: false,
            velocity: { y: 0 },
            pushVelocity: new THREE.Vector3(0, 0, 0) // Initialize push velocity
        };
        
        scene.add(enemy);
        enemies.push(enemy);
    }
    
    return enemies;
}

// Helper function to handle boundary collisions
function handleBoundaryCollision(enemy, minBound, maxBound, axis) {
    if (enemy.position[axis] < minBound) {
        enemy.position[axis] = minBound;
        enemy.userData.direction[axis] *= -1;
        if (enemy.userData.pushVelocity) enemy.userData.pushVelocity[axis] *= -0.5; // Bounce with reduced energy
    } else if (enemy.position[axis] > maxBound) {
        enemy.position[axis] = maxBound;
        enemy.userData.direction[axis] *= -1;
        if (enemy.userData.pushVelocity) enemy.userData.pushVelocity[axis] *= -0.5; // Bounce with reduced energy
    }
}

// Update enemy positions
function updateEnemies(enemies, enemySpeed, platform) {
    const now = Date.now();
    const enemiesToRemove = [];
    const PUSH_DECELERATION = 0.15; // How quickly push velocity decreases
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Apply physics to enemy
        const enemyStaysInGame = applyEnemyPhysics(enemy, platform);
        if (!enemyStaysInGame) {
            enemiesToRemove.push(i);
            continue;
        }
        
        // Skip movement logic if enemy is falling
        if (enemy.userData.isFalling) {
            continue;
        }
        
        // Check if it's time to change direction
        if (now - enemy.userData.lastDirectionChange > enemy.userData.nextDirectionChange) {
            enemy.userData.direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize();
            
            enemy.userData.nextDirectionChange = Math.random() * 2000 + 1000;
            enemy.userData.lastDirectionChange = now;
        }
        
        // Handle push velocity first
        let movementFromPush = false;
        if (enemy.userData.pushVelocity && 
            (Math.abs(enemy.userData.pushVelocity.x) > 0.01 || 
             Math.abs(enemy.userData.pushVelocity.z) > 0.01)) {
            
            // Apply push velocity
            enemy.position.x += enemy.userData.pushVelocity.x;
            enemy.position.z += enemy.userData.pushVelocity.z;
            
            // Gradually reduce push velocity (deceleration)
            enemy.userData.pushVelocity.x *= (1 - PUSH_DECELERATION);
            enemy.userData.pushVelocity.z *= (1 - PUSH_DECELERATION);
            
            // If push velocity is very small, reset it to zero
            if (Math.abs(enemy.userData.pushVelocity.x) < 0.01) enemy.userData.pushVelocity.x = 0;
            if (Math.abs(enemy.userData.pushVelocity.z) < 0.01) enemy.userData.pushVelocity.z = 0;
            
            movementFromPush = true;
        }
        
        // Only apply normal movement if not being pushed
        if (!movementFromPush) {
            // Move enemy with normal movement
            enemy.position.x += enemy.userData.direction.x * enemySpeed;
            enemy.position.z += enemy.userData.direction.z * enemySpeed;
        }
        
        // Keep enemy on platform - only if they're still on the platform
        if (isOnPlatform(enemy, platform)) {
            // Handle boundary collisions
            handleBoundaryCollision(enemy, -ENEMY_BOUNDARY, ENEMY_BOUNDARY, 'x');
            handleBoundaryCollision(enemy, -ENEMY_BOUNDARY, ENEMY_BOUNDARY, 'z');
        }
    }
    
    // Remove enemies that fell too far
    for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
        const index = enemiesToRemove[i];
        const enemy = enemies[index];
        enemy.parent.remove(enemy); // Remove from scene
        enemies.splice(index, 1); // Remove from array
    }
    
    return enemies;
}