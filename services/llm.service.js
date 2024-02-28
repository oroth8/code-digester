import weaviate, { ApiKey } from "weaviate-ts-client";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const client = weaviate.client({
  scheme: "https",
  host: "code-digester-xc9z3u73.weaviate.network",
  apiKey: new ApiKey(process.env.WEAVIATE_API_KEY),
  headers: {
    "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY, // Use environment variable
  },
});

async function addSchemaToLLM(classObj) {
  try {
    const resData = await client.schema.classCreator().withClass(classObj).do();
    console.log("Schema added successfully"); // Consider a more sophisticated logging approach
    return true;
  } catch (error) {
    console.error(`Schema not added: ${error.toString()}`);
    throw new Error("Failed to add schema", { cause: error });
  }
}

async function getGithubData() {
  try {
    const diffUrl = "https://api.github.com/repos/oroth8/llm-action/pulls/1";
    const diffResponse = await axios.get(diffUrl, {
      headers: { Accept: "application/vnd.github.v3.diff" },
    });
    const prDiff = diffResponse.data;
    return {
      prNumber: 1,
      repoName: "oroth8/llm-action",
      reviewId: "12345",
      reviewState: "open",
      reviewBody: "{}",
      prDiff,
    };
  } catch (error) {
    console.error(`Failed to fetch PR diff: ${error.toString()}`);
    throw new Error("Failed to get GitHub data", { cause: error });
  }
}

async function addPrDataToLLM(data) {
  try {
    return await client.data
      .creator()
      .withClassName("PrData")
      .withProperties(data)
      .do();
  } catch (error) {
    console.error(`Failed to add PR data: ${error.toString()}`);
    throw new Error("Failed to add PR data", { cause: error });
  }
}

export { addSchemaToLLM, addPrDataToLLM, getGithubData };