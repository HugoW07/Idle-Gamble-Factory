// Select DOM elements
const scoreDisplay = document.querySelector(".score-display span");
const clickableArea = document.querySelector(".clickable-area");
const moneySignsContainer = document.getElementById("money-signs");
const bumper = document.getElementById("bumper");
const upgradeBumperButton = document.getElementById("upgrade-bumper");

// Initialize game state
let money = 0; // Current money
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
  const randomEffect = Math.random() * 100;
  let moneyValue = incomePerClick; // Start with base income

  if (randomEffect < 10) {
    moneyValue = -10000; // 10% chance of losing 10K
  } else if (randomEffect < 20) {
    moneyValue = 10000; // 10% chance of gaining 10K
  } else {
    moneyValue = Math.floor(Math.random() * 100) + 1; // Random value between 1 and 100
  }

  const moneySign = document.createElement("span");
  moneySign.classList.add("money-sign"); // Add a class for styling
  moneySign.textContent = `$${moneyValue}`;
  moneySign.style.left = `${50 + Math.random() * 20}%`; // Center ±10% randomness
  moneySign.style.transform = "translateX(-50%)"; // Precisely center the money sign
  moneySign.style.top = "0"; // Start at the top of the game area
  moneySignsContainer.appendChild(moneySign);

  let velocityY = 5; // Vertical speed
  let velocityX = 0; // Horizontal speed

  const interval = setInterval(() => {
    const currentTop = parseInt(moneySign.style.top) || 0;
    const currentLeft = parseInt(moneySign.style.left) || 0;

    // Move the money sign
    moneySign.style.top = `${currentTop + velocityY}px`;
    moneySign.style.left = `${currentLeft + velocityX}px`;

    // Check for collisions with the bumper
    const bumperRect = bumper.getBoundingClientRect();
    const moneySignRect = moneySign.getBoundingClientRect();

    if (
      moneySignRect.left < bumperRect.right &&
      moneySignRect.right > bumperRect.left &&
      moneySignRect.top < bumperRect.bottom &&
      moneySignRect.bottom > bumperRect.top
    ) {
      const effect = bumper.getAttribute("data-effect");
      applyBumperEffect(effect, moneySign);
      velocityY *= -1; // Bounce off the bumper
    }

    // Remove the money sign when it reaches the bottom
    if (currentTop > clickableArea.offsetHeight) {
      clearInterval(interval);
      moneySign.remove();
    }
  }, 50);
}, 3000); // Drop a new money sign every 3 seconds

// Apply bumper effects
function applyBumperEffect(effect, moneySign) {
  const value = parseFloat(effect.replace(/[^-\d.]/g, "")); // Extract numeric value
  const operator = effect.includes("-") ? "-" : "*";

  if (operator === "-") {
    money += value;
  } else {
    money *= value;
  }

  updateUI();
}

// Initial UI update
updateUI();
