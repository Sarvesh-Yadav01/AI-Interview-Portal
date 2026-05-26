const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config();

const connectDB = require("./config/db");
const { validateEnv, isProduction } = require("./config/env");
const { attachUser } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

validateEnv();
connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      maxAge: 60 * 60 * 1000
    }
  })
);
app.use(express.static(path.join(__dirname, "public")));
app.use(attachUser);

app.use("/", require("./routes/pageRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/dashboard", require("./routes/dashboardRoutes"));
app.use("/interview", require("./routes/interviewRoutes"));
app.use("/admin", require("./routes/adminRoutes"));

app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).redirect("/interview");
  }

  console.error(error.message);
  res.status(500).render("404", { title: "Something Went Wrong" });
});

function startServer(port, attemptsLeft = 5) {
  const server = app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      const nextPort = Number(port) + 1;
      console.log(`Port ${port} is already in use. Trying http://localhost:${nextPort}`);
      startServer(nextPort, attemptsLeft - 1);
      return;
    }

    throw error;
  });
}

startServer(Number(PORT));
