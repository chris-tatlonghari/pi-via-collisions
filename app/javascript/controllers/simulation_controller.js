import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["canvas", "mass1", "mass2", "velocity", "speed", "startBtn", "pauseBtn", "resetBtn", 
                   "collisionCount", "wallCollisions", "blockCollisions", "piDigits"]

  connect() {
    this.canvas = this.canvasTarget
    this.ctx = this.canvas.getContext('2d')
    this.physics = null
    this.animationId = null
    this.isRunning = false
    this.isPaused = false
    this.lastTime = 0
    this.completionMessageShown = false
    
    this.initializeSimulation()
    this.setupCanvasClickHandler()
  }

  disconnect() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }

  setupCanvasClickHandler() {
    this.canvas.addEventListener('click', () => {
      if (!this.isRunning && !this.isPaused) {
        this.start()
      }
    })
  }

  initializeSimulation() {
    const canvasHeight = this.canvas.height
    const wallPosition = 50
    
    // Create physics engine
    this.physics = new PhysicsEngine(wallPosition)
    this.physics.timeScale = parseInt(this.speedTarget.value) / 5
    
    // Get input values
    const mass1 = parseFloat(this.mass1Target.value) || 1
    const mass2 = parseFloat(this.mass2Target.value) || 100
    const initialVelocity = parseFloat(this.velocityTarget.value) || -2
    
    // Create blocks
    const blockHeight = 60
    const groundY = canvasHeight - 50 - blockHeight
    
    // Small block (left, stationary)
    const smallBlockWidth = Math.max(30, Math.min(60, mass1 * 10))
    const smallBlock = new Block(
      wallPosition + 10,
      groundY,
      smallBlockWidth,
      blockHeight,
      mass1,
      0,
      '#3498db'
    )
    
    // Large block (right, moving)
    const largeBlockWidth = Math.max(40, Math.min(120, Math.sqrt(mass2) * 8))
    const largeBlock = new Block(
      this.canvas.width - largeBlockWidth - 50,
      groundY,
      largeBlockWidth,
      blockHeight,
      mass2,
      initialVelocity,
      '#e74c3c'
    )
    
    // Add blocks to physics engine
    this.physics.addBlock(smallBlock)
    this.physics.addBlock(largeBlock)
    
    // Draw initial state
    this.draw()
    this.updateStats()
  }

  start() {
    if (this.isPaused) {
      this.isPaused = false
    } else {
      this.initializeSimulation()
    }
    
    this.isRunning = true
    this.completionMessageShown = false // Reset the flag when starting
    this.startBtnTarget.disabled = true
    this.pauseBtnTarget.disabled = false
    
    // Disable input changes during simulation
    this.mass1Target.disabled = true
    this.mass2Target.disabled = true
    this.velocityTarget.disabled = true
    
    this.lastTime = performance.now()
    this.animate()
  }

  pause() {
    this.isPaused = true
    this.isRunning = false
    this.startBtnTarget.disabled = false
    this.pauseBtnTarget.disabled = true
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  reset() {
    this.isRunning = false
    this.isPaused = false
    this.completionMessageShown = false // Reset the flag when resetting
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    
    this.startBtnTarget.disabled = false
    this.pauseBtnTarget.disabled = true
    
    // Re-enable inputs
    this.mass1Target.disabled = false
    this.mass2Target.disabled = false
    this.velocityTarget.disabled = false
    
    this.initializeSimulation()
  }

  updateSpeed() {
    if (this.physics) {
      this.physics.timeScale = parseInt(this.speedTarget.value) / 5
    }
  }

  updateParameters() {
    if (!this.isRunning) {
      this.initializeSimulation()
    }
  }

  animate(currentTime = 0) {
    if (!this.isRunning) return
    
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime
    
    // Update physics
    if (deltaTime > 0 && deltaTime < 0.1) {
      this.physics.update(deltaTime)
    }
    
    // Draw everything
    this.draw()
    this.updateStats()
    
    // Check if simulation is complete
    if (this.physics.isSimulationComplete() && this.physics.collisionCount > 0 && this.isRunning && !this.completionMessageShown) {
      this.completionMessageShown = true // Set flag to prevent multiple alerts
      setTimeout(() => {
        if (this.isRunning) { // Double check we're still running
          this.pause()
          this.showCompletionMessage()
        }
      }, 2000)
    }
    
    this.animationId = requestAnimationFrame((time) => this.animate(time))
  }

  draw() {
    this.physics.draw(this.ctx, this.canvas.width, this.canvas.height)
    
    // Draw instructions if not running
    if (!this.isRunning && !this.isPaused) {
      this.drawInstructions()
    }
  }

  drawInstructions() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(this.canvas.width / 2 - 150, this.canvas.height / 2 - 40, 300, 80)
    
    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 20px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('Click Start Simulation', this.canvas.width / 2, this.canvas.height / 2 - 10)
    
    this.ctx.font = '14px Arial'
    this.ctx.fillText('or click anywhere on the canvas', this.canvas.width / 2, this.canvas.height / 2 + 15)
  }

  updateStats() {
    if (!this.physics) return
    
    this.collisionCountTarget.textContent = this.physics.collisionCount
    this.wallCollisionsTarget.textContent = this.physics.wallCollisions
    this.blockCollisionsTarget.textContent = this.physics.blockCollisions
    
    // Update Pi approximation
    const piApprox = this.physics.getDigitsOfPi(this.physics.collisionCount)
    this.piDigitsTarget.textContent = piApprox
    
    // Highlight if we're getting close to a known Pi milestone
    const knownMilestones = [31, 314, 3141, 31415, 314159]
    if (knownMilestones.includes(this.physics.collisionCount)) {
      this.piDigitsTarget.style.animation = 'pulse 1s infinite'
    } else {
      this.piDigitsTarget.style.animation = 'none'
    }
  }

  showCompletionMessage() {
    const collisions = this.physics.collisionCount
    const piStr = Math.PI.toString()
    let message = `Simulation Complete!\n\nTotal Collisions: ${collisions}\n`
    
    // Check if this matches known Pi digits
    const collisionStr = collisions.toString()
    if (piStr.includes(collisionStr)) {
      const piDigits = this.physics.getDigitsOfPi(collisions)
      message += `This gives us π ≈ ${piDigits}!\n\n`
      
      if (collisionStr.length >= 4) {
        message += `Congratulations! You've discovered ${collisionStr.length} digits of π through collisions!`
      } else {
        message += `Try a mass ratio that's a power of 100 (like 1:10000) for more π digits!`
      }
    } else {
      message += `Try adjusting the mass ratio to a power of 100 (1, 100, 10000, etc.) to see π emerge!`
    }
    
    alert(message)
  }
}

