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

// Create direction indicator (eyes)
function createDirectionIndicator(scene) {
    // Create a group to hold both eyes
    const eyesGroup = new THREE.Group();
    
    // Create white spheres for the eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 0.3, 0);
    eyesGroup.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 0.3, 0);
    eyesGroup.add(rightEye);
    
    // Create black pupils
    const pupilGeometry = new THREE.SphereGeometry(0.06, 12, 12);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Left pupil
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, 0.09);
    leftEye.add(leftPupil);
    
    // Right pupil
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0, 0, 0.09);
    rightEye.add(rightPupil);
    
    scene.add(eyesGroup);
    return eyesGroup;
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

// Update eyes position based on character position and facing direction
function updateSmileyPosition(eyesGroup, character, facingDirection) {
    // Position eyes directly on top of the character
    eyesGroup.position.copy(character.position);
    
    // Make eyes look in the direction the character is facing
    const lookAtPos = eyesGroup.position.clone().add(facingDirection);
    eyesGroup.lookAt(lookAtPos);
    
    // Adjust rotation to keep eyes level but looking in the right direction
    eyesGroup.rotation.x = 0;
    eyesGroup.rotation.z = 0;
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
    // Only apply boundary restrictions if the enemy is not being pushed
    if (!enemy.userData.isPushed) {
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
        
        // Keep enemy on platform - only if they're still on the platform and not being pushed
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