const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

// Set EJS as the view engine
app.set("view engine", "ejs");

// Example route to render the home page
app.get("/", (req, res) => {
  const data = {
    money: { user: 1000 },
    income: { current: 13.8, perSecond: 0.7 },
    upgrades: { bumper: { cost: 7 } },
    baseIncome: { level: 1, nextLevel: 2, value: 50 },
    speed: { level: 100, nextLevel: 105, value: 250 },
    nextLevelCost: 250000,
    bumper: { level: 1, multiplier: 1 },
  };
  res.render("home", data);
});

// Save game state to a JSON file
app.post("/save-game", (req, res) => {
  const gameState = req.body;

  fs.writeFile("game-save.json", JSON.stringify(gameState, null, 2), (err) => {
    if (err) {
      console.error("Error saving game state:", err);
      res.status(500).send("Failed to save game state.");
    } else {
      console.log("Game state saved successfully!");
      res.status(200).send("Game state saved!");
    }
  });
});

// Load game state from a JSON file
app.get("/load-game", (req, res) => {
  fs.readFile("game-save.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error loading game state:", err);
      res.status(500).send("Failed to load game state.");
    } else {
      const gameState = JSON.parse(data);
      res.status(200).json(gameState);
    }
  });
});

// Reset game state to default values
app.post("/reset-game", (req, res) => {
  const defaultGameState = {
    money: 10, // Start with enough money to buy one bumper
    baseIncome: {
      level: 1,
      value: 1,
      upgradeCost: 10,
    },
    speed: {
      level: 1,
      value: 1,
      upgradeCost: 10,
    },
    bumper: {
      level: 0,
      count: 0, // Start with 0 bumpers
      value: 1, // Value for each new bumper
      multiplier: 1,
      upgradeCost: 10,
    },
  };

  fs.writeFile(
    "game-save.json",
    JSON.stringify(defaultGameState, null, 2),
    (err) => {
      if (err) {
        console.error("Error resetting game state:", err);
        res.status(500).send("Failed to reset game state.");
      } else {
        console.log("Game state reset successfully!");
        res.status(200).send("Game state reset!");
      }
    }
  );
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
