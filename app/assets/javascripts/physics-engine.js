/**
 * Physics Engine for Pi Collision Simulation
 * Implements perfectly elastic collision mechanics
 */

class Block {
  constructor(x, y, width, height, mass, velocity = 0, color = '#333') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.mass = mass;
    this.velocity = velocity;
    this.color = color;
    this.originalX = x;
    this.originalVelocity = velocity;
  }

  update(deltaTime) {
    this.x += this.velocity * deltaTime;
  }

  draw(ctx) {
    // Draw the block with a gradient and shadow effect
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, this.darkenColor(this.color, 0.3));
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(this.x + 3, this.y + 3, this.width, this.height);
    
    // Main block
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Border
    ctx.strokeStyle = this.darkenColor(this.color, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Mass label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `m=${this.mass}`,
      this.x + this.width / 2,
      this.y + this.height / 2 + 5
    );
    
    // Velocity arrow
    if (Math.abs(this.velocity) > 0.01) {
      this.drawVelocityArrow(ctx);
    }
  }

  drawVelocityArrow(ctx) {
    const centerX = this.x + this.width / 2;
    const centerY = this.y - 20;
    const arrowLength = Math.min(Math.abs(this.velocity) * 20, 50);
    const direction = this.velocity > 0 ? 1 : -1;
    
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + direction * arrowLength, centerY);
    ctx.stroke();
    
    // Arrow head
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.moveTo(centerX + direction * arrowLength, centerY);
    ctx.lineTo(centerX + direction * (arrowLength - 8), centerY - 4);
    ctx.lineTo(centerX + direction * (arrowLength - 8), centerY + 4);
    ctx.closePath();
    ctx.fill();
    
    // Velocity label
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `v=${this.velocity.toFixed(2)}`,
      centerX + direction * arrowLength / 2,
      centerY - 8
    );
  }

  darkenColor(color, factor) {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
    }
    return color;
  }

  reset() {
    this.x = this.originalX;
    this.velocity = this.originalVelocity;
  }

  getRight() {
    return this.x + this.width;
  }

  getLeft() {
    return this.x;
  }

  getCenter() {
    return this.x + this.width / 2;
  }
}

class PhysicsEngine {
  constructor(wallPosition = 0) {
    this.wallPosition = wallPosition;
    this.blocks = [];
    this.collisionCount = 0;
    this.wallCollisions = 0;
    this.blockCollisions = 0;
    this.timeScale = 1;
    this.collisionHistory = [];
  }

  addBlock(block) {
    this.blocks.push(block);
  }

  reset() {
    this.collisionCount = 0;
    this.wallCollisions = 0;
    this.blockCollisions = 0;
    this.collisionHistory = [];
    this.blocks.forEach(block => block.reset());
  }

  update(deltaTime) {
    const scaledDeltaTime = deltaTime * this.timeScale;
    
    // Update positions
    this.blocks.forEach(block => {
      block.update(scaledDeltaTime);
    });

    // Check for collisions
    this.checkWallCollisions();
    this.checkBlockCollisions();
  }

  checkWallCollisions() {
    this.blocks.forEach(block => {
      if (block.getLeft() <= this.wallPosition && block.velocity < 0) {
        // Collision with wall - perfectly elastic
        block.velocity = -block.velocity;
        block.x = this.wallPosition; // Ensure block doesn't penetrate wall
        
        this.collisionCount++;
        this.wallCollisions++;
        this.recordCollision('wall', block);
      }
    });
  }

  checkBlockCollisions() {
    for (let i = 0; i < this.blocks.length; i++) {
      for (let j = i + 1; j < this.blocks.length; j++) {
        const block1 = this.blocks[i];
        const block2 = this.blocks[j];
        
        if (this.areColliding(block1, block2)) {
          this.resolveElasticCollision(block1, block2);
          this.collisionCount++;
          this.blockCollisions++;
          this.recordCollision('blocks', block1, block2);
        }
      }
    }
  }

