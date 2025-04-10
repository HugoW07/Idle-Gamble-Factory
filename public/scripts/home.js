// Select DOM elements
const scoreDisplay = document.querySelector(".score-display span");
const clickableArea = document.querySelector(".clickable-area");
const moneySignsContainer = document.getElementById("money-signs");
const upgradeBumperButton = document.getElementById("upgrade-bumper");
const upgradeSlots = document.querySelectorAll(".upgrade-slot");

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
let speedLevel = 1; // Start at level 1
let speedValue = 1; // Start at $1
let speedUpgradeCost = 10; // Initial upgrade cost

// Bumper stats
let bumperValue = 1; // Start at $1
let bumperUpgradeCost = 10; // Initial upgrade cost
let bumperLevel = 0; // Start with no bumpers
let bumperCount = 0; // Track how many bumpers we have
let bumperMultiplier = 1;

// New global variables for bumper management
let activeGameBumpers = 0; // Track how many bumpers are active in the game area
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
  bumperCount: bumperCount,
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

// Function to update the UI
function updateUI() {
  // Update money display
  scoreDisplay.textContent = formatCurrency(money);

  // Update base income display
  baseIncomeElement.textContent = `$${baseIncomeValue}`;
  baseIncomeLevelElement.textContent = `${baseIncomeLevel} > ${
    baseIncomeLevel + 1
  }`;
  baseIncomeUpgradeCostElement.textContent = `$${baseIncomeUpgradeCost}`;

  // Update speed display
  const baseSpawnTime = 3000; // Base spawn time in milliseconds (100%)
  const spawnTimePercentage = 100 + (speedLevel - 1) * 5; // Start at 100% and increase by 5% per level
  const currentSpawnTime = baseSpawnTime / (spawnTimePercentage / 100) / 1000; // Convert to seconds
  speedElement.textContent = `${spawnTimePercentage}%`; // Show current spawn speed percentage
  speedLevelElement.textContent = `${spawnTimePercentage}% > ${
    spawnTimePercentage + 5
  }%`; // Show progression to the next level
  speedUpgradeCostElement.textContent = `$${speedUpgradeCost}`;

  // Display spawn time in seconds
  const spawnReductionElement = document.querySelector(
    ".income-per-second span"
  );
  spawnReductionElement.textContent = `Spawn Time: ${currentSpawnTime.toFixed(
    1
  )}s`;

  // Update bumper display
  bumperLevelElement.textContent = `Level: ${bumperLevel} (${bumperCount} bumpers)`;
  bumperCostElement.textContent = `Cost: $${bumperUpgradeCost}`;

  // Update bumper effect text on the game area
  const gameBumpers = document.querySelectorAll(".game-area .bumper");
  gameBumpers.forEach((bumper) => {
    const level = parseInt(bumper.dataset.level) || 1;
    const value = level * bumperValue;
    bumper.dataset.effect = `+${value}`;
    bumper.textContent = `+${value}`;
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

    // Increase the cost for the next upgrade
    speedUpgradeCost = Math.round(speedUpgradeCost * 1.2);

    // Update spawn rate for money signs based on speed
    updateMoneySpawnRate();

    updateUI();
  } else {
    alert("Not enough money for speed upgrade!");
  }
});

// Bumper upgrade logic - now creates a new bumper instead of upgrading existing ones
upgradeBumperButton.addEventListener("click", () => {
  if (money >= bumperUpgradeCost) {
    money -= bumperUpgradeCost;
    bumperLevel++;
    bumperCount++;

    // Increase the cost for next bumper
    bumperUpgradeCost = Math.round(bumperUpgradeCost * 1.2);

    // Create a new bumper in the first available slot
    createNewBumper();

    updateUI();
  } else {
    alert("Not enough money for bumper upgrade!");
  }
});

// Function to create a new bumper in an upgrade slot
function createNewBumper() {
  // Find the first empty upgrade slot
  let emptySlot = null;
  for (const slot of upgradeSlots) {
    if (!slot.hasChildNodes()) {
      emptySlot = slot;
      break;
    }
  }

  if (!emptySlot) {
    alert("No empty upgrade slots available! Combine bumpers to make space.");
    return;
  }

  // Create a new stored bumper element
  const storedBumper = document.createElement("div");
  storedBumper.classList.add("stored-bumper");
  storedBumper.setAttribute("draggable", true);
  storedBumper.dataset.level = "1"; // Level 1 bumper
  storedBumper.dataset.effect = `+${bumperValue}`;
  storedBumper.textContent = `+${bumperValue}`;

  // Add to upgrade slot
  emptySlot.appendChild(storedBumper);

  // Make the stored bumper draggable
  storedBumper.addEventListener("dragstart", (event) => {
    draggedBumper = storedBumper;
    event.dataTransfer.setData("text/plain", "stored-bumper");
  });

  storedBumper.addEventListener("dragend", () => {
    draggedBumper = null;
  });

  // Add double-click to combine with another bumper
  storedBumper.addEventListener("dblclick", (event) => {
    tryToCombineBumpers(storedBumper);
  });
}

