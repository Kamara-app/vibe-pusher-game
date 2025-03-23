// Character and enemy functionality

// Create the main character
function createCharacter(scene) {
    // Create character body
    const characterGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const characterMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    const character = new THREE.Mesh(characterGeometry, characterMaterial);
    character.position.y = 3; // Start above platform
    
    // Create character mesh container for animations
    character.mesh = new THREE.Group();
    scene.add(character.mesh);
    
    // Add character body to mesh
    character.mesh.add(character);
    
    // Create eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.2, 0.2, 0.4);
    character.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-0.2, 0.2, 0.4);
    character.add(rightEye);
    
    // Create pupils
    const pupilGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Left pupil
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, 0.05);
    leftEye.add(leftPupil);
    
    // Right pupil
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0, 0, 0.05);
    rightEye.add(rightPupil);
    
    // Store eyes for animation
    character.eyes = new THREE.Group();
    character.eyes.add(leftEye);
    character.eyes.add(rightEye);
    
    return character;
}

// Create direction indicator (smiley face)
function createDirectionIndicator(scene) {
    // Create smiley face group
    const smileyGroup = new THREE.Group();
    
    // Create smiley face
    const smileyGeometry = new THREE.CircleGeometry(0.3, 32);
    const smileyMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const smiley = new THREE.Mesh(smileyGeometry, smileyMaterial);
    smileyGroup.add(smiley);
    
    // Create eyes
    const eyeGeometry = new THREE.CircleGeometry(0.05, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.1, 0.01);
    smileyGroup.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.1, 0.01);
    smileyGroup.add(rightEye);
    
    // Create smile
    const smileGeometry = new THREE.BufferGeometry();
    const smileCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-0.1, -0.1, 0.01),
        new THREE.Vector3(-0.05, -0.15, 0.01),
        new THREE.Vector3(0.05, -0.15, 0.01),
        new THREE.Vector3(0.1, -0.1, 0.01)
    );
    
    const smilePoints = smileCurve.getPoints(10);
    smileGeometry.setFromPoints(smilePoints);
    
    const smileMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const smile = new THREE.Line(smileGeometry, smileMaterial);
    smileyGroup.add(smile);
    
    // Add to scene
    scene.add(smileyGroup);
    
    // Make invisible initially
    smileyGroup.visible = false;
    
    return smileyGroup;
}

// Update smiley position
function updateSmileyPosition(smiley, character, direction) {
    // Position smiley in front of character
    smiley.position.copy(character.position);
    smiley.position.add(direction.clone().multiplyScalar(1.5));
    
    // Make smiley face the camera
    if (window.camera) {
        smiley.lookAt(window.camera.position);
    }
    
    // Show smiley only when pushing
    smiley.visible = isPushing;
}

// Create push arm
function createPushArm(scene) {
    // Create arm group
    const armGroup = new THREE.Group();
    
    // Create arm
    const armGeometry = new THREE.BoxGeometry(0.2, 0.2, 1);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.z = 0.5; // Position arm forward
    armGroup.add(arm);
    
    // Create hand
    const handGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const handMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF });
    const hand = new THREE.Mesh(handGeometry, handMaterial);
    hand.position.z = 1; // Position hand at end of arm
    armGroup.add(hand);
    
    // Add to scene
    scene.add(armGroup);
    
    // Make invisible initially
    armGroup.visible = false;
    
    return armGroup;
}

// Update push arm position
function updatePushArm(arm, character, direction, isPushing) {
    // Position arm at character
    arm.position.copy(character.position);
    
    // Rotate arm to face direction
    const angle = Math.atan2(direction.x, direction.z);
    arm.rotation.y = angle;
    
    // Show arm only when pushing
    arm.visible = isPushing;
    
    // Animate arm when pushing
    if (isPushing) {
        // Extend arm forward
        arm.children[0].scale.z = 1.5;
        arm.children[1].position.z = 1.5;
    } else {
        // Reset arm
        arm.children[0].scale.z = 1;
        arm.children[1].position.z = 1;
    }
}

// Create cooldown indicator
function createCooldownIndicator(scene) {
    // Create indicator group
    const indicatorGroup = new THREE.Group();
    
    // Create background circle
    const bgGeometry = new THREE.CircleGeometry(0.4, 32);
    const bgMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.5
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    indicatorGroup.add(background);
    
    // Create progress circle
    const progressGeometry = new THREE.CircleGeometry(0.3, 32);
    const progressMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
    const progress = new THREE.Mesh(progressGeometry, progressMaterial);
    progress.position.z = 0.01; // Slightly in front of background
    indicatorGroup.add(progress);
    
    // Add to scene
    scene.add(indicatorGroup);
    
    // Make invisible initially
    indicatorGroup.visible = false;
    
    return indicatorGroup;
}