// Physics Engine Classes (included here for simplicity)
class Block {
  constructor(x, y, width, height, mass, velocity = 0, color = '#333') {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.mass = mass
    this.velocity = velocity
    this.color = color
    this.originalX = x
    this.originalVelocity = velocity
  }

  update(deltaTime) {
    this.x += this.velocity * deltaTime
  }

  draw(ctx) {
    // Draw the block with a gradient and shadow effect
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, this.color)
    gradient.addColorStop(1, this.darkenColor(this.color, 0.3))
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(this.x + 3, this.y + 3, this.width, this.height)
    
    // Main block
    ctx.fillStyle = gradient
    ctx.fillRect(this.x, this.y, this.width, this.height)
    
    // Border
    ctx.strokeStyle = this.darkenColor(this.color, 0.5)
    ctx.lineWidth = 2
    ctx.strokeRect(this.x, this.y, this.width, this.height)
    
    // Mass label
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      `m=${this.mass}`,
      this.x + this.width / 2,
      this.y + this.height / 2 + 5
    )
    
    // Velocity arrow
    if (Math.abs(this.velocity) > 0.01) {
      this.drawVelocityArrow(ctx)
    }
  }

  drawVelocityArrow(ctx) {
    const centerX = this.x + this.width / 2
    const centerY = this.y - 20
    const arrowLength = Math.min(Math.abs(this.velocity) * 20, 50)
    const direction = this.velocity > 0 ? 1 : -1
    
    ctx.strokeStyle = '#ff4757'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(centerX + direction * arrowLength, centerY)
    ctx.stroke()
    
    // Arrow head
    ctx.fillStyle = '#ff4757'
    ctx.beginPath()
    ctx.moveTo(centerX + direction * arrowLength, centerY)
    ctx.lineTo(centerX + direction * (arrowLength - 8), centerY - 4)
    ctx.lineTo(centerX + direction * (arrowLength - 8), centerY + 4)
    ctx.closePath()
    ctx.fill()
    
    // Velocity label
    ctx.fillStyle = '#ff4757'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      `v=${this.velocity.toFixed(2)}`,
      centerX + direction * arrowLength / 2,
      centerY - 8
    )
  }

  darkenColor(color, factor) {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`
    }
    return color
  }

  reset() {
    this.x = this.originalX
    this.velocity = this.originalVelocity
  }

  getRight() {
    return this.x + this.width
  }

  getLeft() {
    return this.x
  }

  getCenter() {
    return this.x + this.width / 2
  }
}

class PhysicsEngine {
  constructor(wallPosition = 0) {
    this.wallPosition = wallPosition
    this.blocks = []
    this.collisionCount = 0
    this.wallCollisions = 0
    this.blockCollisions = 0
    this.timeScale = 1
    this.collisionHistory = []
  }

  addBlock(block) {
    this.blocks.push(block)
  }

  reset() {
    this.collisionCount = 0
    this.wallCollisions = 0
    this.blockCollisions = 0
    this.collisionHistory = []
    this.blocks.forEach(block => block.reset())
  }

  update(deltaTime) {
    const scaledDeltaTime = deltaTime * this.timeScale
    
    // Update positions
    this.blocks.forEach(block => {
      block.update(scaledDeltaTime)
    })

    // Check for collisions
    this.checkWallCollisions()
    this.checkBlockCollisions()
  }

  checkWallCollisions() {
    this.blocks.forEach(block => {
      if (block.getLeft() <= this.wallPosition && block.velocity < 0) {
        // Collision with wall - perfectly elastic
        block.velocity = -block.velocity
        block.x = this.wallPosition // Ensure block doesn't penetrate wall
        
        this.collisionCount++
        this.wallCollisions++
        this.recordCollision('wall', block)
      }
    })
  }

  checkBlockCollisions() {
    for (let i = 0; i < this.blocks.length; i++) {
      for (let j = i + 1; j < this.blocks.length; j++) {
        const block1 = this.blocks[i]
        const block2 = this.blocks[j]
        
        if (this.areColliding(block1, block2)) {
          this.resolveElasticCollision(block1, block2)
          this.collisionCount++
          this.blockCollisions++
          this.recordCollision('blocks', block1, block2)
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
            (block1.velocity <= 0 && block2.velocity > 0))
  }

  resolveElasticCollision(block1, block2) {
    // Perfectly elastic collision in 1D
    const m1 = block1.mass
    const m2 = block2.mass
    const v1 = block1.velocity
    const v2 = block2.velocity

    // Calculate new velocities using conservation of momentum and energy
    const newV1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)
    const newV2 = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)

    block1.velocity = newV1
    block2.velocity = newV2

    // Separate blocks to prevent multiple collision detection
    const overlap = block1.getRight() - block2.getLeft()
    if (overlap > 0) {
      const totalMass = m1 + m2
      block1.x -= overlap * (m2 / totalMass)
      block2.x += overlap * (m1 / totalMass)
    }
  }

  recordCollision(type, block1, block2 = null) {
    this.collisionHistory.push({
      type: type,
      time: Date.now(),
      block1: { mass: block1.mass, velocity: block1.velocity },
      block2: block2 ? { mass: block2.mass, velocity: block2.velocity } : null
    })
  }

  draw(ctx, canvasWidth, canvasHeight) {
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // Draw ground
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(0, canvasHeight - 50, canvasWidth, 50)
    
    // Draw wall
    ctx.fillStyle = '#696969'
    const wallWidth = 20
    ctx.fillRect(this.wallPosition - wallWidth, 0, wallWidth, canvasHeight - 50)
    
    // Wall pattern
    ctx.fillStyle = '#555555'
    for (let y = 0; y < canvasHeight - 50; y += 40) {
      for (let x = 0; x < wallWidth; x += 20) {
        if ((Math.floor(y / 40) + Math.floor(x / 20)) % 2 === 0) {
          ctx.fillRect(this.wallPosition - wallWidth + x, y, 20, 40)
        }
      }
    }
    
    // Draw blocks
    this.blocks.forEach(block => {
      block.draw(ctx)
    })
    
    // Draw collision sparks if recent collision
    this.drawCollisionEffects(ctx)
  }

  drawCollisionEffects(ctx) {
    const recentCollisions = this.collisionHistory.filter(
      collision => Date.now() - collision.time < 200
    )
    
    recentCollisions.forEach(collision => {
      if (collision.type === 'wall') {
        this.drawSparks(ctx, this.wallPosition, 200, '#FFD700')
      } else if (collision.type === 'blocks') {
        // Find collision point between blocks
        const collisionX = this.blocks.find(b => b.mass === collision.block1.mass)?.getRight() || 400
        this.drawSparks(ctx, collisionX, 200, '#FF6347')
      }
    })
  }

  drawSparks(ctx, x, y, color) {
    ctx.fillStyle = color
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const radius = Math.random() * 20 + 10
      const sparkX = x + Math.cos(angle) * radius
      const sparkY = y + Math.sin(angle) * radius
      
      ctx.beginPath()
      ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  isSimulationComplete() {
    // Simulation is complete when all blocks are moving away from each other
    // and the faster block is moving right
    if (this.blocks.length !== 2) return false
    
    const [block1, block2] = this.blocks
    const leftBlock = block1.x < block2.x ? block1 : block2
    const rightBlock = block1.x < block2.x ? block2 : block1
    
    return leftBlock.velocity >= 0 && rightBlock.velocity >= leftBlock.velocity
  }

  getDigitsOfPi(collisionCount) {
    const piStr = Math.PI.toString()
    const digits = collisionCount.toString()
    
    if (digits.length <= piStr.length - 2) { // -2 for "3."
      return piStr.substring(0, 2 + digits.length)
    }
    
    return piStr
  }
}
