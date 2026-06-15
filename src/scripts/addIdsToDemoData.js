// scripts/addIdsToDemoData.js
const fs = require("fs");
const path = require("path");

const demoDataPath = path.join(__dirname, "../data/websites.json");
const demoData = require(demoDataPath);

// Add _id field if missing
const enhancedData = demoData.map((item, index) => ({
  _id: `demo_${index}_${Math.random().toString(36).substr(2, 9)}`,
  ...item,
}));

// Save back to file
fs.writeFileSync(demoDataPath, JSON.stringify(enhancedData, null, 2));

console.log("Added IDs to demo data");
