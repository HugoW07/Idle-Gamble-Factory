const express = require("express");
const app = express();
const path = require("path");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

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

app.listen(3000, () => {
});
