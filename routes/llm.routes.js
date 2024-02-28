import express from "express";
import {
  addSchema,
  getPrData,
  addPrData,
} from "../controllers/llm.controller.js";

const router = express.Router();

// Define routes with controllers and middlewares
router.post("/add-schema", addSchema);
router.get("/get-pr-data", getPrData);
router.get("/add-pr-data", addPrData);

export default router;
