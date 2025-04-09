// Select DOM elements
const scoreDisplay = document.querySelector(".score-display span");
const clickableArea = document.querySelector(".clickable-area");
const moneySignsContainer = document.getElementById("money-signs");
const bumpers = document.querySelectorAll(".bumper");
const upgradeBumperButton = document.getElementById("upgrade-bumper");

// Base income elements
const baseIncomeElement = document.querySelector(
  ".base-income span:nth-child(3)"
);
const baseIncomeLevelElement = document.querySelector(
  ".base-income span:nth-child(2)"
);
const upgradeBaseIncomeButton = document.getElementById("upgrade-base-income");
const baseIncomeUpgradeCostElement =
  document.getElementById("base-income-cost");

// Speed elements
const speedElement = document.querySelector(".speed span:nth-child(3)");
const speedLevelElement = document.querySelector(".speed span:nth-child(2)");
const upgradeSpeedButton = document.getElementById("upgrade-speed");
const speedUpgradeCostElement = document.getElementById("speed-cost");

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
let speedLevel = 1;
let speedValue = 1; // Start at $1
let speedUpgradeCost = 10; // Initial upgrade cost

// Bumper stats
let bumperValue = 1; // Start at $1
let bumperUpgradeCost = 10; // Initial upgrade cost
// In home.js, update the initialization to use server values:
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

// Function to update the UI
function updateUI() {
  // Update money display
  scoreDisplay.textContent = `$${money.toFixed(2)}`;

  // Update base income display
  baseIncomeElement.textContent = `$${baseIncomeValue}`;
  baseIncomeLevelElement.textContent = `${baseIncomeLevel} > ${
    baseIncomeLevel + 1
  }`;
  baseIncomeUpgradeCostElement.textContent = `$${baseIncomeUpgradeCost}`;

  // Update speed display
  speedElement.textContent = `$${speedValue}`;
  speedLevelElement.textContent = `${speedLevel} > ${speedLevel + 1}`;
  speedUpgradeCostElement.textContent = `$${speedUpgradeCost}`;

  // Update bumper display
  bumperLevelElement.textContent = `Level: ${bumperLevel}`;
  bumperCostElement.textContent = `Cost: $${bumperUpgradeCost}`;

  // Update bumper effect text on the game area
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

    // Increase the base income value by 1 each level
    baseIncomeValue += 1;

    // Increase the cost for next upgrade
    baseIncomeUpgradeCost = Math.round(baseIncomeUpgradeCost * 1.2);

    updateGameState(); // Update the state
    updateUI();
  } else {
    alert("Not enough money for base income upgrade!");
  }
});

// Speed upgrade logic
upgradeSpeedButton.addEventListener("click", () => {
  if (money >= speedUpgradeCost) {
    money -= speedUpgradeCost;
    speedLevel++;

    // Increase the speed value by 1 each level
    speedValue += 1;

    // Increase the cost for next upgrade
    speedUpgradeCost = Math.round(speedUpgradeCost * 1.2);

    // Update spawn rate for money signs based on speed
    updateMoneySpawnRate();

    updateUI();
  } else {
    alert("Not enough money for speed upgrade!");
  }
});

// Bumper upgrade logic
upgradeBumperButton.addEventListener("click", () => {
  if (money >= bumperUpgradeCost) {
    money -= bumperUpgradeCost;
    bumperLevel++;

    // Increase the bumper value by 1 each level
    bumperValue += 1;

    // Increase the bumper multiplier slightly
    bumperMultiplier += 0.1;

    // Increase the cost for next upgrade
    bumperUpgradeCost = Math.round(bumperUpgradeCost * 1.2);

    updateUI();
  } else {
    alert("Not enough money for bumper upgrade!");
  }
});

// Function to update money spawn rate based on speed
function updateMoneySpawnRate() {
  // Clear existing interval
  if (window.moneySpawnInterval) {
    clearInterval(window.moneySpawnInterval);
  }

  // Calculate spawn rate based on speed (higher speed = faster spawn)
  const baseSpawnTime = 3000; // 3 seconds base time
  const spawnTime = Math.max(300, baseSpawnTime - speedValue * 50); // Minimum 0.3 seconds

  // Create new interval with updated spawn rate
  window.moneySpawnInterval = setInterval(() => {
    const physics = createMoneySign();
    activeMoneyPhysics.push(physics);
  }, spawnTime);
}

