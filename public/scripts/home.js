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
let speedLevel = 1; // Start at level 1
let speedValue = 1; // Start at $1
let speedUpgradeCost = 10; // Initial upgrade cost

// Bumper stats
let bumperValue = 1; // Start at $1
let bumperUpgradeCost = 10; // Initial upgrade cost
// In home.js, update the initialization to use server values:
let bumperLevel = 1;
let bumperMultiplier = 1;

// New global variables for bumper management
let activeGameBumpers = 8; // Track how many bumpers are active in the game area
const MAX_GAME_BUMPERS = 8; // Maximum number of bumpers in the game area
let draggedBumper = null; // Track which bumper is being dragged

// Matter.js variables
let engine, render, world, runner;
const moneyBodies = new Map(); // Map DOM elements to Matter.js bodies
const bumperBodies = new Map(); // Map bumper elements to Matter.js bodies
const walls = []; // Store wall bodies

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

    // Increase the cost for the next upgrade
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

// Initialize Matter.js physics engine
function initializePhysics() {
  // Create engine and world
  engine = Matter.Engine.create({
    enableSleeping: false,
    gravity: { x: 0, y: 0.5 }, // Customize gravity to match your previous physics
  });
  world = engine.world;

  // Set up the game area bounds
  const gameAreaRect = clickableArea.getBoundingClientRect();
  const gameAreaWidth = gameAreaRect.width;
  const gameAreaHeight = gameAreaRect.height;

  // Add walls (invisible) to contain the money signs
  const wallOptions = {
    isStatic: true,
    restitution: 0.7, // Make walls bouncy
    friction: 0.1,
    label: "wall",
  };

  // Left wall
  walls.push(
    Matter.Bodies.rectangle(
      0,
      gameAreaHeight / 2,
      10,
      gameAreaHeight,
      wallOptions
    )
  );

  // Right wall
  walls.push(
    Matter.Bodies.rectangle(
      gameAreaWidth,
      gameAreaHeight / 2,
      10,
      gameAreaHeight,
      wallOptions
    )
  );

  // Top wall
  walls.push(
    Matter.Bodies.rectangle(
      gameAreaWidth / 2,
      0,
      gameAreaWidth,
      10,
      wallOptions
    )
  );

  // Bottom "spikes" area - special sensor that triggers money collection
  const bottomSensor = Matter.Bodies.rectangle(
    gameAreaWidth / 2,
    gameAreaHeight - 15,
    gameAreaWidth,
    30,
    {
      isStatic: true,
      isSensor: true, // This makes it a sensor that detects collisions without providing physics response
      label: "spike",
    }
  );

  walls.push(bottomSensor);

  // Add all walls to the world
  Matter.Composite.add(world, walls);

  // Create bumper bodies
  createBumperBodies();

  // Set up collision handler for bumpers
  Matter.Events.on(engine, "collisionStart", handleCollisions);

  // Create runner to step the engine
  runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  // Update DOM elements based on physics engine positions
  setInterval(updatePhysicsPositions, 1000 / 60);
}

// Create Matter.js bodies for bumpers
function createBumperBodies() {
  // Get all bumpers in the game area
  const gameBumpers = document.querySelectorAll(".game-area .bumper");

  gameBumpers.forEach((bumper) => {
    const rect = bumper.getBoundingClientRect();
    const gameAreaRect = clickableArea.getBoundingClientRect();

    // Calculate relative position within game area
    const x = rect.left - gameAreaRect.left + rect.width / 2;
    const y = rect.top - gameAreaRect.top + rect.height / 2;

    // Create circular bumper body
    const radius = rect.width / 2;
    const bumperBody = Matter.Bodies.circle(x, y, radius, {
      isStatic: true,
      restitution: 1.2, // Make bumpers very bouncy
      friction: 0,
      label: "bumper",
      bumperElement: bumper, // Store reference to the DOM element
      render: {
        visible: false, // Don't render in Matter.js renderer if you're using one
      },
    });

    // Store the body in our map
    bumperBodies.set(bumper, bumperBody);

    // Add body to the world
    Matter.Composite.add(world, bumperBody);
  });
}

