// require('dotenv').config();

// const app = require('./src/app');
// const connectDB = require('./src/db/db');

// connectDB();

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//     console.log(`Server started successfully on port ${PORT}`);
// });

// import dotenv from "dotenv";
// import connectDB from "./src/db/db";

// dotenv.config();

// connectDB();


// const PORT = process.env.PORT || 5000;

// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on port ${PORT}`);
// });

require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/db/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();