  areColliding(block1, block2) {
    return (block1.getRight() >= block2.getLeft() && 
            block1.getLeft() <= block2.getRight()) &&
           ((block1.velocity > 0 && block2.velocity < block1.velocity) ||
            (block2.velocity < 0 && block1.velocity > block2.velocity) ||
            (block1.velocity > 0 && block2.velocity <= 0) ||
            (block1.velocity <= 0 && block2.velocity > 0));
  }

  resolveElasticCollision(block1, block2) {
    // Perfectly elastic collision in 1D
    const m1 = block1.mass;
    const m2 = block2.mass;
    const v1 = block1.velocity;
    const v2 = block2.velocity;

    // Calculate new velocities using conservation of momentum and energy
    const newV1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
    const newV2 = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);

    block1.velocity = newV1;
    block2.velocity = newV2;

    // Separate blocks to prevent multiple collision detection
    const overlap = block1.getRight() - block2.getLeft();
    if (overlap > 0) {
      const totalMass = m1 + m2;
      block1.x -= overlap * (m2 / totalMass);
      block2.x += overlap * (m1 / totalMass);
    }
  }

  recordCollision(type, block1, block2 = null) {
    this.collisionHistory.push({
      type: type,
      time: Date.now(),
      block1: { mass: block1.mass, velocity: block1.velocity },
      block2: block2 ? { mass: block2.mass, velocity: block2.velocity } : null
    });
  }

  draw(ctx, canvasWidth, canvasHeight) {
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvasHeight - 50, canvasWidth, 50);
    
    // Draw wall
    ctx.fillStyle = '#696969';
    const wallWidth = 20;
    ctx.fillRect(this.wallPosition - wallWidth, 0, wallWidth, canvasHeight - 50);
    
    // Wall pattern
    ctx.fillStyle = '#555555';
    for (let y = 0; y < canvasHeight - 50; y += 40) {
      for (let x = 0; x < wallWidth; x += 20) {
        if ((Math.floor(y / 40) + Math.floor(x / 20)) % 2 === 0) {
          ctx.fillRect(this.wallPosition - wallWidth + x, y, 20, 40);
        }
      }
    }
    
    // Draw blocks
    this.blocks.forEach(block => {
      block.draw(ctx);
    });
    
    // Draw collision sparks if recent collision
    this.drawCollisionEffects(ctx);
  }

  drawCollisionEffects(ctx) {
    const recentCollisions = this.collisionHistory.filter(
      collision => Date.now() - collision.time < 200
    );
    
    recentCollisions.forEach(collision => {
      if (collision.type === 'wall') {
        this.drawSparks(ctx, this.wallPosition, 200, '#FFD700');
      } else if (collision.type === 'blocks') {
        // Find collision point between blocks
        const collisionX = this.blocks.find(b => b.mass === collision.block1.mass)?.getRight() || 400;
        this.drawSparks(ctx, collisionX, 200, '#FF6347');
      }
    });
  }

  drawSparks(ctx, x, y, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = Math.random() * 20 + 10;
      const sparkX = x + Math.cos(angle) * radius;
      const sparkY = y + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  isSimulationComplete() {
    // Simulation is complete when all blocks are moving away from each other
    // and the faster block is moving right
    if (this.blocks.length !== 2) return false;
    
    const [block1, block2] = this.blocks;
    const leftBlock = block1.x < block2.x ? block1 : block2;
    const rightBlock = block1.x < block2.x ? block2 : block1;
    
    return leftBlock.velocity >= 0 && rightBlock.velocity >= leftBlock.velocity;
  }

  getDigitsOfPi(collisionCount) {
    const piStr = Math.PI.toString();
    const digits = collisionCount.toString();
    
    if (digits.length <= piStr.length - 2) { // -2 for "3."
      return piStr.substring(0, 2 + digits.length);
    }
    
    return piStr;
  }
}
