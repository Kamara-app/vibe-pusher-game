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
    
    // Store references for cleanup
    bullet.userData.geometry = bulletGeometry;
    bullet.userData.material = bulletMaterial;
    bullet.userData.trail = {
        mesh: trail,
        geometry: trailGeometry,
        material: trailMaterial
    };
    
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
                createHitEffect(scene, bullet.position.clone());
                
                break;
            }
        }
        
        // Check if bullet is off the platform
        if (typeof PLATFORM_RADIUS !== 'undefined') {
            const distanceFromCenter = Math.sqrt(
                Math.pow(bullet.position.x, 2) + 
                Math.pow(bullet.position.z, 2)
            );
            
            if (distanceFromCenter > PLATFORM_RADIUS) {
                bullet.userData.isDead = true;
                bulletsToRemove.push(i);
            }
        }
    }
    
    // Remove dead bullets (in reverse order to avoid index issues)
    for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
        const index = bulletsToRemove[i];
        const bullet = bullets[index];
        
        cleanupBullet(bullet, scene);
        bullets.splice(index, 1);
    }
    
    return bullets;
}

// Clean up bullet resources
function cleanupBullet(bullet, scene) {
    if (!bullet) return;
    
    // Remove trail first
    if (bullet.userData.trail && bullet.userData.trail.mesh) {
        bullet.remove(bullet.userData.trail.mesh);
        
        if (bullet.userData.trail.material) {
            bullet.userData.trail.material.dispose();
        }
        if (bullet.userData.trail.geometry) {
            bullet.userData.trail.geometry.dispose();
        }
    }
    
    // Dispose of bullet resources
    if (bullet.userData.material) {
        bullet.userData.material.dispose();
    }
    if (bullet.userData.geometry) {
        bullet.userData.geometry.dispose();
    }
    
    // Remove from scene
    scene.remove(bullet);
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
    let animationFrameId;
    
    function animateFlash() {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            const scale = 1 + elapsed / duration;
            flash.scale.set(scale, scale, scale);
            flash.material.opacity = 0.8 * (1 - elapsed / duration);
            animationFrameId = requestAnimationFrame(animateFlash);
        } else {
            // Clean up resources
            if (flash.material) {
                flash.material.dispose();
            }
            if (flashGeometry) {
                flashGeometry.dispose();
            }
            
            // Remove from scene
            scene.remove(flash);
            
            // Cancel animation frame
            cancelAnimationFrame(animationFrameId);
        }
    }
    
    // Start animation
    animationFrameId = requestAnimationFrame(animateFlash);
    
    // Safety cleanup - if for some reason the animation doesn't complete
    setTimeout(() => {
        if (scene.children.includes(flash)) {
            if (flash.material) {
                flash.material.dispose();
            }
            if (flashGeometry) {
                flashGeometry.dispose();
            }
            scene.remove(flash);
            cancelAnimationFrame(animationFrameId);
        }
    }, duration * 2);
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
    const horizontalPoints = [
        new THREE.Vector3(-0.2, 0, 0),
        new THREE.Vector3(0.2, 0, 0)
    ];
    const horizontalGeometry = new THREE.BufferGeometry().setFromPoints(horizontalPoints);
    const horizontalLine = new THREE.Line(horizontalGeometry, lineMaterial);
    aimGroup.add(horizontalLine);
    
    // Vertical line
    const verticalPoints = [
        new THREE.Vector3(0, -0.2, 0),
        new THREE.Vector3(0, 0.2, 0)
    ];
    const verticalGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints);
    const verticalLine = new THREE.Line(verticalGeometry, lineMaterial);
    aimGroup.add(verticalLine);
    
    // Create a small circle using points
    const circlePoints = [];
    const radius = 0.1;
    const segments = 16;
    
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        circlePoints.push(
            new THREE.Vector3(
                Math.cos(theta) * radius,
                Math.sin(theta) * radius,
                0
            )
        );
    }
    
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circle = new THREE.LineLoop(circleGeometry, lineMaterial);
    aimGroup.add(circle);
    
    // Make aim indicator invisible initially
    aimGroup.visible = false;
    
    // Add to scene
    scene.add(aimGroup);
    
    // Store references for cleanup
    aimGroup.userData = {
        materials: [lineMaterial],
        geometries: [horizontalGeometry, verticalGeometry, circleGeometry]
    };
    
    return aimGroup;
}

// Update aim indicator position
function updateAimIndicator(aimIndicator, position, normal) {
    if (!aimIndicator) return;
    
    // Update position
    aimIndicator.position.copy(position);
    
    // Offset slightly to avoid z-fighting with the ground
    aimIndicator.position.add(normal.clone().multiplyScalar(0.05));
    
    // Make the aim indicator face the camera
    if (window.camera) {
        aimIndicator.lookAt(window.camera.position);
    }
}

// Clean up aim indicator resources
function cleanupAimIndicator(aimIndicator, scene) {
    if (!aimIndicator) return;
    
    // Dispose of materials
    if (aimIndicator.userData && aimIndicator.userData.materials) {
        aimIndicator.userData.materials.forEach(material => {
            if (material) material.dispose();
        });
    }
    
    // Dispose of geometries
    if (aimIndicator.userData && aimIndicator.userData.geometries) {
        aimIndicator.userData.geometries.forEach(geometry => {
            if (geometry) geometry.dispose();
        });
    }
    
    // Remove from scene
    scene.remove(aimIndicator);
}