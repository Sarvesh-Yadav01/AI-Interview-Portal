const mongoose = require("mongoose");

function getMongoHint(error) {
  const message = error.message || "";

  if (message.includes("IP that isn't whitelisted") || message.includes("Could not connect to any servers")) {
    return "Check MongoDB Atlas Network Access and add your current IP address.";
  }

  if (message.includes("bad auth") || message.includes("Authentication failed")) {
    return "Check the database username and password in MONGO_URI.";
  }

  if (message.includes("querySrv")) {
    return "Your DNS is blocking Atlas SRV lookup. Try Atlas standard connection string or another DNS/network.";
  }

  return "Check MONGO_URI, internet connection, Atlas cluster status, and database user permissions.";
}

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("MONGO_URI is missing. Add it to .env before using database features.");
    return;
  }

  // Helpful for debugging locally/behind proxies
  const host = (() => {
    try {
      // Works for typical atlas connection strings; falls back safely.
      return uri.replace(/^mongodb\+srv:\/\//, "").replace(/^mongodb:\/\//, "").split("/")[0];
    } catch {
      return "(unknown)";
    }
  })();

  const maxRetries = Number(process.env.MONGO_CONNECT_RETRIES || 5);
  const baseDelayMs = Number(process.env.MONGO_CONNECT_BASE_DELAY_MS || 500);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        // Avoid deprecation warnings in recent mongoose
        // (mongoose will pass these to the underlying driver)
        retryWrites: true
      });
      console.log(`MongoDB connected (host: ${host})`);
      return;
    } catch (error) {
      const hint = getMongoHint(error);
      console.error(`MongoDB connection failed (attempt ${attempt}/${maxRetries}):`, error.message);
      console.error("MongoDB hint:", hint);

      if (attempt === maxRetries) {
        // Fail fast but keep server from crashing hard in case you want to see UI
        // (routes using DB will still fail).
        return;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}


module.exports = connectDB;
