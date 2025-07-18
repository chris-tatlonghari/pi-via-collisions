/**
 * Main Simulation Controller
 * Handles the user interface and animation loop
 */

class PiCollisionSimulation {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.physics = null;
    this.animationId = null;
    this.isRunning = false;
    this.isPaused = false;
    this.lastTime = 0;
    
    this.initializeElements();
    this.setupEventListeners();
    this.initializeSimulation();
  }

  initializeElements() {
    this.canvas = document.getElementById('simulationCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Control elements
    this.mass1Input = document.getElementById('mass1');
    this.mass2Input = document.getElementById('mass2');
    this.velocityInput = document.getElementById('velocity');
    this.speedInput = document.getElementById('speed');
    
    // Button elements
    this.startBtn = document.getElementById('startBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.resetBtn = document.getElementById('resetBtn');
    
    // Stats elements
    this.collisionCountEl = document.getElementById('collisionCount');
    this.wallCollisionsEl = document.getElementById('wallCollisions');
    this.blockCollisionsEl = document.getElementById('blockCollisions');
    this.piDigitsEl = document.getElementById('piDigits');
  }

  setupEventListeners() {
    this.startBtn.addEventListener('click', () => this.startSimulation());
    this.pauseBtn.addEventListener('click', () => this.pauseSimulation());
    this.resetBtn.addEventListener('click', () => this.resetSimulation());
    
    // Update physics when inputs change
    [this.mass1Input, this.mass2Input, this.velocityInput].forEach(input => {
      input.addEventListener('change', () => {
        if (!this.isRunning) {
          this.initializeSimulation();
        }
      });
    });
    
    this.speedInput.addEventListener('input', () => {
      if (this.physics) {
        this.physics.timeScale = parseInt(this.speedInput.value) / 5;
      }
    });

    // Canvas click to start
    this.canvas.addEventListener('click', () => {
      if (!this.isRunning && !this.isPaused) {
        this.startSimulation();
      }
    });
  }

  initializeSimulation() {
    const canvasHeight = this.canvas.height;
    const wallPosition = 50;
    
    // Create physics engine
    this.physics = new PhysicsEngine(wallPosition);
    this.physics.timeScale = parseInt(this.speedInput.value) / 5;
    
    // Get input values
    const mass1 = parseFloat(this.mass1Input.value) || 1;
    const mass2 = parseFloat(this.mass2Input.value) || 100;
    const initialVelocity = parseFloat(this.velocityInput.value) || -2;
    
    // Create blocks
    const blockHeight = 60;
    const groundY = canvasHeight - 50 - blockHeight;
    
    // Small block (left, stationary)
    const smallBlockWidth = Math.max(30, Math.min(60, mass1 * 10));
    const smallBlock = new Block(
      wallPosition + 10,
      groundY,
      smallBlockWidth,
      blockHeight,
      mass1,
      0,
      '#3498db'
    );
    
    // Large block (right, moving)
    const largeBlockWidth = Math.max(40, Math.min(120, Math.sqrt(mass2) * 8));
    const largeBlock = new Block(
      this.canvas.width - largeBlockWidth - 50,
      groundY,
      largeBlockWidth,
      blockHeight,
      mass2,
      initialVelocity,
      '#e74c3c'
    );
    
    // Add blocks to physics engine
    this.physics.addBlock(smallBlock);
    this.physics.addBlock(largeBlock);
    
    // Draw initial state
    this.draw();
    this.updateStats();
  }

  startSimulation() {
    if (this.isPaused) {
      this.isPaused = false;
    } else {
      this.initializeSimulation();
    }
    
    this.isRunning = true;
    this.startBtn.disabled = true;
    this.pauseBtn.disabled = false;
    
    // Disable input changes during simulation
    this.mass1Input.disabled = true;
    this.mass2Input.disabled = true;
    this.velocityInput.disabled = true;
    
    this.lastTime = performance.now();
    this.animate();
  }

  pauseSimulation() {
    this.isPaused = true;
    this.isRunning = false;
    this.startBtn.disabled = false;
    this.pauseBtn.disabled = true;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resetSimulation() {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.startBtn.disabled = false;
    this.pauseBtn.disabled = true;
    
    // Re-enable inputs
    this.mass1Input.disabled = false;
    this.mass2Input.disabled = false;
    this.velocityInput.disabled = false;
    
    this.initializeSimulation();
  }

  animate(currentTime = 0) {
    if (!this.isRunning) return;
    
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;
    
    // Update physics
    if (deltaTime > 0 && deltaTime < 0.1) { // Prevent large time jumps
      this.physics.update(deltaTime);
    }
    
    // Draw everything
    this.draw();
    this.updateStats();
    
    // Check if simulation is complete
    if (this.physics.isSimulationComplete() && this.physics.collisionCount > 0) {
      setTimeout(() => {
        this.pauseSimulation();
        this.showCompletionMessage();
      }, 2000); // Wait 2 seconds after completion
    }
    
    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }

  draw() {
    this.physics.draw(this.ctx, this.canvas.width, this.canvas.height);
    
    // Draw instructions if not running
    if (!this.isRunning && !this.isPaused) {
      this.drawInstructions();
    }
  }

  drawInstructions() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(this.canvas.width / 2 - 150, this.canvas.height / 2 - 40, 300, 80);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Click Start Simulation', this.canvas.width / 2, this.canvas.height / 2 - 10);
    
    this.ctx.font = '14px Arial';
    this.ctx.fillText('or click anywhere on the canvas', this.canvas.width / 2, this.canvas.height / 2 + 15);
  }

  updateStats() {
    if (!this.physics) return;
    
    this.collisionCountEl.textContent = this.physics.collisionCount;
    this.wallCollisionsEl.textContent = this.physics.wallCollisions;
    this.blockCollisionsEl.textContent = this.physics.blockCollisions;
    
    // Update Pi approximation
    const piApprox = this.physics.getDigitsOfPi(this.physics.collisionCount);
    this.piDigitsEl.textContent = piApprox;
    
    // Highlight if we're getting close to a known Pi milestone
    const knownMilestones = [31, 314, 3141, 31415, 314159];
    if (knownMilestones.includes(this.physics.collisionCount)) {
      this.piDigitsEl.style.animation = 'pulse 1s infinite';
    } else {
      this.piDigitsEl.style.animation = 'none';
    }
  }

  showCompletionMessage() {
    const collisions = this.physics.collisionCount;
    const piStr = Math.PI.toString();
    let message = `Simulation Complete!\n\nTotal Collisions: ${collisions}\n`;
    
    // Check if this matches known Pi digits
    const collisionStr = collisions.toString();
    if (piStr.includes(collisionStr)) {
      const piDigits = this.physics.getDigitsOfPi(collisions);
      message += `This gives us π ≈ ${piDigits}!\n\n`;
      
      if (collisionStr.length >= 4) {
        message += `Congratulations! You've discovered ${collisionStr.length} digits of π through collisions!`;
      } else {
        message += `Try a mass ratio that's a power of 100 (like 1:10000) for more π digits!`;
      }
    } else {
      message += `Try adjusting the mass ratio to a power of 100 (1, 100, 10000, etc.) to see π emerge!`;
    }
    
    alert(message);
  }

  // Utility method to suggest optimal mass ratios
  suggestMassRatio() {
    const suggestions = [
      { small: 1, large: 100, digits: 2, expected: 31 },
      { small: 1, large: 10000, digits: 3, expected: 314 },
      { small: 1, large: 1000000, digits: 4, expected: 3141 },
      { small: 1, large: 100000000, digits: 5, expected: 31415 }
    ];
    
    return suggestions;
  }
}

// Add CSS animation for pulse effect
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.piSimulation = new PiCollisionSimulation();
});

// Add helpful keyboard shortcuts
document.addEventListener('keydown', (event) => {
  if (!window.piSimulation) return;
  
  switch(event.key) {
    case ' ': // Spacebar
      event.preventDefault();
      if (window.piSimulation.isRunning) {
        window.piSimulation.pauseSimulation();
      } else {
        window.piSimulation.startSimulation();
      }
      break;
    case 'r':
    case 'R':
      window.piSimulation.resetSimulation();
      break;
  }
});

// Add window resize handler
window.addEventListener('resize', () => {
  if (window.piSimulation && !window.piSimulation.isRunning) {
    window.piSimulation.draw();
  }
});