// Function to create a money sign with improved physics
function createMoneySign() {
  // Use the current base income value for money signs
  const moneySign = document.createElement("span");
  moneySign.classList.add("money-sign");
  moneySign.textContent = `$${baseIncomeValue}`;

  // Position the money sign in the center with a little randomness (±5%)
  moneySign.style.left = `${50 + (Math.random() * 10 - 5)}%`;
  moneySign.style.transform = "translateX(-50%)";
  moneySign.style.top = "0"; // Start at the top of the game area
  moneySignsContainer.appendChild(moneySign);

  // Create a physics object to track this money sign
  const physics = {
    element: moneySign,
    // Convert percentage to absolute position
    x: (parseFloat(moneySign.style.left) / 100) * clickableArea.offsetWidth,
    y: parseFloat(moneySign.style.top) || 0,
    vx: (Math.random() * 2 - 1) * 2, // Initial x velocity with more variance
    vy: 2, // Initial y velocity (starts slower)
    width: 0,
    height: 0,
    collisions: new Set(), // Track which bumpers we've collided with recently
    active: true,
    value: baseIncomeValue, // Store the current base income value
  };

  // Measure the element after it's rendered
  requestAnimationFrame(() => {
    const rect = moneySign.getBoundingClientRect();
    physics.width = rect.width;
    physics.height = rect.height;
  });

  return physics;
}

// Array to store all active money signs
const activeMoneyPhysics = [];

// Main game loop running at 60 FPS
setInterval(() => {
  const gameAreaWidth = clickableArea.offsetWidth;
  const gameAreaHeight = clickableArea.offsetHeight;

  // Update each money sign with improved physics
  for (let i = activeMoneyPhysics.length - 1; i >= 0; i--) {
    const physics = activeMoneyPhysics[i];
    if (!physics.active) continue;

    // Store previous position for continuous collision detection
    const prevX = physics.x;
    const prevY = physics.y;

    // Apply gravity
    physics.vy += gravity;

    // Apply friction
    physics.vx *= frictionFactor;

    // Update position
    physics.x += physics.vx;
    physics.y += physics.vy;

    // Get element rect for collision detection
    const moneyRect = physics.element.getBoundingClientRect();

    // Calculate velocity magnitude - used to identify fast-moving objects
    const velocityMagnitude = Math.sqrt(
      physics.vx * physics.vx + physics.vy * physics.vy
    );

    // Check collision with each bumper - using continuous collision detection for fast objects
    let collisionDetected = false;

    // Query all bumpers that are actually in the game (not stored in slots)
    const activeBumpers = document.querySelectorAll(".game-area .bumper");

    activeBumpers.forEach((bumper) => {
      const bumperRect = bumper.getBoundingClientRect();
      const bumperEffect = bumper.dataset.effect;

      // Skip if we recently collided with this bumper
      if (physics.collisions.has(bumperEffect)) return;

      // Calculate centers and radii for both objects
      const bumperCenterX = (bumperRect.left + bumperRect.right) / 2;
      const bumperCenterY = (bumperRect.top + bumperRect.bottom) / 2;
      const bumperRadius = bumperRect.width / 2; // Assuming bumpers are circular

      const moneyCenterX = (moneyRect.left + moneyRect.right) / 2;
      const moneyCenterY = (moneyRect.top + moneyRect.bottom) / 2;
      const moneyRadius = moneyRect.width / 2; // Assuming money signs are roughly circular

      // Detect collision between circles
      const dx = moneyCenterX - bumperCenterX;
      const dy = moneyCenterY - bumperCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const combinedRadii = bumperRadius + moneyRadius;

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
          const toPrevX = bumperCenterX - prevCenterX;
          const toPrevY = bumperCenterY - prevCenterY;

          // Project this vector onto movement direction
          const dot = (toPrevX * moveX + toPrevY * moveY) / moveLength;

          // Clamp to get closest point on movement line
          const closestT = Math.max(0, Math.min(1, dot / moveLength));

          // Closest point coordinates
          const closestX = prevCenterX + closestT * moveX;
          const closestY = prevCenterY + closestT * moveY;

          // Distance from closest point to bumper center
          const closestDx = closestX - bumperCenterX;
          const closestDy = closestY - bumperCenterY;
          const closestDistance = Math.sqrt(
            closestDx * closestDx + closestDy * closestDy
          );

          // Check if this closest point is within the bumper radius
          collision = closestDistance <= bumperRadius + moneyRadius;
        }
      }

      // Process collision if detected
      if (collision) {
        collisionDetected = true;

        // Apply bumper effect
        applyBumperEffect(bumperEffect);

        // Add visual feedback - flash the bumper
        bumper.style.backgroundColor = "rgba(255, 255, 0, 0.8)"; // Flash yellow
        setTimeout(() => {
          bumper.style.backgroundColor = "rgba(148, 0, 211, 0.8)"; // Back to purple
        }, 100);

        // Calculate collision response
        // Normalize to get direction
        const nx = dx / (distance || 1); // Avoid division by zero
        const ny = dy / (distance || 1);

        // Apply bounce direction
        const speed = Math.sqrt(
          physics.vx * physics.vx + physics.vy * physics.vy
        );
        physics.vx = nx * speed * bounceFactor * 1.2; // Boost bounce speed
        physics.vy = ny * speed * bounceFactor * 1.2;

        // Ensure minimum velocity after bounce
        const minVelocity = 3;
        if (Math.abs(physics.vx) + Math.abs(physics.vy) < minVelocity) {
          physics.vx = nx * minVelocity;
          physics.vy = ny * minVelocity;
        }

        // Prevent multiple collisions with the same bumper
        physics.collisions.add(bumperEffect);
        setTimeout(() => {
          physics.collisions.delete(bumperEffect);
        }, 500);
      }
    });

    // Apply position to DOM element
    physics.element.style.left = `${(physics.x / gameAreaWidth) * 100}%`;
    physics.element.style.top = `${physics.y}px`;

    // Check boundary collisions
    // Left and right bounds
    if (physics.x < 0) {
      physics.x = 0;
      physics.vx = Math.abs(physics.vx) * bounceFactor;
    } else if (physics.x + physics.width > gameAreaWidth) {
      physics.x = gameAreaWidth - physics.width;
      physics.vx = -Math.abs(physics.vx) * bounceFactor;
    }

    // Top bound
    if (physics.y < 0) {
      physics.y = 0;
      physics.vy = Math.abs(physics.vy) * bounceFactor;
    }

    // Bottom bound (spikes)
    if (physics.y + physics.height > gameAreaHeight - 30) {
      // Money is destroyed by spikes
      physics.active = false;
      physics.element.remove();
      activeMoneyPhysics.splice(i, 1);
    }
  }
}, frameTime); // Run at ~60 FPS

