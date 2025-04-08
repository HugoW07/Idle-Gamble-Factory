// Select DOM elements
const scoreDisplay = document.querySelector(".score-display span");
const clickableArea = document.querySelector(".clickable-area");
const moneySignsContainer = document.getElementById("money-signs");
const bumpers = document.querySelectorAll(".bumper");
const upgradeBumperButton = document.getElementById("upgrade-bumper");
const baseIncomeValue = parseFloat(
  document
    .querySelector(".base-income span:nth-child(3)")
    .textContent.replace("$", "")
);

// Initialize game state
let money = parseFloat(scoreDisplay.textContent) || 0; // Current money
let incomePerClick = 1; // Money earned per click
let incomePerSecond = 0; // Money earned per second
let bumperLevel = 1; // Bumper level
let bumperMultiplier = 1; // Initial bumper multiplier

// Bumper upgrade cost
const bumperUpgradeCost = 100;

// Function to update the UI
function updateUI() {
  scoreDisplay.textContent = `$${money.toFixed(2)}`;
}

// Clickable area: Earn money on click
clickableArea.addEventListener("click", () => {
  money += incomePerClick * bumperMultiplier;
  updateUI();
});

// Unlock buttons: Handle upgrades
document.querySelectorAll(".unlock-button").forEach((button) => {
  button.addEventListener("click", () => {
    const cost = parseFloat(button.getAttribute("data-cost"));
    if (money >= cost) {
      money -= cost; // Deduct cost from money
      incomePerSecond += cost / 100; // Increase income per second
      button.disabled = true; // Disable the button after purchase
      button.style.backgroundColor = "#808080"; // Gray out the button
      updateUI();
    } else {
      alert("Not enough money!");
    }
  });
});

// Bumper upgrade logic
upgradeBumperButton.addEventListener("click", () => {
  if (money >= bumperUpgradeCost) {
    money -= bumperUpgradeCost;
    bumperLevel++;
    bumperMultiplier *= 1.5; // Increase multiplier by 50% per upgrade
    updateUI();
  } else {
    alert("Not enough money!");
  }
});

// Automatically increase money based on income per second
setInterval(() => {
  money += incomePerSecond;
  updateUI();
}, 1000);

// Simulate money signs dropping
setInterval(() => {
  // Use base income value for money signs
  let moneyValue = baseIncomeValue;

  const moneySign = document.createElement("span");
  moneySign.classList.add("money-sign");
  moneySign.textContent = `$${moneyValue}`;

  // Position the money sign in the center with a little randomness (±5%)
  moneySign.style.left = `${50 + (Math.random() * 10 - 5)}%`;
  moneySign.style.transform = "translateX(-50%)";
  moneySign.style.top = "0"; // Start at the top of the game area
  moneySignsContainer.appendChild(moneySign);

  // Initial velocity
  let velocityY = 5; // Vertical speed
  let velocityX = Math.random() * 2 - 1; // Small random horizontal movement (-1 to +1)

  // Physics properties
  const gravity = 0.2;
  const bounceFactor = 0.8;

  const interval = setInterval(() => {
    const currentTop = parseFloat(moneySign.style.top) || 0;
    const currentLeft = parseFloat(moneySign.style.left) || 50;

    // Apply gravity
    velocityY += gravity;

    // Move the money sign
    moneySign.style.top = `${currentTop + velocityY}px`;
    moneySign.style.left = `${currentLeft + velocityX}%`;

    // Check for collisions with bumpers
    const moneySignRect = moneySign.getBoundingClientRect();

    // Check collision with each bumper
    let collided = false;
    bumpers.forEach((bumper) => {
      const bumperRect = bumper.getBoundingClientRect();

      if (
        moneySignRect.left < bumperRect.right &&
        moneySignRect.right > bumperRect.left &&
        moneySignRect.top < bumperRect.bottom &&
        moneySignRect.bottom > bumperRect.top &&
        !moneySign.hasAttribute("collided-with-" + bumper.dataset.effect)
      ) {
        // Apply bumper effect
        const effect = bumper.getAttribute("data-effect");
        applyBumperEffect(effect);

        // Set temporary flag to prevent multiple collisions with the same bumper
        moneySign.setAttribute(
          "collided-with-" + bumper.dataset.effect,
          "true"
        );
        setTimeout(() => {
          moneySign.removeAttribute("collided-with-" + bumper.dataset.effect);
        }, 500);

        // Bounce off the bumper
        velocityY = -velocityY * bounceFactor;
        velocityX = Math.random() * 10 - 5; // Add some randomness to horizontal direction

        collided = true;
      }
    });

    // Check for collision with the bottom (spikes)
    if (currentTop > clickableArea.offsetHeight - 50) {
      // Money is destroyed by spikes - remove it
      clearInterval(interval);
      moneySign.remove();
    }

    // Check for collision with the walls
    const gameAreaWidth = clickableArea.offsetWidth;
    const moneySignWidth = moneySignRect.width;

    // Left and right bounds check
    if (moneySignRect.left < 0) {
      velocityX = Math.abs(velocityX) * bounceFactor; // Bounce right
    } else if (moneySignRect.right > gameAreaWidth) {
      velocityX = -Math.abs(velocityX) * bounceFactor; // Bounce left
    }

    // Top bounds check
    if (currentTop < 0) {
      velocityY = Math.abs(velocityY) * bounceFactor; // Bounce down
    }
  }, 30); // Run at 30ms for smoother animation
}, 3000); // Drop a new money sign every 3 seconds

// Apply bumper effects
function applyBumperEffect(effect) {
  if (effect.includes("x")) {
    // Multiplier effect
    const multiplier = parseFloat(effect.replace("x", ""));
    money *= multiplier;
  } else {
    // Addition/subtraction effect
    const value = parseFloat(
      effect.replace("K", "000").replace(/[^-\d.]/g, "")
    );
    if (effect.includes("-")) {
      money -= value;
    } else {
      money += value;
    }
  }

  // Ensure money doesn't go below 0
  money = Math.max(0, money);
  updateUI();
}

// Initial UI update
updateUI();
