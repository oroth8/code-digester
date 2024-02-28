import express from "express";
import {
  addSchema,
  getPrData,
  addPrData,
  generate,
  read,
} from "../controllers/llm.controller.js";

const router = express.Router();

// Define routes with controllers and middlewares
router.post("/add-schema", addSchema);
router.get("/get-pr-data", getPrData);
router.post("/add-pr-data", addPrData);
router.get("/generate-pr-eval", generate);
router.get("/read/:className", read);

export default router;
