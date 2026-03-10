const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const transactionRoutes = require("./routes/transactions");
const holdingRoutes = require("./routes/holdings");
const adminRoutes = require("./routes/admin");
const screenerRoutes = require("./routes/screener");
const apiLogger = require("./middleware/apiLogger");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  process.env.ADMIN_URL || "http://localhost:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(apiLogger);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/holdings", holdingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/screener", screenerRoutes);
app.use("/api/admin/screener", screenerRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

module.exports = app;
