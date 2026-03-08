// Vercel Serverless entry point — wraps the Express app
require("dotenv").config();
const app = require("../backend/app");

module.exports = app;