// Handle collisions between money signs and bumpers/walls
function handleCollisions(event) {
  const pairs = event.pairs;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];

    // Check if one is a money sign and one is a bumper
    let moneyBody, otherBody;

    if (pair.bodyA.label === "money") {
      moneyBody = pair.bodyA;
      otherBody = pair.bodyB;
    } else if (pair.bodyB.label === "money") {
      moneyBody = pair.bodyB;
      otherBody = pair.bodyA;
    } else {
      continue; // Skip if neither is a money body
    }

    // Get the DOM element associated with this body
    const moneyElement = moneyBody.moneyElement;
    const physicsObject = moneyBody.physicsObject;

    // Handle collision with bumper
    if (otherBody.label === "bumper") {
      // Only process if we haven't recently collided with this bumper
      const bumperElement = otherBody.bumperElement;
      const bumperEffect = bumperElement.dataset.effect;

      if (!physicsObject.collisions.has(bumperEffect)) {
        // Extract bumper effect value and add to money sign
        const effectValue = parseFloat(bumperEffect.replace("+", ""));
        physicsObject.value += effectValue;
        physicsObject.hitCount++;

        // Update the money sign display with new value
        moneyElement.textContent = formatCurrency(physicsObject.value);

        // Change color based on hit count
        const intensity = Math.min(
          255,
          Math.floor(50 + physicsObject.hitCount * 15)
        );
        moneyElement.style.color = `rgb(${intensity}, 255, ${intensity})`;

        // Add visual feedback - flash the bumper
        bumperElement.style.backgroundColor = "rgba(255, 255, 0, 0.8)"; // Flash yellow
        setTimeout(() => {
          bumperElement.style.backgroundColor = "rgba(148, 0, 211, 0.8)"; // Back to purple
        }, 100);

        // Apply an extra impulse for more exciting physics
        const force = 0.005 * (physicsObject.hitCount + 1);
        const angle = Math.atan2(
          moneyBody.position.y - otherBody.position.y,
          moneyBody.position.x - otherBody.position.x
        );

        Matter.Body.applyForce(moneyBody, moneyBody.position, {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force,
        });

        // Prevent multiple collisions with the same bumper for a short time
        physicsObject.collisions.add(bumperEffect);
        setTimeout(() => {
          physicsObject.collisions.delete(bumperEffect);
        }, 500);
      }
    }
    // Handle collision with spike (bottom sensor)
    else if (otherBody.label === "spike") {
      // Add the money sign's value to the total
      money += physicsObject.value;
      updateUI();

      // Show a floating text with the earned amount
      const gameAreaRect = clickableArea.getBoundingClientRect();
      const earnText = document.createElement("span");
      earnText.textContent = `+${formatCurrency(physicsObject.value)}`;
      earnText.style.position = "absolute";
      earnText.style.left = `${
        (moneyBody.position.x / gameAreaRect.width) * 100
      }%`;
      earnText.style.top = `${gameAreaRect.height - 40}px`;
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

      // Remove the money sign
      moneyElement.remove();
      Matter.Composite.remove(world, moneyBody);
      moneyBodies.delete(moneyElement);
    }
  }
}

// Function to update DOM elements based on Matter.js body positions
function updatePhysicsPositions() {
  moneyBodies.forEach((body, element) => {
    const gameAreaRect = clickableArea.getBoundingClientRect();

    // Update DOM position based on physics position
    element.style.left = `${(body.position.x / gameAreaRect.width) * 100}%`;
    element.style.top = `${body.position.y}px`;

    // Optional: apply rotation if desired
    // element.style.transform = `rotate(${body.angle * (180 / Math.PI)}deg)`;
  });
}

