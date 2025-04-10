// Select DOM elements once and cache them
const scoreDisplay = document.querySelector(".score-display span");
const clickableArea = document.querySelector(".clickable-area");
const moneySignsContainer = document.getElementById("money-signs");
const bumpers = document.querySelectorAll(".bumper");
const upgradeBumperButton = document.getElementById("upgrade-bumper");

// Base income elements
const baseIncomeElement = document.querySelector(".base-income span:nth-child(3)");
const baseIncomeLevelElement = document.querySelector(".base-income span:nth-child(2)");
const upgradeBaseIncomeButton = document.getElementById("upgrade-base-income");
const baseIncomeUpgradeCostElement = document.getElementById("base-income-cost");

// Speed elements
const speedElement = document.querySelector(".speed span:nth-child(3)");
const speedLevelElement = document.querySelector(".speed span:nth-child(2)");
const upgradeSpeedButton = document.getElementById("upgrade-speed");
const speedUpgradeCostElement = document.getElementById("speed-cost");
const spawnTimeElement = document.querySelector(".spawn-time");

// Bumper elements
const bumperLevelElement = document.querySelector(".bumper-upgrade .level");
const bumperCostElement = document.querySelector(".bumper-upgrade .cost");

// Initialize game state
let money = parseFloat(scoreDisplay.textContent) || 0; // Current money

// Base Income stats
let baseIncomeLevel = 1;
let baseIncomeValue = 1; // Start at $1
let baseIncomeUpgradeCost = 10; // Initial upgrade cost

// Speed stats
let speedLevel = 1; // Start at level 1
let speedValue = 1; // Start at 1
let speedUpgradeCost = 10; // Initial upgrade cost

// Bumper stats
let bumperValue = 1; // Start at $1
let bumperUpgradeCost = 10; // Initial upgrade cost
let bumperLevel = parseInt("<%= bumper.level %>") || 1;
let bumperMultiplier = parseFloat("<%= bumper.multiplier %>") || 1;

// New global variables for bumper management
let activeGameBumpers = 8; // Track how many bumpers are active in the game area
const MAX_GAME_BUMPERS = 8; // Maximum number of bumpers in the game area
let draggedBumper = null; // Track which bumper is being dragged

// Physics settings - optimized for 60 FPS
const FPS = 60;
const frameTime = 1000 / FPS;
const gravity = 0.5;
const bounceFactor = 0.85;
const frictionFactor = 0.99;

// OPTIMIZATION: Pre-calculate game boundaries for physics
let gameAreaWidth, gameAreaHeight;
let gameBounds = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0
};

// OPTIMIZATION: Object pool for money signs to reduce garbage collection
const moneySignPool = {
  elements: [],
  maxSize: 30, // Maximum number of money signs in the pool
  
  // Get a money sign from the pool or create a new one
  get: function() {
    if (this.elements.length > 0) {
      const element = this.elements.pop();
      element.style.display = "block";
      return element;
    } else {
      const element = document.createElement("span");
      element.classList.add("money-sign");
      return element;
    }
  },
  
  // Return a money sign to the pool
  recycle: function(element) {
    if (this.elements.length < this.maxSize) {
      element.style.display = "none";
      this.elements.push(element);
    } else {
      // If pool is full, remove the element from DOM
      element.remove();
    }
  }
};

// Game state object to store important values
const gameState = {
  money: money, // Current money
  baseIncomeLevel: baseIncomeLevel,
  baseIncomeValue: baseIncomeValue,
  baseIncomeUpgradeCost: baseIncomeUpgradeCost,
  speedLevel: speedLevel,
  speedValue: speedValue,
  speedUpgradeCost: speedUpgradeCost,
  bumperLevel: bumperLevel,
  bumperValue: bumperValue,
  bumperUpgradeCost: bumperUpgradeCost,
  bumperMultiplier: bumperMultiplier,
};