// Apply bumper effects
function applyBumperEffect(effect) {
  // For + bumpers
  if (effect.startsWith("+")) {
    // Extract numeric value
    const value = parseFloat(effect.replace("+", ""));
    money += value;
  }
  // Keep other effect types for future compatibility
  else if (effect.includes("x")) {
    // Multiplier effect
    const multiplier = parseFloat(effect.replace("x", ""));
    money *= multiplier;
  } else if (effect.includes("-")) {
    // Subtraction effect
    const value = parseFloat(
      effect.replace("K", "000").replace(/[^-\d.]/g, "")
    );
    money -= value;
  }

  // Ensure money doesn't go below 0
  money = Math.max(0, money);
  updateUI();
}

// -------------------- BUMPER DRAG AND DROP SYSTEM --------------------

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
}

// Create placeholder elements for bumper positions
function createBumperPlaceholders() {
  const clickableArea = document.querySelector(".clickable-area");
  const gameAreaRect = clickableArea.getBoundingClientRect();

  // Create placeholders for each possible bumper position (1-8)
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

    // Make placeholder droppable
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

    clickableArea.appendChild(placeholder);
  }
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
    const placeholder = document.querySelector(
      `.bumper-placeholder[data-position="${position}"]`
    );
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
      const placeholder = document.querySelector(
        `.bumper-placeholder[data-position="${position}"]`
      );
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

  upgradeSlots.forEach((slot) => {
    // Make each slot a drop target
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

      // Handle dropping a bumper on an upgrade slot
      if (draggedBumper && !slot.hasChildNodes()) {
        handleBumperStoreDrop(slot);
      }
    });

    // Make stored bumpers draggable back to the game area
    slot.addEventListener("dragstart", (event) => {
      if (
        slot.firstChild &&
        slot.firstChild.classList.contains("stored-bumper")
      ) {
        draggedBumper = slot.firstChild;
        event.dataTransfer.setData("text/plain", "stored-bumper");
      }
    });
  });
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
}