// Function to create a money sign with Matter.js physics
function createMoneySign() {
  // Create the DOM element
  const moneySign = document.createElement("span");
  moneySign.classList.add("money-sign");
  moneySign.textContent = `$${baseIncomeValue}`;

  // Add it to the DOM
  moneySignsContainer.appendChild(moneySign);

  // Get the position for the physics body
  const gameAreaRect = clickableArea.getBoundingClientRect();
  const xPercent = 50 + (Math.random() * 10 - 5); // Center with a little randomness (±5%)
  const x = (xPercent / 100) * gameAreaRect.width;

  // Create physics object to track money sign properties
  const physics = {
    value: baseIncomeValue,
    collisions: new Set(), // Track which bumpers we've collided with recently
    hitCount: 0, // Track how many bumpers have been hit
  };

  // Wait for the DOM element to be rendered to get its size
  requestAnimationFrame(() => {
    const rect = moneySign.getBoundingClientRect();

    // Create a circular body for the money sign
    const radius = Math.max(rect.width, rect.height) / 2;
    const body = Matter.Bodies.circle(x, 10, radius, {
      restitution: 0.7, // Bounce factor
      friction: 0.05, // Low friction
      frictionAir: 0.001, // Low air resistance
      label: "money",
      moneyElement: moneySign, // Store reference to DOM element
      physicsObject: physics, // Store reference to our physics tracking object
    });

    // Add a small initial random velocity
    Matter.Body.setVelocity(body, {
      x: (Math.random() * 2 - 1) * 2,
      y: 2,
    });

    // Store the body in our map
    moneyBodies.set(moneySign, body);

    // Add the body to the world
    Matter.Composite.add(world, body);
  });

  return physics;
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
    createMoneySign();
  }, spawnTime);
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

      // Remove the physics body for this bumper while dragging
      const body = bumperBodies.get(bumper);
      if (body) {
        Matter.Composite.remove(world, body);
        bumperBodies.delete(bumper);
      }
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

      // Recreate physics body for this bumper
      const rect = bumper.getBoundingClientRect();
      const gameAreaRect = clickableArea.getBoundingClientRect();

      // Calculate relative position within game area
      const x = rect.left - gameAreaRect.left + rect.width / 2;
      const y = rect.top - gameAreaRect.top + rect.height / 2;

      // Create circular bumper body
      const radius = rect.width / 2;
      const bumperBody = Matter.Bodies.circle(x, y, radius, {
        isStatic: true,
        restitution: 1.2,
        friction: 0,
        label: "bumper",
        bumperElement: bumper,
      });

      // Store the body in our map
      bumperBodies.set(bumper, bumperBody);

      // Add body to the world
      Matter.Composite.add(world, bumperBody);

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

// Auto-save game state every 30 seconds
setInterval(() => {
  updateGameState();

  // Send game state to server
  fetch("/save-game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      money: money,
      baseIncome: {
        level: baseIncomeLevel,
        value: baseIncomeValue,
        upgradeCost: baseIncomeUpgradeCost,
      },
      speed: {
        level: speedLevel,
        value: speedValue,
        upgradeCost: speedUpgradeCost,
      },
      bumper: {
        level: bumperLevel,
        value: bumperValue,
        multiplier: bumperMultiplier,
        upgradeCost: bumperUpgradeCost,
      },
    }),
  })
    .then((response) => {
      if (response.ok) {
        console.log("Game saved successfully");
      }
    })
    .catch((error) => {
      console.error("Error saving game:", error);
    });
}, 30000); // Save every 30 seconds

const resetGameButton = document.getElementById("reset-game");

resetGameButton.addEventListener("click", () => {
  if (
    confirm("Are you sure you want to reset your game? This cannot be undone.")
  ) {
    fetch("/reset-game", {
      method: "POST",
    })
      .then((response) => {
        if (response.ok) {
          alert("Game has been reset!");
          location.reload(); // Reload the page to apply the reset state
        } else {
          alert("Failed to reset the game. Please try again.");
        }
      })
      .catch((error) => {
        console.error("Error resetting game:", error);
        alert("An error occurred while resetting the game.");
      });
  }
});
