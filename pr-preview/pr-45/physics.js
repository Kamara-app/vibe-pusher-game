// Physics functionality

// Apply physics to character
function applyPhysics(character, velocity, platform) {
    try {
        // Apply gravity
        velocity.y -= 0.01;
        character.position.y += velocity.y;
        
        // Check if character is on platform
        if (character.position.y < platform.position.y + 1) {
            character.position.y = platform.position.y + 1;
            velocity.y = 0;
        }
        
        // Check if character is off the platform
        const distanceFromCenter = Math.sqrt(
            Math.pow(character.position.x, 2) + 
            Math.pow(character.position.z, 2)
        );
        
        if (distanceFromCenter > platform.userData.radius) {
            return false; // Character fell off
        }
        
        return true; // Character is still on platform
    } catch (error) {
        console.error("Physics error:", error);
        // Recover character position
        if (character && platform) {
            character.position.y = platform.position.y + 1;
        }
        return true; // Prevent game over due to error
    }
}

// Apply physics to enemies
function applyEnemyPhysics(enemy, platform) {
    try {
        // Skip if enemy is already marked as falling
        if (enemy.userData.isFalling) {
            // Apply gravity to falling enemies
            enemy.position.y -= 0.1;
            
            // Apply push velocity if hit by bullet or push
            if (enemy.userData.pushVelocity) {
                enemy.position.x += enemy.userData.pushVelocity.x;
                enemy.position.y += enemy.userData.pushVelocity.y;
                enemy.position.z += enemy.userData.pushVelocity.z;
                
                // Reduce push velocity over time (friction)
                enemy.userData.pushVelocity.multiplyScalar(0.95);
            }
            
            // Remove enemy if it falls below a certain threshold
            if (enemy.position.y < -10) {
                return false; // Remove enemy
            }
            
            return true; // Keep enemy
        }
        
        // Check if enemy is off the platform
        const distanceFromCenter = Math.sqrt(
            Math.pow(enemy.position.x, 2) + 
            Math.pow(enemy.position.z, 2)
        );
        
        if (distanceFromCenter > platform.userData.radius) {
            enemy.userData.isFalling = true;
            return true;
        }
        
        // Keep enemy on platform height
        enemy.position.y = platform.position.y + enemy.userData.size;
        
        return true;
    } catch (error) {
        console.error("Enemy physics error:", error);
        return true; // Keep enemy despite error
    }
}

// Check if player is falling
function isPlayerFalling(character, velocity, platform) {
    try {
        // If character is moving upward or at platform level, not falling
        if (velocity.y >= 0 || character.position.y <= platform.position.y + 1.01) {
            return false;
        }
        
        // Check if character is off the platform
        const distanceFromCenter = Math.sqrt(
            Math.pow(character.position.x, 2) + 
            Math.pow(character.position.z, 2)
        );
        
        if (distanceFromCenter > platform.userData.radius) {
            return true; // Character is falling off the platform
        }
        
        return false; // Not falling
    } catch (error) {
        console.error("Player falling check error:", error);
        return false; // Assume not falling in case of error
    }
}

// Check collisions between character and enemies
function checkCollisions(character, enemies, velocity) {
    try {
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
            // Skip if enemy is falling
            if (enemy.userData.isFalling) {
                continue;
            }
            
            // Calculate distance between character and enemy
            const distance = character.position.distanceTo(enemy.position);
            
            // If collision detected
            if (distance < 1 + enemy.userData.size) {
                // Apply knockback to character
                const knockbackDirection = new THREE.Vector3()
                    .subVectors(character.position, enemy.position)
                    .normalize();
                
                velocity.x += knockbackDirection.x * 0.1;
                velocity.z += knockbackDirection.z * 0.1;
                
                // Prevent character from getting stuck inside enemy
                character.position.x += knockbackDirection.x * 0.1;
                character.position.z += knockbackDirection.z * 0.1;
            }
        }
    } catch (error) {
        console.error("Collision check error:", error);
    }
}

// Check collisions between character and obstacles
function checkObstacleCollisions(character, obstacles) {
    try {
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            let collision = false;
            
            if (obstacle.userData.type === 'box') {
                // Box collision detection
                const halfWidth = obstacle.userData.width / 2;
                const halfDepth = obstacle.userData.depth / 2;
                
                const dx = Math.abs(character.position.x - obstacle.position.x);
                const dz = Math.abs(character.position.z - obstacle.position.z);
                
                if (dx < halfWidth + 0.5 && dz < halfDepth + 0.5) {
                    collision = true;
                }
            } else if (obstacle.userData.type === 'cylinder') {
                // Cylinder collision detection
                const dx = character.position.x - obstacle.position.x;
                const dz = character.position.z - obstacle.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < obstacle.userData.radius + 0.5) {
                    collision = true;
                }
            }
            
            // If collision detected, push character away
            if (collision) {
                const pushDirection = new THREE.Vector3()
                    .subVectors(character.position, obstacle.position)
                    .normalize();
                
                character.position.x += pushDirection.x * 0.1;
                character.position.z += pushDirection.z * 0.1;
            }
        }
    } catch (error) {
        console.error("Obstacle collision check error:", error);
    }
}

// Push attack functionality
function pushAttack(character, enemies, direction) {
    try {
        const pushRange = 2; // Range of push attack
        const pushForce = 0.2; // Force of push
        
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
            // Skip if enemy is already falling
            if (enemy.userData.isFalling) {
                continue;
            }
            
            // Calculate distance between character and enemy
            const distance = character.position.distanceTo(enemy.position);
            
            // Check if enemy is within push range
            if (distance < pushRange + enemy.userData.size) {
                // Calculate angle between facing direction and direction to enemy
                const toEnemy = new THREE.Vector3()
                    .subVectors(enemy.position, character.position)
                    .normalize();
                
                const angleCos = direction.dot(toEnemy);
                
                // Check if enemy is in front of character (within ~60 degree cone)
                if (angleCos > 0.5) {
                    // Apply push force to enemy
                    if (!enemy.userData.pushVelocity) {
                        enemy.userData.pushVelocity = new THREE.Vector3();
                    }
                    
                    enemy.userData.pushVelocity.copy(direction).multiplyScalar(pushForce);
                    
                    // Add slight upward component
                    enemy.userData.pushVelocity.y = 0.05;
                    
                    // Mark enemy as pushed
                    enemy.userData.isPushed = true;
                }
            }
        }
    } catch (error) {
        console.error("Push attack error:", error);
    }
}