// Update the handleBumperDrop function to properly clear draggedBumper
function handleBumperDrop(placeholder) {
  if (!draggedBumper) return;

  const position = placeholder.dataset.position;

  // If dropping a stored bumper from upgrade slot
  if (draggedBumper.classList.contains("stored-bumper")) {
    // Create a new game bumper
    const newBumper = document.createElement("div");
    newBumper.classList.add("bumper", `bumper-${position}`);
    newBumper.dataset.effect = draggedBumper.dataset.effect;
    newBumper.textContent = draggedBumper.textContent;

    // Apply the EXACT position and transform from the placeholder's stored data
    newBumper.style.top = placeholder.dataset.top || placeholder.style.top;
    newBumper.style.left = placeholder.dataset.left || placeholder.style.left;
    newBumper.style.bottom = placeholder.dataset.bottom || "";
    newBumper.style.right = placeholder.dataset.right || "";
    newBumper.style.transform = placeholder.dataset.transform || "";

    // Add to game area
    document.querySelector(".clickable-area").appendChild(newBumper);

    // Remove from upgrade slot
    draggedBumper.parentNode.removeChild(draggedBumper);

    // Hide placeholder
    placeholder.style.display = "none";

    // Make the new bumper draggable
    makeBumperDraggable(newBumper);

    activeGameBumpers++;

    // Clear the draggedBumper reference since we've handled it
    draggedBumper = null;
  }
  // If moving a bumper from another position
  else if (draggedBumper.classList.contains("bumper")) {
    // Get original position
    const originalPosition = getBumperPosition(draggedBumper);

    // Update the bumper's class to the new position
    draggedBumper.className = draggedBumper.className.replace(
      `bumper-${originalPosition}`,
      `bumper-${position}`
    );

    // Apply the EXACT position and transform from the placeholder's stored data
    draggedBumper.style.top = placeholder.dataset.top || placeholder.style.top;
    draggedBumper.style.left =
      placeholder.dataset.left || placeholder.style.left;
    draggedBumper.style.bottom = placeholder.dataset.bottom || "";
    draggedBumper.style.right = placeholder.dataset.right || "";
    draggedBumper.style.transform = placeholder.dataset.transform || "";

    // Hide the new placeholder, show the old one
    placeholder.style.display = "none";
    const originalPlaceholder = document.querySelector(
      `.bumper-placeholder[data-position="${originalPosition}"]`
    );
    if (originalPlaceholder) {
      originalPlaceholder.style.display = "flex";
    }

    // Clear the draggedBumper reference since we've handled it
    draggedBumper = null;
  }

  // Update game mechanics
  updateBumperGameEffects();
}

// Update game mechanics based on number of active bumpers
function updateBumperGameEffects() {
  // Update bumper multiplier based on active bumpers
  // More bumpers = higher multiplier
  const baseBumperValue = 0.1;
  bumperMultiplier = 1 + activeGameBumpers * baseBumperValue;

  // Update UI
  updateUI();
}

// Initialize after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  fetch("/load-game")
    .then((response) => response.json())
    .then((gameState) => {
      // Update game variables with the loaded state
      money = gameState.money;
      baseIncomeLevel = gameState.baseIncome.level;
      baseIncomeValue = gameState.baseIncome.value;
      baseIncomeUpgradeCost = gameState.baseIncome.upgradeCost;
      speedLevel = gameState.speed.level;
      speedValue = gameState.speed.value;
      speedUpgradeCost = gameState.speed.upgradeCost;
      bumperLevel = gameState.bumper.level;
      bumperValue = gameState.bumper.value;
      bumperMultiplier = gameState.bumper.multiplier;
      bumperUpgradeCost = gameState.bumper.upgradeCost;

      // Update the UI
      updateUI();
    })
    .catch((error) => {
      console.error("Error loading game state:", error);
    });

  // Set initial values
  updateUI();

  // Initialize money spawn interval
  updateMoneySpawnRate();

  // Initialize the bumper drag and drop system
  initBumperSystem();
});

function updateGameState() {
  gameState.money = money;
  gameState.baseIncomeLevel = baseIncomeLevel;
  gameState.baseIncomeValue = baseIncomeValue;
  gameState.baseIncomeUpgradeCost = baseIncomeUpgradeCost;
  gameState.speedLevel = speedLevel;
  gameState.speedValue = speedValue;
  gameState.speedUpgradeCost = speedUpgradeCost;
  gameState.bumperLevel = bumperLevel;
  gameState.bumperValue = bumperValue;
  gameState.bumperUpgradeCost = bumperUpgradeCost;
  gameState.bumperMultiplier = bumperMultiplier;
}

// Auto-save the game state every 60 seconds
setInterval(() => {
  fetch("/save-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(gameState),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to save game state.");
      }
      console.log("Game state saved successfully!");
    })
    .catch((error) => {
      console.error("Error saving game state:", error);
    });
}, 60000); // Save every 60 seconds
