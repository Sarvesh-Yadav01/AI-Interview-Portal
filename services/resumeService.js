const fs = require("fs/promises");
const pdfParse = require("pdf-parse");

async function extractResumeText(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);

  return String(data.text || "").trim();
}

module.exports = { extractResumeText };