// Function to attempt to combine bumpers
function tryToCombineBumpers(sourceBumper) {
  // Find another bumper of the same level
  const sourceLevel = parseInt(sourceBumper.dataset.level) || 1;
  
  // Find another bumper with the same level
  let targetBumper = null;
  upgradeSlots.forEach(slot => {
    const slotBumper = slot.firstChild;
    if (slotBumper && 
        slotBumper !== sourceBumper && 
        parseInt(slotBumper.dataset.level) === sourceLevel) {
      targetBumper = slotBumper;
      return; // Exit the forEach early
    }
  });

  if (!targetBumper) {
    alert("No matching bumper found to combine with. You need two bumpers of the same level.");
    return;
  }

  // Create a new higher level bumper
  const newLevel = sourceLevel + 1;
  const newValue = newLevel * bumperValue;
  
  // Remove the source bumper
  sourceBumper.parentNode.removeChild(sourceBumper);
  
  // Replace the target bumper with the upgraded one
  const upgradeSlot = targetBumper.parentNode;
  upgradeSlot.removeChild(targetBumper);
  
  // Create the new higher level bumper
  const upgradedBumper = document.createElement("div");
  upgradedBumper.classList.add("stored-bumper");
  upgradedBumper.setAttribute("draggable", true);
  upgradedBumper.dataset.level = newLevel.toString();
  upgradedBumper.dataset.effect = `+${newValue}`;
  upgradedBumper.textContent = `+${newValue}`;
  
  // Add visual indicator of level
  upgradedBumper.style.backgroundColor = getBumperColor(newLevel);
  upgradedBumper.style.border = `3px solid ${getBumperBorderColor(newLevel)}`;
  
  // Add to upgrade slot
  upgradeSlot.appendChild(upgradedBumper);
  
  // Make the upgraded bumper draggable
  upgradedBumper.addEventListener("dragstart", (event) => {
    draggedBumper = upgradedBumper;
    event.dataTransfer.setData("text/plain", "stored-bumper");
  });
  
  upgradedBumper.addEventListener("dragend", () => {
    draggedBumper = null;
  });
  
  // Add double-click to combine with another bumper of the same level
  upgradedBumper.addEventListener("dblclick", (event) => {
    tryToCombineBumpers(upgradedBumper);
  });
  
  // Show success message
  const message = document.createElement("div");
  message.className = "combination-message";
  message.textContent = `Level ${sourceLevel} + Level ${sourceLevel} = Level ${newLevel}!`;
  message.style.position = "absolute";
  message.style.top = "50%";
  message.style.left = "50%";
  message.style.transform = "translate(-50%, -50%)";
  message.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  message.style.color = "#ffd700";
  message.style.padding = "10px 20px";
  message.style.borderRadius = "5px";
  message.style.zIndex = "100";
  document.querySelector(".game-container").appendChild(message);
  
  // Remove the message after a short delay
  setTimeout(() => {
    message.remove();
  }, 2000);
}

// Function to get a color based on bumper level
function getBumperColor(level) {
  // Color progression based on bumper level
  const colors = [
    "rgba(148, 0, 211, 0.8)", // Level 1: Purple
    "rgba(0, 0, 255, 0.8)",   // Level 2: Blue
    "rgba(0, 128, 0, 0.8)",   // Level 3: Green
    "rgba(255, 165, 0, 0.8)", // Level 4: Orange
    "rgba(255, 0, 0, 0.8)",   // Level 5: Red
    "rgba(255, 0, 255, 0.8)", // Level 6: Magenta
    "rgba(0, 255, 255, 0.8)", // Level 7: Cyan
    "rgba(255, 215, 0, 0.8)"  // Level 8+: Gold
  ];
  
  return level <= colors.length ? colors[level - 1] : colors[colors.length - 1];
}

// Function to get a border color based on bumper level
function getBumperBorderColor(level) {
  // Border color progression based on bumper level
  const borderColors = [
    "rgba(255, 215, 0, 0.8)",  // Level 1: Gold
    "rgba(255, 255, 255, 0.8)", // Level 2: White
    "rgba(0, 255, 0, 0.8)",     // Level 3: Bright Green
    "rgba(255, 255, 0, 0.8)",   // Level 4: Yellow
    "rgba(255, 0, 0, 0.8)",     // Level 5: Red
    "rgba(255, 0, 255, 0.8)",   // Level 6: Magenta
    "rgba(0, 255, 255, 0.8)",   // Level 7: Cyan
    "rgba(255, 255, 255, 0.9)"  // Level 8+: Bright White
  ];
  
  return level <= borderColors.length ? borderColors[level - 1] : borderColors[borderColors.length - 1];
}

