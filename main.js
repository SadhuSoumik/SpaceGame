 // Core game variables
 let canvas, ctx;
 let gameRunning = false;
 let score = 0;
 let level = 1;
 let enemiesDefeated = 0;
 let enemiesToNextLevel = 5;
 let lastEnemySpawn = 0;
 let enemySpawnInterval = 2000; // ms
 let isMobile = false;
 let canvasWidth, canvasHeight;
 let scaleFactor = 1;
 let lastFrameTime = 0;
 
 // Player object definition
 const player = {
   x: 0,
   y: 0,
   width: 40,
   height: 40,
   speed: 5,
   boostSpeed: 8,
   isBoosting: false,
   health: 140,
   maxHealth: 200,
   shield: 100,
   maxShield: 100,
   shieldRechargeRate: 0.2,
   lastShot: 0,
   fireRate: 300, // ms
   bullets: [],
   color: '#4CAF50',
   rotation: 0,
   thrustParticles: []
 };

 // Other game objects
 let enemies = [];
 let powerUps = [];
 let particles = [];
 let stars = [];

 // Input state
 const keys = {
   ArrowUp: false,
   ArrowDown: false,
   ArrowLeft: false,
   ArrowRight: false,
   ' ': false,
   Shift: false
 };

 // Sound effects
 const sounds = {
   shoot: new Audio('./laserSound.mp3'),
   explosion: new Audio('./explosionSound.mp3'),
   powerup: new Audio('./powerUpSound.mp3')
 };

 // Joystick variables for mobile controls 
 let joystickActive = false;
 let joystickStartX = 0;
 let joystickStartY = 0;
 let joystickRadius = 50; 
 let joystickSensitivity = 0.6; // Adjusts sensitivity 

 // Initialize game
 function init() {
   isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
   canvas = document.getElementById('gameCanvas');
   ctx = canvas.getContext('2d');
   setupCanvasSize();
   createStars();
   if (isMobile) {
     setupMobileControls();
   }
   window.addEventListener('resize', setupCanvasSize);
   window.addEventListener('orientationchange', setupCanvasSize);
   document.addEventListener('keydown', keyDown);
   document.addEventListener('keyup', keyUp);
   document.getElementById('startButton').addEventListener('click', startGame);
   document.getElementById('restartButton').addEventListener('click', restartGame);
 }

 // Setup canvas dimensions based on container
 function setupCanvasSize() {
   const container = document.getElementById('gameContainer');
   const containerWidth = container.clientWidth;
   const containerHeight = container.clientHeight;
   const baseWidth = 800, baseHeight = 600; // base dimensions (4:3 ratio)
   const scaleWidth = containerWidth / baseWidth;
   const scaleHeight = containerHeight / baseHeight;
   scaleFactor = Math.min(scaleWidth, scaleHeight);
   canvasWidth = baseWidth * scaleFactor;
   canvasHeight = baseHeight * scaleFactor;
   canvas.width = canvasWidth;
   canvas.height = canvasHeight;
   player.x = canvasWidth / 2;
   player.y = canvasHeight / 2;
   if (isMobile) {
     const ui = document.getElementById('gameUI');
     ui.style.fontSize = `${Math.max(14, 16 * scaleFactor)}px`;
   }
 }

 // Create background stars
 function createStars() {
   stars = [];
   for (let i = 0; i < 200; i++) {
     stars.push({
       x: Math.random() * canvasWidth,
       y: Math.random() * canvasHeight,
       size: Math.random() * 2 * scaleFactor + 1,
       speed: Math.random() * 2 + 1
     });
   }
 }

 // Setup mobile controls including joystick with sensitivity adjustment
 function setupMobileControls() {
   const joystick = document.getElementById('joystick');
   const joystickKnob = document.getElementById('joystickKnob');
   const shootBtn = document.getElementById('shootBtn');
   const boostBtn = document.getElementById('boostBtn');
   joystickRadius = 50 * scaleFactor;

   // Update joystick center position (if needed in future)
   function updateJoystickPosition() {
     const rect = joystick.getBoundingClientRect();
     // Not used directly here but can be stored if needed
   }

   joystick.addEventListener('touchstart', (e) => {
     e.preventDefault();
     joystickActive = true;
     const touch = e.touches[0];
     joystickStartX = touch.clientX;
     joystickStartY = touch.clientY;
     updateJoystickPosition();
   });

   // Use a single touchmove listener
   document.addEventListener('touchmove', (e) => {
     if (!joystickActive) return;
     e.preventDefault();
     const touch = e.touches[0];
     // Apply sensitivity factor
     const dx = (touch.clientX - joystickStartX) * joystickSensitivity;
     const dy = (touch.clientY - joystickStartY) * joystickSensitivity;
     const distance = Math.sqrt(dx * dx + dy * dy);
     const angle = Math.atan2(dy, dx);
     const limitedDistance = Math.min(distance, joystickRadius);
     const limitedX = Math.cos(angle) * limitedDistance;
     const limitedY = Math.sin(angle) * limitedDistance;
     joystickKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
     // Update movement keys based on knob position thresholds
     keys.ArrowLeft = limitedX < -10;
     keys.ArrowRight = limitedX > 10;
     keys.ArrowUp = limitedY < -10;
     keys.ArrowDown = limitedY > 10;
   }, { passive: false });

   document.addEventListener('touchend', (e) => {
     if (!joystickActive) return;
     joystickActive = false;
     joystickKnob.style.transform = 'translate(0, 0)';
     keys.ArrowLeft = keys.ArrowRight = keys.ArrowUp = keys.ArrowDown = false;
   });

   // Shoot button events
   shootBtn.addEventListener('touchstart', (e) => {
     e.preventDefault();
     keys[' '] = true;
   });
   shootBtn.addEventListener('touchend', (e) => {
     e.preventDefault();
     keys[' '] = false;
   });

   // Boost button events
   boostBtn.addEventListener('touchstart', (e) => {
     e.preventDefault();
     keys.Shift = true;
     player.isBoosting = true;
   });
   boostBtn.addEventListener('touchend', (e) => {
     e.preventDefault();
     keys.Shift = false;
     player.isBoosting = false;
   });

   // Prevent default behaviors on touch for these controls
   document.addEventListener('touchmove', (e) => {
     if ([joystick, shootBtn, boostBtn].includes(e.target)) {
       e.preventDefault();
     }
   }, { passive: false });
 }

 // Start game handler
 function startGame() {
   document.getElementById('startScreen').style.display = 'none';
   resetGame();
   gameRunning = true;
   lastFrameTime = performance.now();
   requestAnimationFrame(gameLoop);
 }

 // Restart game handler
 function restartGame() {
   document.getElementById('gameOverScreen').style.display = 'none';
   resetGame();
   gameRunning = true;
   lastFrameTime = performance.now();
   requestAnimationFrame(gameLoop);
 }

 // Reset game state
 function resetGame() {
   player.x = canvasWidth / 2;
   player.y = canvasHeight / 2;
   player.health = player.maxHealth;
   player.shield = player.maxShield;
   player.bullets = [];
   player.thrustParticles = [];
   enemies = [];
   powerUps = [];
   particles = [];
   score = 0;
   level = 1;
   enemiesDefeated = 0;
   enemiesToNextLevel = 5;
   enemySpawnInterval = 2000;
   createStars();
   updateUI();
 }

 // Game over handler
 function gameOver() {
   gameRunning = false;
   document.getElementById('finalScore').textContent = `Score: ${score}`;
   document.getElementById('gameOverScreen').style.display = 'flex';
 }

 // Main game loop with delta time normalization
 function gameLoop(timestamp) {
   if (!gameRunning) return;
   const deltaTime = timestamp - lastFrameTime;
   lastFrameTime = timestamp;
   update(deltaTime);
   render();
   requestAnimationFrame(gameLoop);
 }

 // Update game state
 function update(deltaTime) {
   const now = Date.now();
   const deltaFactor = deltaTime / 16.67; // normalized for 60fps
   updatePlayer(deltaFactor);
   if (now - lastEnemySpawn > enemySpawnInterval) {
     spawnEnemy();
     lastEnemySpawn = now;
   }
   updateEnemies(deltaFactor);
   updateBullets(deltaFactor);
   updatePowerUps();
   updateParticles();
   if (enemiesDefeated >= enemiesToNextLevel) {
     levelUp();
   }
 }

 // Update player movement and state
 function updatePlayer(deltaFactor) {
   let speed = (player.isBoosting ? player.boostSpeed : player.speed) * deltaFactor;
   if (keys.ArrowUp) {
     player.y -= speed;
     createThrustParticle();
   }
   if (keys.ArrowDown) player.y += speed;
   if (keys.ArrowLeft) {
     player.x -= speed;
     player.rotation = -0.2;
   }
   if (keys.ArrowRight) {
     player.x += speed;
     player.rotation = 0.2;
   }
   if (!keys.ArrowLeft && !keys.ArrowRight) {
     player.rotation *= 0.9;
   }
   if (keys[' '] && Date.now() - player.lastShot > player.fireRate) {
     shoot();
     player.lastShot = Date.now();
   }
   if (player.shield < player.maxShield) {
     player.shield = Math.min(player.shield + player.shieldRechargeRate * deltaFactor, player.maxShield);
   }
   // Boundary check
   player.x = Math.max(player.width / 2, Math.min(player.x, canvasWidth - player.width / 2));
   player.y = Math.max(player.height / 2, Math.min(player.y, canvasHeight - player.height / 2));
   // Update thrust particles
   for (let i = player.thrustParticles.length - 1; i >= 0; i--) {
     const p = player.thrustParticles[i];
     p.x += p.vx * deltaFactor;
     p.y += p.vy * deltaFactor;
     p.life--;
     if (p.life <= 0) {
       player.thrustParticles.splice(i, 1);
     }
   }
 }

 // Create a thrust particle for the player
 function createThrustParticle() {
   player.thrustParticles.push({
     x: player.x,
     y: player.y + player.height / 2,
     vx: (Math.random() - 0.5) * 2,
     vy: Math.random() * 2 + 1,
     size: Math.random() * 3 * scaleFactor + 2,
     life: Math.random() * 20 + 10,
     color: `hsl(${Math.random() * 30 + 20}, 100%, 50%)`
   });
 }

 // Player shooting function
 function shoot() {
   player.bullets.push({
     x: player.x,
     y: player.y - player.height / 2,
     width: 4 * scaleFactor,
     height: 10 * scaleFactor,
     speed: 10 * scaleFactor,
     damage: 10
   });
   sounds.shoot.currentTime = 0;
   sounds.shoot.play();
 }

 // Spawn an enemy at a random side
 function spawnEnemy() {
   const side = Math.floor(Math.random() * 4);
   let x, y;
   switch (side) {
     case 0: x = Math.random() * canvasWidth; y = -30 * scaleFactor; break;
     case 1: x = canvasWidth + 30 * scaleFactor; y = Math.random() * canvasHeight; break;
     case 2: x = Math.random() * canvasWidth; y = canvasHeight + 30 * scaleFactor; break;
     case 3: x = -30 * scaleFactor; y = Math.random() * canvasHeight; break;
   }
   const type = Math.random() < 0.2 ? 'elite' : 'normal';
   const enemySize = type === 'elite' ? 50 : 30;
   enemies.push({
     x: x,
     y: y,
     width: enemySize * scaleFactor,
     height: enemySize * scaleFactor,
     speed: (type === 'elite' ? 1.5 : 2.5) * scaleFactor,
     health: type === 'elite' ? 60 : 30,
     maxHealth: type === 'elite' ? 60 : 30,
     color: type === 'elite' ? '#FF5722' : '#F44336',
     lastShot: 0,
     fireRate: type === 'elite' ? 1000 : 1500,
     bullets: [],
     type: type,
     value: type === 'elite' ? 50 : 20
   });
 }

 // Update enemy movements and actions
 function updateEnemies(deltaFactor) {
   for (let i = enemies.length - 1; i >= 0; i--) {
     const enemy = enemies[i];
     const dx = player.x - enemy.x;
     const dy = player.y - enemy.y;
     const dist = Math.sqrt(dx * dx + dy * dy);
     if (dist > 100 * scaleFactor) {
       enemy.x += (dx / dist) * enemy.speed * deltaFactor;
       enemy.y += (dy / dist) * enemy.speed * deltaFactor;
     }
     if (Date.now() - enemy.lastShot > enemy.fireRate) {
       enemyBullet(enemy);
       enemy.lastShot = Date.now();
     }
     for (let j = enemy.bullets.length - 1; j >= 0; j--) {
       const bullet = enemy.bullets[j];
       bullet.y += bullet.speed * deltaFactor;
       if (checkCollision(bullet.x, bullet.y, bullet.width, bullet.height,
                          player.x, player.y, player.width, player.height)) {
         takeDamage(bullet.damage);
         enemy.bullets.splice(j, 1);
         createExplosion(bullet.x, bullet.y, 10, '#FF9800');
       }
       if (bullet.y > canvasHeight) {
         enemy.bullets.splice(j, 1);
       }
     }
     if (enemy.x < -100 * scaleFactor || enemy.x > canvasWidth + 100 * scaleFactor ||
         enemy.y < -100 * scaleFactor || enemy.y > canvasHeight + 100 * scaleFactor) {
       enemies.splice(i, 1);
     }
   }
 }

 // Enemy shooting function
 function enemyBullet(enemy) {
   enemy.bullets.push({
     x: enemy.x,
     y: enemy.y + enemy.height / 2,
     width: 4 * scaleFactor,
     height: 10 * scaleFactor,
     speed: 5 * scaleFactor,
     damage: enemy.type === 'elite' ? 15 : 10
   });
 }

 // Update player bullets
 function updateBullets(deltaFactor) {
   for (let i = player.bullets.length - 1; i >= 0; i--) {
     const bullet = player.bullets[i];
     bullet.y -= bullet.speed * deltaFactor;
     let hit = false;
     for (let j = enemies.length - 1; j >= 0; j--) {
       const enemy = enemies[j];
       if (checkCollision(bullet.x, bullet.y, bullet.width, bullet.height,
                          enemy.x, enemy.y, enemy.width, enemy.height)) {
         enemy.health -= bullet.damage;
         if (enemy.health <= 0) {
           score += enemy.value;
           enemiesDefeated++;
           enemies.splice(j, 1);
           createExplosion(enemy.x, enemy.y, enemy.type === 'elite' ? 30 : 20, enemy.color);
           if (Math.random() < 0.2) spawnPowerUp(enemy.x, enemy.y);
         }
         hit = true;
         break;
       }
     }
     if (hit) {
       player.bullets.splice(i, 1);
       continue;
     }
     if (bullet.y < 0) {
       player.bullets.splice(i, 1);
     }
   }
 }

 // Spawn a power-up at the given position
 function spawnPowerUp(x, y) {
   const types = ['health', 'shield', 'weapon'];
   const type = types[Math.floor(Math.random() * types.length)];
   powerUps.push({
     x: x,
     y: y,
     width: 20 * scaleFactor,
     height: 20 * scaleFactor,
     type: type,
     color: type === 'health' ? '#4CAF50' : type === 'shield' ? '#2196F3' : '#FFC107',
     life: 3000, // ms
     spawnTime: Date.now()
   });
 }

 // Update power-ups (collision with player and expiration)
 function updatePowerUps() {
   for (let i = powerUps.length - 1; i >= 0; i--) {
     const powerUp = powerUps[i];
     if (checkCollision(powerUp.x, powerUp.y, powerUp.width, powerUp.height,
                        player.x, player.y, player.width, player.height)) {
       collectPowerUp(powerUp);
       powerUps.splice(i, 1);
       continue;
     }
     if (Date.now() - powerUp.spawnTime > powerUp.life) {
       powerUps.splice(i, 1);
     }
   }
 }

 // Apply power-up effect
 function collectPowerUp(powerUp) {
   sounds.powerup.currentTime = 0;
   sounds.powerup.play();
   switch (powerUp.type) {
     case 'health':
       player.health = Math.min(player.health + 30, player.maxHealth);
       break;
     case 'shield':
       player.shield = Math.min(player.shield + 40, player.maxShield);
       break;
     case 'weapon':
       player.fireRate = Math.max(100, player.fireRate - 50);
       setTimeout(() => {
         player.fireRate += 50;
       }, 10000);
       break;
   }
   createParticles(powerUp.x, powerUp.y, 15, powerUp.color);
   updateUI();
 }

 // Handle player damage
 function takeDamage(amount) {
   const shieldDamage = Math.min(amount, player.shield);
   player.shield -= shieldDamage;
   const remainingDamage = amount - shieldDamage;
   if (remainingDamage > 0) {
     player.health -= remainingDamage;
   }
   createParticles(player.x, player.y, 10, '#FF0000');
   updateUI();
   if (player.health <= 0) {
     createExplosion(player.x, player.y, 40, player.color);
     gameOver();
   }
 }

 // Create an explosion effect
 function createExplosion(x, y, size, color) {
   sounds.explosion.currentTime = 0;
   sounds.explosion.play();
   for (let i = 0; i < size; i++) {
     particles.push({
       x: x,
       y: y,
       vx: (Math.random() - 0.5) * 5 * scaleFactor,
       vy: (Math.random() - 0.5) * 5 * scaleFactor,
       size: Math.random() * 3 * scaleFactor + 1,
       life: Math.random() * 30 + 20,
       color: color
     });
   }
 }

 // Create generic particles
 function createParticles(x, y, count, color) {
   for (let i = 0; i < count; i++) {
     particles.push({
       x: x,
       y: y,
       vx: (Math.random() - 0.5) * 3 * scaleFactor,
       vy: (Math.random() - 0.5) * 3 * scaleFactor,
       size: Math.random() * 2 * scaleFactor + 1,
       life: Math.random() * 20 + 10,
       color: color
     });
   }
 }

 // Update particles
 function updateParticles() {
   for (let i = particles.length - 1; i >= 0; i--) {
     const p = particles[i];
     p.x += p.vx;
     p.y += p.vy;
     p.life--;
     if (p.life <= 0) {
       particles.splice(i, 1);
     }
   }
 }

 // Level up logic
 function levelUp() {
   level++;
   enemiesDefeated = 0;
   enemiesToNextLevel = Math.floor(5 + level * 1.5);
   enemySpawnInterval = Math.max(500, enemySpawnInterval - 100);
   player.maxHealth += 10;
   player.health = player.maxHealth;
   player.maxShield += 10;
   player.shield = player.maxShield;
   updateUI();
   createParticles(player.x, player.y, 30, '#4CAF50');
 }

 // Collision detection helper
 function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
   return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
 }

 // Update game UI
 function updateUI() {
   document.getElementById('healthDisplay').textContent = Math.floor(player.health);
   document.getElementById('shieldDisplay').textContent = Math.floor(player.shield);
   document.getElementById('scoreDisplay').textContent = score;
   document.getElementById('levelDisplay').textContent = level;
 }

 // Render the game scene
 function render() {
   ctx.fillStyle = 'black';
   ctx.fillRect(0, 0, canvasWidth, canvasHeight);
   // Draw stars with a parallax effect
   ctx.fillStyle = 'white';
   for (const star of stars) {
     ctx.fillRect(star.x, star.y, star.size, star.size);
     star.y += star.speed * 0.1;
     if (star.y > canvasHeight) {
       star.y = 0;
       star.x = Math.random() * canvasWidth;
     }
   }
   // Draw particles
   for (const p of particles) {
     ctx.fillStyle = p.color;
     ctx.globalAlpha = p.life / 30;
     ctx.fillRect(p.x, p.y, p.size, p.size);
   }
   ctx.globalAlpha = 1;
   // Draw power-ups with pulsing effect
   for (const powerUp of powerUps) {
     ctx.fillStyle = powerUp.color;
     const pulse = Math.sin(Date.now() / 200) * 2 + 3;
     ctx.beginPath();
     ctx.arc(powerUp.x, powerUp.y, powerUp.width / 2 + pulse, 0, Math.PI * 2);
     ctx.fill();
     ctx.fillStyle = 'white';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     ctx.font = `${14 * scaleFactor}px Arial`;
     let icon;
     switch (powerUp.type) {
       case 'health': icon = 'H'; break;
       case 'shield': icon = 'S'; break;
       case 'weapon': icon = 'W'; break;
     }
     ctx.fillText(icon, powerUp.x, powerUp.y);
   }
   // Draw enemies
   for (const enemy of enemies) {
     const healthPercent = enemy.health / enemy.maxHealth;
     ctx.fillStyle = 'red';
     ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 - 10 * scaleFactor, enemy.width, 3 * scaleFactor);
     ctx.fillStyle = 'green';
     ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 - 10 * scaleFactor, enemy.width * healthPercent, 3 * scaleFactor);
     ctx.fillStyle = enemy.color;
     ctx.beginPath();
     ctx.moveTo(enemy.x, enemy.y - enemy.height / 2);
     ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
     ctx.lineTo(enemy.x - enemy.width / 2, enemy.y + enemy.height / 2);
     ctx.closePath();
     ctx.fill();
     ctx.fillStyle = '#FF9800';
     for (const bullet of enemy.bullets) {
       ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
     }
   }
   // Draw player bullets
   ctx.fillStyle = '#4CAF50';
   for (const bullet of player.bullets) {
     ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
   }
   // Draw player ship
   ctx.save();
   ctx.translate(player.x, player.y);
   ctx.rotate(player.rotation);
   ctx.fillStyle = player.color;
   ctx.beginPath();
   ctx.moveTo(0, -player.height / 2);
   ctx.lineTo(player.width / 2, player.height / 2);
   ctx.lineTo(-player.width / 2, player.height / 2);
   ctx.closePath();
   ctx.fill();
   // Draw cockpit
   ctx.fillStyle = '#2196F3';
   ctx.beginPath();
   ctx.arc(0, -player.height / 6, player.width / 4, 0, Math.PI * 2);
   ctx.fill();
   // Draw thrust particles
   for (const p of player.thrustParticles) {
     ctx.fillStyle = p.color;
     ctx.globalAlpha = p.life / 30;
     ctx.fillRect(p.x - player.x, p.y - player.y, p.size, p.size);
   }
   ctx.globalAlpha = 1;
   ctx.restore();
   // Draw shield effect if active
   if (player.shield > 0) {
     ctx.strokeStyle = '#2196F3';
     ctx.lineWidth = 2 * scaleFactor;
     ctx.globalAlpha = player.shield / player.maxShield * 0.5;
     ctx.beginPath();
     ctx.arc(player.x, player.y, player.width, 0, Math.PI * 2);
     ctx.stroke();
     ctx.globalAlpha = 1;
   }
 }

 // Key down event handler
 function keyDown(e) {
   if (keys.hasOwnProperty(e.key)) {
     keys[e.key] = true;
     if (e.key === 'Shift') {
       player.isBoosting = true;
     }
     if (e.key === ' ' && isMobile) {
       e.preventDefault();
     }
   }
 }

 // Key up event handler
 function keyUp(e) {
   if (keys.hasOwnProperty(e.key)) {
     keys[e.key] = false;
     if (e.key === 'Shift') {
       player.isBoosting = false;
     }
   }
 }

 window.onload = init;