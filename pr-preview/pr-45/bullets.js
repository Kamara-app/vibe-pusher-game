// Bullet functionality

// Bullet constants
const BULLET_SPEED = 0.4;
const BULLET_RADIUS = 0.1;
const BULLET_COLOR = 0xFFFF00;
const BULLET_LIFETIME = 2000; // milliseconds
const BULLET_DAMAGE = 1;

// Create a bullet
function createBullet(scene, position, direction) {
    const bulletGeometry = new THREE.SphereGeometry(BULLET_RADIUS, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: BULLET_COLOR });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position the bullet at the character's position
    bullet.position.copy(position);
    
    // Move the bullet slightly forward to prevent collision with the character
    bullet.position.add(direction.clone().multiplyScalar(0.6));
    
    // Store bullet properties
    bullet.userData = {
        direction: direction.clone().normalize(),
        creationTime: Date.now(),
        isDead: false
    };
    
    // Add bullet to scene
    scene.add(bullet);
    
    // Add a trail effect
    const trailGeometry = new THREE.CylinderGeometry(0.05, 0.02, 0.3, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFAA00,
        transparent: true,
        opacity: 0.7
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    bullet.add(trail);
    
    // Position the trail behind the bullet
    trail.position.set(0, 0, -0.2);
    
    // Rotate the trail to align with the bullet's direction
    trail.rotation.x = Math.PI / 2;
    
    return bullet;
}

// Update bullets position and check lifetime
function updateBullets(bullets, scene, enemies) {
    const currentTime = Date.now();
    const bulletsToRemove = [];
    
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        
        // Skip if bullet is already marked as dead
        if (bullet.userData.isDead) {
            continue;
        }
        
        // Move bullet in its direction
        bullet.position.add(bullet.userData.direction.clone().multiplyScalar(BULLET_SPEED));
        
        // Check if bullet has exceeded its lifetime
        if (currentTime - bullet.userData.creationTime > BULLET_LIFETIME) {
            bullet.userData.isDead = true;
            bulletsToRemove.push(i);
            continue;
        }
        
        // Check for collisions with enemies
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            
            // Skip if enemy is already falling
            if (enemy.userData.isFalling) {
                continue;
            }
            
            // Calculate distance between bullet and enemy
            const distance = bullet.position.distanceTo(enemy.position);
            
            // If collision detected
            if (distance < BULLET_RADIUS + enemy.userData.size) {
                // Mark bullet as dead
                bullet.userData.isDead = true;
                bulletsToRemove.push(i);
                
                // Apply "death" effect to enemy
                killEnemy(enemy);
                
                // Create hit effect
                createHitEffect(scene, bullet.position);
                
                break;
            }
        }
        
        // Check if bullet is off the platform
        const distanceFromCenter = Math.sqrt(
            Math.pow(bullet.position.x, 2) + 
            Math.pow(bullet.position.z, 2)
        );
        
        if (distanceFromCenter > PLATFORM_RADIUS) {
            bullet.userData.isDead = true;
            bulletsToRemove.push(i);
        }
    }
    
    // Remove dead bullets (in reverse order to avoid index issues)
    for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
        const index = bulletsToRemove[i];
        const bullet = bullets[index];
        scene.remove(bullet);
        bullets.splice(index, 1);
    }
    
    return bullets;
}

// Create hit effect at the collision point
function createHitEffect(scene, position) {
    // Create a flash effect
    const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFF00,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    scene.add(flash);
    
    // Animate the flash effect
    const startTime = Date.now();
    const duration = 300; // milliseconds
    
    function animateFlash() {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            const scale = 1 + elapsed / duration;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 * (1 - elapsed / duration);
            requestAnimationFrame(animateFlash);
        } else {
            scene.remove(flash);
        }
    }
    
    animateFlash();
}

// Handle enemy "death" when hit by bullets
function killEnemy(enemy) {
    // Mark enemy as falling
    enemy.userData.isFalling = true;
    
    // Apply upward force
    enemy.userData.velocity.y = 0.2;
    
    // Change color to indicate hit
    enemy.material.color.set(0x888888);
    
    // Apply random horizontal force
    if (!enemy.userData.pushVelocity) {
        enemy.userData.pushVelocity = new THREE.Vector3();
    }
    
    // Random direction with small upward component
    enemy.userData.pushVelocity.set(
        (Math.random() - 0.5) * 0.1,
        0.05,
        (Math.random() - 0.5) * 0.1
    );
    
    // Mark as hit by bullet
    enemy.userData.hitByBullet = true;
}

// Create aim indicator
function createAimIndicator(scene) {
    // Create a crosshair group
    const aimGroup = new THREE.Group();
    
    // Create crosshair lines
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFF0000 });
    
    // Horizontal line
    const horizontalGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.2, 0, 0),
        new THREE.Vector3(0.2, 0, 0)
    ]);
    const horizontalLine = new THREE.Line(horizontalGeometry, lineMaterial);
    aimGroup.add(horizontalLine);
    
    // Vertical line
    const verticalGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.2, 0),
        new THREE.Vector3(0, 0.2, 0)
    ]);
    const verticalLine = new THREE.Line(verticalGeometry, lineMaterial);
    aimGroup.add(verticalLine);
    
    // Create a small circle
    const circleGeometry = new THREE.CircleGeometry(0.1, 16);
    circleGeometry.vertices.shift(); // Remove center vertex
    const circle = new THREE.Line(circleGeometry, lineMaterial);
    aimGroup.add(circle);
    
    // Make aim indicator invisible initially
    aimGroup.visible = false;
    
    scene.add(aimGroup);
    return aimGroup;
}

// Update aim indicator position
function updateAimIndicator(aimIndicator, position, normal) {
    aimIndicator.position.copy(position);
    
    // Make the aim indicator face the camera
    aimIndicator.lookAt(camera.position);
    
    // Offset slightly to avoid z-fighting with the ground
    aimIndicator.position.add(normal.clone().multiplyScalar(0.05));
}