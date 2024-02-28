import {
  addSchemaToLLM,
  getGithubData,
  addPrDataToLLM,
} from "../services/llm.service.js";

const handleErrorResponse = (error, res) => {
  console.error(error); // Consider using a more sophisticated logger
  const statusCode = error.isClientError ? 400 : 500;
  res
    .status(statusCode)
    .json({ message: error.message || "An error occurred" });
};

export const addSchema = async (req, res) => {
  try {
    const schemaAdded = await addSchemaToLLM(req.body);
    res.status(200).json({ message: "Schema added successfully" });
  } catch (error) {
    handleErrorResponse(error, res);
  }
};

export const getPrData = async (req, res) => {
  try {
    const payload = await getGithubData();
    res.status(200).json({ payload });
  } catch (error) {
    handleErrorResponse(error, res);
  }
};

export const addPrData = async (req, res) => {
  try {
    const data = await getGithubData();
    const result = await addPrDataToLLM(data);
    res.status(200).json({ result });
  } catch (error) {
    handleErrorResponse(error, res);
  }
};