// Function to update money spawn rate based on speed
function updateMoneySpawnRate() {
  // Clear existing interval
  if (window.moneySpawnInterval) {
    clearInterval(window.moneySpawnInterval);
  }

  // Calculate spawn rate based on speed upgrades
  const baseSpawnTime = 3000; // Base spawn time in milliseconds (100%)
  const spawnTimePercentage = 100 + (speedLevel - 1) * 5; // Start at 100% and increase by 5% per level
  const spawnTime = Math.round(baseSpawnTime / (spawnTimePercentage / 100)); // Calculate the current spawn time in milliseconds

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
    hitCount: 0, // New: Track how many bumpers have been hit
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
      const bumperLevel = parseInt(bumper.dataset.level) || 1;

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

        // Extract numeric value from bumper effect
        const effectValue = parseFloat(bumperEffect.replace("+", ""));
        physics.value += effectValue;
        physics.hitCount++;

        // Update the money sign display with new value
        physics.element.textContent = formatCurrency(physics.value);

        // Change the color based on value
        const intensity = Math.min(255, Math.floor(50 + physics.hitCount * 15));
        physics.element.style.color = `rgb(${intensity}, 255, ${intensity})`;

        // Add visual feedback - flash the bumper with color based on level
        const originalColor = bumper.style.backgroundColor;
        bumper.style.backgroundColor = "rgba(255, 255, 0, 0.8)"; // Flash yellow
        setTimeout(() => {
          bumper.style.backgroundColor = originalColor || getBumperColor(bumperLevel);
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
      // Add value to money count
      money += physics.value;
      updateUI();

      // Show a floating text with the earned amount
      const earnText = document.createElement("span");
      earnText.textContent = `+${formatCurrency(physics.value)}`;
      earnText.style.position = "absolute";
      earnText.style.left = `${(physics.x / gameAreaWidth) * 100}%`;
      earnText.style.top = `${gameAreaHeight - 40}px`;
      earnText.style.color = "#00ff00";
      earnText.style.fontSize = "18px";
      earnText.style.fontWeight = "bold";
      earnText.style.zIndex = "100";
      clickableArea.appendChild(earnText);

      // Animate the earned text
      let opacity = 1;
      const animateEarnText = () => {
        opacity -= 0.05;
        earnText.style.opacity = opacity;
        earnText.style.top = `${parseFloat(earnText.style.top) - 1}px`;

        if (opacity > 0) {
          requestAnimationFrame(animateEarnText);
        } else {
          earnText.remove();
        }
      };

      requestAnimationFrame(animateEarnText);

      // Now remove the money sign
      physics.active = false;
      physics.element.remove();
      activeMoneyPhysics.splice(i, 1);
    }
  }
}, frameTime); // Run at ~60 FPS

// -------------------- BUMPER DRAG AND DROP SYSTEM --------------------

// Initialize the bumper system
function initBumperSystem() {
  // Create empty placeholders for each bumper position
  createBumperPlaceholders();

  // Make upgrade slots droppable
  initUpgradeSlots();
}

// Create placeholder elements for bumper positions
function createBumperPlaceholders() {
  const clickableArea = document.querySelector(".clickable-area");
  
  // Define fixed positions for the 8 bumper placeholders
  const placeholderPositions = [
    // First row - 3 bumpers
    { top: '15%', left: '20%', right: '', bottom: '', transform: '' },
    { top: '15%', left: '50%', right: '', bottom: '', transform: 'translateX(-50%)' },
    { top: '15%', left: '', right: '20%', bottom: '', transform: '' },
    
    // Second row - 2 bumpers
    { top: '50%', left: '30%', right: '', bottom: '', transform: 'translateY(-50%)' },
    { top: '50%', left: '', right: '30%', bottom: '', transform: 'translateY(-50%)' },
    
    // Third row - 3 bumpers
    { top: '', left: '20%', right: '', bottom: '15%', transform: '' },
    { top: '', left: '50%', right: '', bottom: '15%', transform: 'translateX(-50%)' },
    { top: '', left: '', right: '20%', bottom: '15%', transform: '' }
  ];
  
  // Create placeholders for each possible bumper position (1-8)
  for (let i = 1; i <= MAX_GAME_BUMPERS; i++) {
    const placeholder = document.createElement("div");
    placeholder.classList.add("bumper-placeholder");
    placeholder.dataset.position = i;
    
    // Get the position data from our predefined array
    const position = placeholderPositions[i-1];
    
    // Store all position data attributes for precise repositioning
    placeholder.dataset.top = position.top;
    placeholder.dataset.left = position.left;
    placeholder.dataset.bottom = position.bottom;
    placeholder.dataset.right = position.right;
    placeholder.dataset.transform = position.transform;
    
    // Apply the positioning
    placeholder.style.top = position.top;
    placeholder.style.left = position.left;
    placeholder.style.bottom = position.bottom;
    placeholder.style.right = position.right;
    placeholder.style.transform = position.transform;
    
    // Always show placeholders initially (game starts with no bumpers)
    placeholder.style.display = "flex";

    // Make placeholder droppable
    placeholder.addEventListener("dragover", (event) => {
      event.preventDefault();
      placeholder.classList.add("dragover");
    });

    placeholder.