// Function to format currency with abbreviations and one decimal point
function formatCurrency(value) {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`; // Billions with one decimal
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`; // Millions with one decimal
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`; // Thousands with one decimal
  } else {
    return `$${value.toFixed(0)}`; // No decimal for values below 1000
  }
}

// OPTIMIZATION: Use requestAnimationFrame for UI updates to prevent layout thrashing
let uiUpdatePending = false;
function scheduleUIUpdate() {
  if (!uiUpdatePending) {
    uiUpdatePending = true;
    requestAnimationFrame(() => {
      updateUI();
      uiUpdatePending = false;
    });
  }
}

// Function to update the UI
function updateUI() {
  // Update money display
  scoreDisplay.textContent = formatCurrency(money);

  // Update base income display
  baseIncomeElement.textContent = `$${baseIncomeValue}`;
  baseIncomeLevelElement.textContent = `${baseIncomeLevel} > ${baseIncomeLevel + 1}`;
  baseIncomeUpgradeCostElement.textContent = `$${baseIncomeUpgradeCost}`;

  // Update speed display
  const baseSpawnTime = 3000; // Base spawn time in milliseconds (100%)
  const spawnTimePercentage = 100 + (speedLevel - 1) * 5; // Start at 100% and increase by 5% per level
  const currentSpawnTime = (baseSpawnTime / (spawnTimePercentage / 100)) / 1000; // Convert to seconds
  speedElement.textContent = `${spawnTimePercentage}%`; // Show current spawn speed percentage
  speedLevelElement.textContent = `${spawnTimePercentage}% > ${spawnTimePercentage + 5}%`; // Show progression to the next level
  speedUpgradeCostElement.textContent = `$${speedUpgradeCost}`;

  // Display spawn time in seconds
  if (spawnTimeElement) {
    spawnTimeElement.textContent = `Spawn Time: ${currentSpawnTime.toFixed(1)}s`;
  }

  // Update bumper display
  bumperLevelElement.textContent = `Level: ${bumperLevel}`;
  bumperCostElement.textContent = `Cost: $${bumperUpgradeCost}`;

  // OPTIMIZATION: Batch update bumper effects
  const gameBumpers = document.querySelectorAll(".game-area .bumper");
  gameBumpers.forEach((bumper) => {
    bumper.dataset.effect = `+${bumperValue}`;
    bumper.textContent = `+${bumperValue}`;
  });
}

// Base Income upgrade logic
upgradeBaseIncomeButton.addEventListener("click", () => {
  if (money >= baseIncomeUpgradeCost) {
    money -= baseIncomeUpgradeCost;
    baseIncomeLevel++;
    baseIncomeValue += 1;
    baseIncomeUpgradeCost = Math.round(baseIncomeUpgradeCost * 1.2);
    updateGameState();
    scheduleUIUpdate();
  } else {
    alert("Not enough money for base income upgrade!");
  }
});

// Speed upgrade logic
upgradeSpeedButton.addEventListener("click", () => {
  if (money >= speedUpgradeCost) {
    money -= speedUpgradeCost;
    speedLevel++;
    speedValue += 1;
    speedUpgradeCost = Math.round(speedUpgradeCost * 1.2);
    updateMoneySpawnRate();
    scheduleUIUpdate();
  } else {
    alert("Not enough money for speed upgrade!");
  }
});

// Bumper upgrade logic
upgradeBumperButton.addEventListener("click", () => {
  if (money >= bumperUpgradeCost) {
    money -= bumperUpgradeCost;
    bumperLevel++;
    bumperValue += 1;
    bumperMultiplier += 0.1;
    bumperUpgradeCost = Math.round(bumperUpgradeCost * 1.2);
    scheduleUIUpdate();
  } else {
    alert("Not enough money for bumper upgrade!");
  }
});

// OPTIMIZATION: Debounce money spawn to prevent too many spawns
let moneySpawnInterval;
function updateMoneySpawnRate() {
  if (moneySpawnInterval) {
    clearInterval(moneySpawnInterval);
  }

  const baseSpawnTime = 3000;
  const spawnTimePercentage = 100 + (speedLevel - 1) * 5;
  const spawnTime = Math.round(baseSpawnTime / (spawnTimePercentage / 100));

  // OPTIMIZATION: Limit spawn rate if too many active money signs
  moneySpawnInterval = setInterval(() => {
    if (activeMoneyPhysics.length < Math.min(30, 10 + speedLevel)) {
      const physics = createMoneySign();
      activeMoneyPhysics.push(physics);
    }
  }, spawnTime);
}

// OPTIMIZATION: Use object pool for money signs
function createMoneySign() {
  // Get money sign from pool or create new one
  const moneySign = moneySignPool.get();
  moneySign.textContent = `$${baseIncomeValue}`;
  
  // Position the money sign in the center with a little randomness (±5%)
  moneySign.style.left = `${50 + (Math.random() * 10 - 5)}%`;
  moneySign.style.transform = "translateX(-50%)";
  moneySign.style.top = "0";
  moneySignsContainer.appendChild(moneySign);

  // Create a physics object to track this money sign
  const physics = {
    element: moneySign,
    x: (parseFloat(moneySign.style.left) / 100) * gameBounds.right,
    y: parseFloat(moneySign.style.top) || 0,
    vx: (Math.random() * 2 - 1) * 2,
    vy: 2,
    width: 24, // OPTIMIZATION: Use fixed sizes instead of getBoundingClientRect
    height: 24,
    collisions: new Set(),
    active: true,
    value: baseIncomeValue,
    hitCount: 0,
  };

  return physics;
}

// Array to store all active money signs
const activeMoneyPhysics = [];

// OPTIMIZATION: Cache bumper positions and sizes for efficient collision detection
let bumperCache = [];

function updateBumperCache() {
  bumperCache = [];
  const activeBumpers = document.querySelectorAll(".game-area .bumper");
  
  activeBumpers.forEach((bumper) => {
    const rect = bumper.getBoundingClientRect();
    const gameAreaRect = clickableArea.getBoundingClientRect();
    
    bumperCache.push({
      element: bumper,
      effect: parseFloat(bumper.dataset.effect.replace("+", "")),
      centerX: rect.left + rect.width/2 - gameAreaRect.left,
      centerY: rect.top + rect.height/2 - gameAreaRect.top,
      radius: rect.width/2
    });
  });
}

// OPTIMIZATION: Use requestAnimationFrame for game loop instead of setInterval
let lastFrameTime = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdateTime = 0;

function gameLoop(timestamp) {
  // Calculate delta time and FPS
  if (!lastFrameTime) lastFrameTime = timestamp;
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  
  // Update FPS counter
  frameCount++;
  if (timestamp - lastFpsUpdateTime > 1000) {
    fps = Math.round(frameCount * 1000 / (timestamp - lastFpsUpdateTime));
    frameCount = 0;
    lastFpsUpdateTime = timestamp;
  }

  // Only update physics if enough time has passed (throttling for low-end devices)
  if (deltaTime < 100) { // Skip if lag spike over 100ms
    // Update money signs physics
    updatePhysics(deltaTime);
  }
  
  // Continue the loop
  requestAnimationFrame(gameLoop);
}

// OPTIMIZATION: Optimized physics update function
function updatePhysics(deltaTime) {
  // Normalize time step to ensure consistent physics regardless of frame rate
  const timeStep = deltaTime / (1000/60); // Normalize to 60fps timing
  
  // Update each money sign with improved physics
  for (let i = activeMoneyPhysics.length - 1; i >= 0; i--) {
    const physics = activeMoneyPhysics[i];
    if (!physics.active) continue;

    // Store previous position for continuous collision detection
    const prevX = physics.x;
    const prevY = physics.y;

    // Apply gravity scaled by time step
    physics.vy += gravity * timeStep;

    // Apply friction scaled by time step
    physics.vx *= Math.pow(frictionFactor, timeStep);

    // Update position scaled by time step
    physics.x += physics.vx * timeStep;
    physics.y += physics.vy * timeStep;

    // Calculate velocity magnitude - used to identify fast-moving objects
    const velocityMagnitude = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);

    // Check collision with each bumper - using continuous collision detection for fast objects
    let collisionDetected = false;

    // OPTIMIZATION: Use cached bumper data
    for (const bumper of bumperCache) {
      // Skip if we recently collided with this bumper
      if (physics.collisions.has(bumper.element)) continue;

      // Calculate centers for money sign
      const moneyCenterX = physics.x + physics.width/2;
      const moneyCenterY = physics.y + physics.height/2;
      const moneyRadius = physics.width/2;

      // Detect collision between circles
      const dx = moneyCenterX - bumper.centerX;
      const dy = moneyCenterY - bumper.centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const combinedRadii = bumper.radius + moneyRadius;

      // Add a small buffer to improve collision detection reliability
      let collision = distance <= combinedRadii + 2;

      // For fast-moving objects, also check if the line segment from previous position
      // to current position intersects with the bumper circle
      if (!collision && velocityMagnitude > 5) {
        // Vector from previous to current position
        const moveX = physics.x - prevX;
        const moveY = physics.y - prevY;
        const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);

        if (moveLength > 0) {
          // Previous center position
          const prevCenterX = moneyCenterX - moveX;
          const prevCenterY = moneyCenterY - moveY;

          // Vector from previous center to bumper center
          const toPrevX = bumper.centerX - prevCenterX;
          const toPrevY = bumper.centerY - prevCenterY;

          // Project this vector onto movement direction
          const dot = (toPrevX * moveX + toPrevY * moveY) / moveLength;

          // Clamp to get closest point on movement line
          const closestT = Math.max(0, Math.min(1, dot / moveLength));

          // Closest point coordinates
          const closestX = prevCenterX + closestT * moveX;
          const closestY = prevCenterY + closestT * moveY;

          // Distance from closest point to bumper center
          const closestDx = closestX - bumper.centerX;
          const closestDy = closestY - bumper.centerY;
          const closestDistance = Math.sqrt(closestDx * closestDx + closestDy * closestDy);

          // Check if this closest point is within the bumper radius
          collision = closestDistance <= bumper.radius + moneyRadius;
        }
      }

      // Process collision if detected
      if (collision) {
        collisionDetected = true;

        // Apply bumper effect to money sign value
        physics.value += bumper.effect;
        physics.hitCount++;

        // Update the money sign display with new value
        physics.element.textContent = formatCurrency(physics.value);

        // Change the color based on value - OPTIMIZATION: Use fewer color changes
        if (physics.hitCount % 2 === 0) {
          const intensity = Math.min(255, Math.floor(50 + physics.hitCount * 15));
          physics.element.style.color = `rgb(${intensity}, 255, ${intensity})`;
        }

        // OPTIMIZATION: Use a CSS class for flash effect instead of direct style changes
        bumper.element.classList.add('bumper-flash');
        setTimeout(() => {
          bumper.element.classList.remove('bumper-flash');
        }, 100);

        // Calculate collision response
        // Normalize to get direction
        const nx = dx / (distance || 1); // Avoid division by zero
        const ny = dy / (distance || 1);

        // Apply bounce direction
        const speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
        physics.vx = nx * speed * bounceFactor * 1.2; // Boost bounce speed
        physics.vy = ny * speed * bounceFactor * 1.2;

        // Ensure minimum velocity after bounce
        const minVelocity = 3;
        if (Math.abs(physics.vx) + Math.abs(physics.vy) < minVelocity) {
          physics.vx = nx * minVelocity;
          physics.vy = ny * minVelocity;
        }

        // Prevent multiple collisions with the same bumper
        physics.collisions.add(bumper.element);
        setTimeout(() => {
          physics.collisions.delete(bumper.element);
        }, 500);
      }
    }

    // OPTIMIZATION: Use CSS transform for position updates instead of left/top
    // This avoids layout thrashing by using the GPU for positioning
    physics.element.style.transform = `translate(${(physics.x / gameBounds.right) * 100}%, ${physics.y}px)`;

    // Check boundary collisions
    // Left and right bounds
    if (physics.x < 0) {
      physics.x = 0;
      physics.vx = Math.abs(physics.vx) * bounceFactor;
    } else if (physics.x + physics.width > gameBounds.right) {
      physics.x = gameBounds.right - physics.width;
      physics.vx = -Math.abs(physics.vx) * bounceFactor;
    }

    // Top bound
    if (physics.y < 0) {
      physics.y = 0;
      physics.vy = Math.abs(physics.vy) * bounceFactor;
    }

    // Bottom bound (spikes)
    if (physics.y + physics.height > gameBounds.bottom - 30) {
      // Add value to money count
      money += physics.value;
      scheduleUIUpdate();

      // OPTIMIZATION: Use object pooling for floating text
      showEarnText(physics.x, gameBounds.bottom - 40, physics.value);

      // Recycle the money sign
      physics.active = false;
      moneySignPool.recycle(physics.element);
      activeMoneyPhysics.splice(i, 1);
    }
  }
}

// OPTIMIZATION: Efficient earn text display
const earnTextPool = [];
function showEarnText(x, y, value) {
  // Get or create earn text element
  let earnText;
  if (earnTextPool.length > 0) {
    earnText = earnTextPool.pop();
    earnText.style.display = "block";
  } else {
    earnText = document.createElement("span");
    earnText.style.position = "absolute";
    earnText.style.color = "#00ff00";
    earnText.style.fontSize = "18px";
    earnText.style.fontWeight = "bold";
    earnText.style.zIndex = "100";
  }
  
  earnText.textContent = `+${formatCurrency(value)}`;
  earnText.style.left = `${(x / gameBounds.right) * 100}%`;
  earnText.style.top = `${y}px`;
  earnText.style.opacity = "1";
  clickableArea.appendChild(earnText);

  // Animate with requestAnimationFrame for better performance
  let opacity = 1;
  let posY = y;
  let startTime = performance.now();
  
  function animateEarnText(timestamp) {
    const elapsed = timestamp - startTime;
    if (elapsed > 1000) {
      // Animation complete, recycle element
      earnText.style.display = "none";
      earnTextPool.push(earnText);
      return;
    }
    
    opacity = 1 - (elapsed / 1000);
    posY -= 1;
    
    earnText.style.opacity = opacity;
    earnText.style.top = `${posY}px`;
    
    requestAnimationFrame(animateEarnText);
  }
  
  requestAnimationFrame(animateEarnText);
}

// Initialize the bumper system
function initBumperSystem() {
  // Make all game area bumpers draggable
  const gameBumpers = document.querySelectorAll(".game-area .bumper");
  gameBumpers.forEach((bumper) => {
    makeBumperDraggable(bumper);
  });

  // Create empty placeholders for each bumper position
  createBumperPlaceholders();

  // Make upgrade slots droppable
  initUpgradeSlots();
  
  // OPTIMIZATION: Cache bumper positions for collision detection
  updateBumperCache();
}

// Create placeholder elements for bumper positions
function createBumperPlaceholders() {
  const clickableArea = document.querySelector(".clickable-area");
  
  // OPTIMIZATION: Create placeholders in a document fragment to avoid layout thrashing
  const fragment = document.createDocumentFragment();
  
  for (let i = 1; i <= MAX_GAME_BUMPERS; i++) {
    const placeholder = document.createElement("div");
    placeholder.classList.add("bumper-placeholder");
    placeholder.dataset.position = i;

    // Get the original bumper for this position
    const bumper = document.querySelector(`.bumper-${i}`);
    if (bumper) {
      // Store the original CSS positioning properties
      const computedStyle = window.getComputedStyle(bumper);

      // Store all position data attributes for precise repositioning
      placeholder.dataset.top = computedStyle.top;
      placeholder.dataset.left = computedStyle.left;
      placeholder.dataset.bottom = computedStyle.bottom;
      placeholder.dataset.right = computedStyle.right;
      placeholder.dataset.transform = computedStyle.transform;

      // Apply the exact positioning to match the bumper
      placeholder.style.top = computedStyle.top;
      placeholder.style.left = computedStyle.left;
      placeholder.style.bottom = computedStyle.bottom;
      placeholder.style.right = computedStyle.right;
      placeholder.style.transform = computedStyle.transform;

      // Initially hide placeholder since bumper is present
      placeholder.style.display = "none";
    }

    // OPTIMIZATION: Use event delegation for drag-and-drop events
    placeholder.addEventListener("dragover", (event) => {
      event.preventDefault();
      placeholder.classList.add("dragover");
    });

    placeholder.addEventListener("dragleave", () => {
      placeholder.classList.remove("dragover");
    });

    placeholder.addEventListener("drop", (event) => {
      event.preventDefault();
      placeholder.classList.remove("dragover");
      handleBumperDrop(placeholder);
    });

    fragment.appendChild(placeholder);
  }
  
  clickableArea.appendChild(fragment);
}

// Make a bumper element draggable
function makeBumperDraggable(bumper) {
  bumper.setAttribute("draggable", true);

  bumper.addEventListener("dragstart", (event) => {
    draggedBumper = bumper;
    // Set the drag image and data
    event.dataTransfer.setData("text/plain", bumper.getAttribute("class"));
    event.dataTransfer.effectAllowed = "move";

    // Add dragging class for styling
    bumper.classList.add("dragging");

    // Show the placeholder where this bumper was
    const position = getBumperPosition(bumper);
    const placeholder = document.querySelector(`.bumper-placeholder[data-position="${position}"]`);
    if (placeholder) {
      // Store the current bumper's exact position before showing placeholder
      const computedStyle = window.getComputedStyle(bumper);
      placeholder.dataset.top = computedStyle.top;
      placeholder.dataset.left = computedStyle.left;
      placeholder.dataset.bottom = computedStyle.bottom;
      placeholder.dataset.right = computedStyle.right;
      placeholder.dataset.transform = computedStyle.transform;

      // Apply the exact positioning
      placeholder.style.top = computedStyle.top;
      placeholder.style.left = computedStyle.left;
      placeholder.style.bottom = computedStyle.bottom;
      placeholder.style.right = computedStyle.right;
      placeholder.style.transform = computedStyle.transform;

      placeholder.style.display = "flex";
    }
  });

  bumper.addEventListener("dragend", (event) => {
    bumper.classList.remove("dragging");

    // If the drop was not successful (no valid target), return the bumper to its original position
    // Check if bumper is still in the DOM and draggedBumper is still set
    if (draggedBumper === bumper) {
      // Get the position of this bumper
      const position = getBumperPosition(bumper);

      // Hide the placeholder for this position since the bumper is returning
      const placeholder = document.querySelector(`.bumper-placeholder[data-position="${position}"]`);
      if (placeholder) {
        placeholder.style.display = "none";
      }

      // Reset draggedBumper since the operation is complete
      draggedBumper = null;
    }
  });
}

// Get the position number from a bumper's class
function getBumperPosition(bumper) {
  const classes = bumper.className.split(" ");
  for (const cls of classes) {
    if (cls.startsWith("bumper-")) {
      return parseInt(cls.replace("bumper-", ""));
    }
  }
  return null;
}

// Initialize upgrade slots to accept bumpers
function initUpgradeSlots() {
  const upgradeSlots = document.querySelectorAll(".upgrade-slot");

  // OPTIMIZATION: Use event delegation for upgrade slots
  const upgradesContainer = document.querySelector(".upgrades");
  if (upgradesContainer) {
    upgradesContainer.addEventListener("dragover", (event) => {
      if (event.target.classList.contains("upgrade-slot")) {
        event.preventDefault();
        event.target.classList.add("dragover");
      }
    });
    
    upgradesContainer.addEventListener("dragleave", (event) => {
      if (event.target.classList.contains("upgrade-slot")) {
        event.target.classList.remove("dragover");
      }
    });
    
    upgradesContainer.addEventListener("drop", (event) => {
      if (event.target.classList.contains("upgrade-slot")) {
        event.preventDefault();
        event.target.classList.remove("dragover");
        
        // Handle dropping a bumper on an upgrade slot
        if (draggedBumper && !event.target.hasChildNodes()) {
          handleBumperStoreDrop(event.target);
        }
      }
    });
    
    upgradesContainer.addEventListener("dragstart", (event) => {
      if (event.target.classList.contains("stored-bumper")) {
        draggedBumper = event.target;
        event.dataTransfer.setData("text/plain", "stored-bumper");
      }
    });
  } else {
    // Fallback to individual event listeners if container not found
    upgradeSlots.forEach((slot) => {
      slot.addEventListener("dragover", (event) => {
        event.preventDefault();
        slot.classList.add("dragover");
      });

      slot.addEventListener("dragleave", () => {
        slot.classList.remove("dragover");
      });

      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        slot.classList.remove("dragover");

        if (draggedBumper && !slot.hasChildNodes()) {
          handleBumperStoreDrop(slot);
        }
      });

      slot.addEventListener("dragstart", (event) => {
        if (slot.firstChild && slot.firstChild.classList.contains("stored-bumper")) {
          draggedBumper = slot.firstChild;
          event.dataTransfer.setData("text/plain", "stored-bumper");
        }
      });
    });
  }
}

// Handle dropping a bumper onto an upgrade slot
function handleBumperStoreDrop(slot) {
  if (!draggedBumper) return;

  // Get position for placeholder visibility
  const position = getBumperPosition(draggedBumper);

  // Create a new stored bumper element
  const storedBumper = document.createElement("div");
  storedBumper.classList.add("stored-bumper");
  storedBumper.setAttribute("draggable", true);
  storedBumper.dataset.position = position;
  storedBumper.dataset.effect = draggedBumper.dataset.effect;
  storedBumper.textContent = draggedBumper.textContent;

  // Add to upgrade slot
  slot.appendChild(storedBumper);

  // Remove the original bumper from game area
  draggedBumper.remove();
  activeGameBumpers--;

  // Make the stored bumper draggable
  storedBumper.addEventListener("dragstart", (event) => {
    draggedBumper = storedBumper;
    event.dataTransfer.setData("text/plain", "stored-bumper");
  });

  storedBumper.addEventListener("dragend", () => {
    draggedBumper = null;
  });

  // Clear the draggedBumper reference since we've handled it
  draggedBumper = null;

  // Update game mechanics
  updateBumperGameEffects();
  
  // OPTIMIZATION: Update bumper cache when bumpers change
  updateBumperCache();
}

// Update the handleBumperDrop function to properly clear draggedBumper
function handleBumperDrop(placeholder) {
  if (!draggedBumper) return;

  const position = placeholder.dataset.position;

  // If