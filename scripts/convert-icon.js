const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");
const path = require("path");

const svgPath = path.join(__dirname, "../assets/icon.svg");
const outputDir = path.join(__dirname, "../assets");

const sizes = {
  "icon.png": 1024,
  "adaptive-icon.png": 1024,
  "splash-icon.png": 1024,
  "favicon.png": 48,
};

const svg = fs.readFileSync(svgPath, "utf-8");

for (const [filename, size] of Object.entries(sizes)) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.join(outputDir, filename), pngBuffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

console.log("Done!");
