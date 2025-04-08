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
let bumperLevel = 1;
let bumperValue = 1; // Start at $1
let bumperUpgradeCost = 10; // Initial upgrade cost
let bumperMultiplier = 1; // Initial bumper multiplier

// Physics settings - optimized for 60 FPS
const FPS = 60;
const frameTime = 1000 / FPS;
const gravity = 0.5;
const bounceFactor = 0.85;
const frictionFactor = 0.99;

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
  bumpers.forEach((bumper) => {
    bumper.dataset.effect = `+${bumperValue}`;
    bumper.textContent = `+${bumperValue}`;
  });
}

// Clickable area: Earn money on click
clickableArea.addEventListener("click", () => {
  money += baseIncomeValue * bumperMultiplier;
  updateUI();
});

// Base Income upgrade logic
upgradeBaseIncomeButton.addEventListener("click", () => {
  if (money >= baseIncomeUpgradeCost) {
    money -= baseIncomeUpgradeCost;
    baseIncomeLevel++;

    // Increase the base income value by 1 each level
    baseIncomeValue += 1;

    // Increase the cost for next upgrade
    baseIncomeUpgradeCost = Math.round(baseIncomeUpgradeCost * 1.2);

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

    // Apply gravity
    physics.vy += gravity;

    // Apply friction
    physics.vx *= frictionFactor;

    // Update position
    physics.x += physics.vx;
    physics.y += physics.vy;

    // Apply position to DOM element
    physics.element.style.left = `${(physics.x / gameAreaWidth) * 100}%`;
    physics.element.style.top = `${physics.y}px`;

    // Get element rect for collision detection
    const moneyRect = physics.element.getBoundingClientRect();

    // Check collision with each bumper
    bumpers.forEach((bumper) => {
      const bumperRect = bumper.getBoundingClientRect();
      const bumperEffect = bumper.dataset.effect;

      // Skip if we recently collided with this bumper
      if (physics.collisions.has(bumperEffect)) return;

      // Check for collision
      if (
        moneyRect.left < bumperRect.right &&
        moneyRect.right > bumperRect.left &&
        moneyRect.top < bumperRect.bottom &&
        moneyRect.bottom > bumperRect.top
      ) {
        // Apply bumper effect
        applyBumperEffect(bumperEffect);

        // Add visual feedback - flash the bumper
        bumper.style.backgroundColor = "rgba(255, 255, 0, 0.8)"; // Flash yellow
        setTimeout(() => {
          bumper.style.backgroundColor = "rgba(148, 0, 211, 0.8)"; // Back to purple
        }, 100);

        // Calculate collision response
        // Determine which side of the bumper was hit
        const dx =
          (moneyRect.left + moneyRect.right) / 2 -
          (bumperRect.left + bumperRect.right) / 2;
        const dy =
          (moneyRect.top + moneyRect.bottom) / 2 -
          (bumperRect.top + bumperRect.bottom) / 2;

        // Normalize to get direction
        const length = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / length;
        const ny = dy / length;

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
    if (physics.y > gameAreaHeight - 50) {
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

// Initialize after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Set initial values
  updateUI();

  // Initialize money spawn interval
  updateMoneySpawnRate();
});
