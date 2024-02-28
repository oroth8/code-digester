import dotenv from "dotenv";
import express from "express";
import llmRoutes from "./routes/llm.routes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/llm", llmRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}/`);
});