// Update cooldown indicator
function updateCooldownIndicator(indicator, character, isOnCooldown, lastUseTime, cooldownTime) {
    // Position indicator above character
    indicator.position.copy(character.position);
    indicator.position.y += 1.2;
    
    // Make indicator face the camera
    if (window.camera) {
        indicator.lookAt(window.camera.position);
    }
    
    // Show indicator only when on cooldown
    indicator.visible = isOnCooldown;
    
    // Update progress
    if (isOnCooldown) {
        const elapsed = Date.now() - lastUseTime;
        const progress = Math.min(elapsed / cooldownTime, 1);
        
        // Scale progress circle based on cooldown
        indicator.children[1].scale.set(progress, progress, 1);
        
        // Change color based on progress
        if (progress < 0.5) {
            indicator.children[1].material.color.setRGB(1, progress * 2, 0); // Red to Yellow
        } else {
            indicator.children[1].material.color.setRGB(1 - (progress - 0.5) * 2, 1, 0); // Yellow to Green
        }
    }
}

// Create enemies
function createEnemies(scene, platform, count, minSize, maxSize, color) {
    const enemies = [];
    
    for (let i = 0; i < count; i++) {
        // Random size
        const size = Math.random() * (maxSize - minSize) + minSize;
        
        // Create enemy
        const enemyGeometry = new THREE.SphereGeometry(size, 32, 32);
        const enemyMaterial = new THREE.MeshStandardMaterial({ color: color });
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        
        // Random position on platform
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 50) {
            // Random angle and distance from center
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (platform.userData.radius - size - 1);
            
            // Calculate position
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Check distance from character
            const distanceFromCharacter = Math.sqrt(
                Math.pow(x, 2) + Math.pow(z, 2)
            );
            
            // Ensure enemy is not too close to character
            if (distanceFromCharacter > 3) {
                enemy.position.set(x, platform.position.y + size, z);
                validPosition = true;
            }
            
            attempts++;
        }
        
        // If couldn't find valid position, place at default position
        if (!validPosition) {
            enemy.position.set(
                (Math.random() - 0.5) * platform.userData.radius * 0.8,
                platform.position.y + size,
                (Math.random() - 0.5) * platform.userData.radius * 0.8
            );
        }
        
        // Store enemy properties
        enemy.userData = {
            size: size,
            speed: enemySpeed * (1 - (size - minSize) / (maxSize - minSize) * 0.5), // Smaller enemies are faster
            isFalling: false,
            pushVelocity: new THREE.Vector3(0, 0, 0)
        };
        
        // Add to scene and array
        scene.add(enemy);
        enemies.push(enemy);
    }
    
    return enemies;
}

// Update enemies
function updateEnemies(enemies, speed, platform) {
    const enemiesToRemove = [];
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Apply physics to enemy
        if (typeof applyEnemyPhysics === 'function') {
            const keepEnemy = applyEnemyPhysics(enemy, platform);
            
            if (!keepEnemy) {
                enemiesToRemove.push(i);
                continue;
            }
        } else {
            // Fallback physics if applyEnemyPhysics is not defined
            if (enemy.userData.isFalling) {
                enemy.position.y -= 0.1;
                
                if (enemy.position.y < -10) {
                    enemiesToRemove.push(i);
                    continue;
                }
            }
        }
        
        // Skip AI for falling enemies
        if (enemy.userData.isFalling) {
            continue;
        }
        
        // Simple AI: move toward character
        if (character) {
            // Calculate direction to character
            const direction = new THREE.Vector3()
                .subVectors(character.position, enemy.position)
                .normalize();
            
            // Move enemy toward character
            enemy.position.x += direction.x * enemy.userData.speed;
            enemy.position.z += direction.z * enemy.userData.speed;
            
            // Keep enemy on platform
            const distanceFromCenter = Math.sqrt(
                Math.pow(enemy.position.x, 2) + 
                Math.pow(enemy.position.z, 2)
            );
            
            if (distanceFromCenter > platform.userData.radius - enemy.userData.size) {
                // Move enemy back onto platform
                const toPlatformCenter = new THREE.Vector3()
                    .subVectors(new THREE.Vector3(0, enemy.position.y, 0), enemy.position)
                    .normalize();
                
                enemy.position.x += toPlatformCenter.x * 0.1;
                enemy.position.z += toPlatformCenter.z * 0.1;
            }
        }
    }
    
    // Remove enemies (in reverse order to avoid index issues)
    for (let i = enemiesToRemove.length - 1; i >= 0; i--) {
        const index = enemiesToRemove[i];
        const enemy = enemies[index];
        
        // Remove from scene
        scene.remove(enemy);
        
        // Remove from array
        enemies.splice(index, 1);
    }
    
    return enemies;
}