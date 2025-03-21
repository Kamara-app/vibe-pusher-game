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
    // Create smiley face indicator for direction
    const smileyGeometry = new THREE.CircleGeometry(0.2, 32);
    const smileyMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const smileyFace = new THREE.Mesh(smileyGeometry, smileyMaterial);
    
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
    // Position smiley face 0.8 units in front of the character in the facing direction
    smileyFace.position.copy(character.position);
    smileyFace.position.add(facingDirection.clone().multiplyScalar(0.8));
    
    // Make smiley face look in the same direction as the character
    smileyFace.lookAt(smileyFace.position.clone().add(facingDirection));
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
    
    return enemies;
}