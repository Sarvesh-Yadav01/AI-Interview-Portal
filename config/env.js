function validateEnv() {
  const warnings = [];

  if (!process.env.MONGO_URI) {
    warnings.push("MONGO_URI is missing.");
  }

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key") {
    warnings.push("OPENAI_API_KEY is missing or still using the placeholder.");
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    warnings.push("JWT_SECRET should be at least 32 characters.");
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    warnings.push("SESSION_SECRET should be at least 32 characters.");
  }

  if (!process.env.ADMIN_EMAIL) {
    warnings.push("ADMIN_EMAIL is missing.");
  }

  if (!process.env.ADMIN_PASS || process.env.ADMIN_PASS.length < 12) {
    warnings.push("ADMIN_PASS should be at least 12 characters.");
  }

  warnings.forEach((warning) => console.warn(`Config warning: ${warning}`));
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

module.exports = { validateEnv, isProduction };
