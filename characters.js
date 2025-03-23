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

// Create push arm for attack animation (semi-sphere)
function createPushArm(scene) {
    // Create a semi-sphere for the push effect
    const armGeometry = new THREE.SphereGeometry(0.6, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0088FF,
        transparent: true,
        opacity: 0.7 // Semi-transparent to allow visibility through the effect while maintaining visual clarity
    });
    const pushArm = new THREE.Mesh(armGeometry, armMaterial);
    pushArm.visible = false; // Hide initially
    scene.add(pushArm);
    
    return pushArm;
}

// Create cooldown indicator
function createCooldownIndicator(scene) {
    // Make the indicator larger and more visible
    const indicatorGeometry = new THREE.PlaneGeometry(1.0, 0.2); // Increased size
    const indicatorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000,
        transparent: true,
        opacity: 1.0 // Full opacity for better visibility
    });
    const cooldownIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    
    // Create background for the indicator
    const bgGeometry = new THREE.PlaneGeometry(1.02, 0.22); // Slightly larger than the indicator
    const bgMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.8 // Increased opacity for better visibility
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    
    // Group the indicator and background
    const indicatorGroup = new THREE.Group();
    indicatorGroup.add(background);
    indicatorGroup.add(cooldownIndicator);
    
    // Position the indicator slightly behind the background
    cooldownIndicator.position.z = 0.01;
    
    // Make sure the indicator is visible by default (for debugging)
    indicatorGroup.visible = true; 
    
    // Add the indicator to the scene
    scene.add(indicatorGroup);
    
    return {
        group: indicatorGroup,
        indicator: cooldownIndicator,
        background: background
    };
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
        
        // Position the semi-sphere in front of the character (further out to ensure full visibility)
        pushArm.position.add(facingDirection.clone().multiplyScalar(0.8));
        
        // Reset all rotations first to avoid compounding rotation issues
        pushArm.rotation.set(0, 0, 0);
        
        // Properly orient the semi-sphere based on facing direction
        // The semi-sphere's flat side should face outward from the character
        
        // First, align the push arm with the character's facing direction
        const lookAtPos = pushArm.position.clone().add(facingDirection);
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.lookAt(pushArm.position, lookAtPos, new THREE.Vector3(0, 1, 0));
        pushArm.quaternion.setFromRotationMatrix(tempMatrix);
        
        // Then rotate it 90 degrees so the flat side faces outward
        // We need to rotate around the local X axis
        pushArm.rotateX(-Math.PI / 2);
    } else {
        pushArm.visible = false;
    }
}

// Update cooldown indicator
function updateCooldownIndicator(cooldownIndicator, character, isPushCooldown, lastPushTime, cooldownTime) {
    if (isPushCooldown) {
        // Show the indicator
        cooldownIndicator.group.visible = true;
        
        // Position above the character (increased height for better visibility)
        cooldownIndicator.group.position.copy(character.position);
        cooldownIndicator.group.position.y += 2.0; // Increased from 1.5 to 2.0 for better visibility
        
        // Make sure the indicator always faces the camera
        cooldownIndicator.group.rotation.set(0, 0, 0); // Reset rotation
        cooldownIndicator.group.lookAt(camera.position); // Make it face the camera
        
        // Make the indicator more visible
        cooldownIndicator.indicator.material.opacity = 1.0; // Full opacity
        cooldownIndicator.background.material.opacity = 0.8; // Increased background opacity
        
        // Calculate remaining cooldown percentage
        const elapsed = Date.now() - lastPushTime;
        const remainingPercentage = 1 - (elapsed / cooldownTime);
        
        // Update the indicator width based on remaining cooldown
        cooldownIndicator.indicator.scale.x = Math.max(0, remainingPercentage);
        
        // Adjust position to ensure it shrinks from right to left
        cooldownIndicator.indicator.position.x = (1 - cooldownIndicator.indicator.scale.x) * -0.4;
        
        // Debug - log to console when cooldown is active
        console.log("Cooldown active: " + remainingPercentage.toFixed(2));
    } else {
        // Hide the indicator when cooldown is complete
        cooldownIndicator.group.visible = false;
    }
}

// Create enemies
function createEnemies(scene, platform, enemyCount, minSize, maxSize, enemyColor) {
    const enemies = [];
    
    // Create new enemies
    for (let i = 0; i < enemyCount; i++) {
        // Generate random size between minSize and maxSize
        const size = minSize + Math.random() * (maxSize - minSize);
        
        const enemyGeometry = new THREE.SphereGeometry(size, 32, 32);
        const enemyMaterial = new THREE.MeshStandardMaterial({ color: enemyColor });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        
        // Random position on the platform
        const x = Math.random() * 16 - 8; // Range: -8 to 8
        const z = Math.random() * 16 - 8; // Range: -8 to 8
        
        // Position enemy exactly at platform height + enemy radius to ensure it's on the platform
        enemy.position.set(x, platform.position.y + 0.5 + size, z);
        
        // Store enemy properties in userData for better organization
        enemy.userData = {
            size: size,
            direction: new THREE.Vector3(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize(),
            nextDirectionChange: Math.random() * 2000 + 1000, // 1-3 seconds
            lastDirectionChange: Date.now(),
            isFalling: false,
            velocity: { y: 0 },
            pushVelocity: new THREE.Vector3(0, 0, 0), // Initialize push velocity
            isOnPlatform: true, // Initialize as being on the platform
            speedFactor: 1 - ((size - minSize) / (maxSize - minSize) * 0.5) // Larger balls move slower (50% speed reduction at max size)
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
            // Move enemy with normal movement - apply speedFactor based on size
            const adjustedSpeed = enemySpeed * enemy.userData.speedFactor;
            enemy.position.x += enemy.userData.direction.x * adjustedSpeed;
            enemy.position.z += enemy.userData.direction.z * adjustedSpeed;
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