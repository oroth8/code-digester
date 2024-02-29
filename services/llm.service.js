import weaviate, { ApiKey } from "weaviate-ts-client";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

// Define the Weaviate client
const client = weaviate.client({
  scheme: "https",
  host: "code-digester-xc9z3u73.weaviate.network",
  apiKey: new ApiKey(process.env.WEAVIATE_API_KEY),
  headers: {
    "X-OpenAI-Api-Key": process.env.OPENAI_API_KEY, // Use environment variable
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the Weaviate VDB Schema
// {
//     "class": "PrData",
//     "vectorizer": "text2vec-openai",
//     "moduleConfig": {
//       "text2vec-openai": {},
//       "generative-openai": {}
//     },
//     "properties": [
//       {
//         "name": "prNumber",
//         "dataType": ["int"]
//       },
//       {
//         "name": "repoName",
//         "dataType": ["string"]
//       },
//         {
//         "name": "reviewId",
//         "dataType": ["int"]
//       },
//         {
//         "name": "reviewState",
//         "dataType": ["string"]
//       },
//         {
//         "name": "reviewBody",
//         "dataType": ["text"]
//       },
//         {
//         "name": "prDiff",
//         "dataType": ["text"]
//       }
//     ]
//   }
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

// Get PR data from GitHub
async function getGithubData() {
  let githubData = [];
  for (let i = 1; i < 60; i++) {
    try {
      const diffUrl = `https://api.github.com/repos/LaunchPadLab/decanter/pulls/${i}`;
      const diffResponse = await axios.get(diffUrl, {
        headers: { Accept: "application/vnd.github.v3.diff" },
      });
      const prDiff = diffResponse.data;

      const prUrl = `https://api.github.com/repos/LaunchPadLab/decanter/pulls/${i}`;
      const prResponse = await axios.get(prUrl);

      const payload = {
        prNumber: i,
        repoName: "LaunchPadLab/decanter",
        reviewId: prResponse.data.id,
        reviewState: prResponse.data.state,
        reviewBody: prResponse.data.body,
        prDiff,
      };
      githubData.push(payload);
      continue;
    } catch (error) {
      console.error(`Failed to fetch PR diff: ${error.toString()}`);
      console.log({ error });
      continue;
      throw new Error("Failed to get GitHub data", { cause: error });
    }
  }
  return githubData;
}

// Add PR data to Weaviate
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

function parseGithubDiff(diff) {
  // Split the diff into lines
  const lines = diff.split("\n");

  // Initialize containers for different types of lines
  const additions = [];
  const deletions = [];
  const context = [];

  lines.forEach((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      // Line is an addition
      additions.push(line.substring(1)); // Remove the '+' prefix
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      // Line is a deletion
      deletions.push(line.substring(1)); // Remove the '-' prefix
    } else if (!line.startsWith("+++") && !line.startsWith("---")) {
      // Line is context (unchanged)
      context.push(line);
    }
    // Skip the lines that start with '+++' or '---' as they are file indicators
  });

  return { additions, deletions, context };
}

function parseGithubDiffCombine(diff) {
  // Split the diff into lines
  const lines = diff.split("\n");

  // Initialize strings for different types of lines
  let additions = "";
  let deletions = "";
  let context = "";

  lines.forEach((line) => {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      // Line is an addition
      additions += line.substring(1) + "\n"; // Remove the '+' prefix
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      // Line is a deletion
      deletions += line.substring(1) + "\n"; // Remove the '-' prefix
    } else if (!line.startsWith("+++") && !line.startsWith("---")) {
      // Line is context (unchanged)
      context += line + "\n";
    }
    // Skip the lines that start with '+++' or '---' as they are file indicators
  });

  // Combine the strings into one, with labels or separators as needed
  const combinedDiff = `Additions:\n${additions}\nDeletions:\n${deletions}\nContext:\n${context}`;
  return combinedDiff.trim(); // Trim to remove any leading/trailing newline characters
}

// Define the Weaviate VDB Generative module Query
async function generatePrEval(prDiff) {
  //   const diffUrl = `https://api.github.com/repos/oroth8/llm-action/pulls/${5}`;
  //   const diffResponse = await axios.get(diffUrl, {
  //     headers: { Accept: "application/vnd.github.v3.diff" },
  //   });
  //   const prDiff = diffResponse.data;
  const parsedDiff = parseGithubDiff(prDiff);
  console.log({ parsedDiff });
  const generatePrompt = `Given the following PR diff:${parsedDiff} Please review the changes and provide feedback. Answer in markdown format and only.`;
  const response = await client.graphql
    .get()
    .withClassName("PrData")
    .withFields("prDiff reviewBody")
    .withGenerate({
      groupedTask: generatePrompt,
    })
    .withNearText({
      concepts: ["review"],
    })
    .withLimit(3)
    .do();

  console.log(JSON.stringify(response, null, 2));

  return response;
}

// Example usage, assuming prDiff is defined
// generatePrEval(prDiff);

async function readObject(className) {
  const result = await client.data.getterById().withClassName(className).do();

  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function createPrFromDiff(prDiff) {
  //   const diffUrl = `https://api.github.com/repos/oroth8/llm-action/pulls/${5}`;
  //   const diffResponse = await axios.get(diffUrl, {
  //     headers: { Accept: "application/vnd.github.v3.diff" },
  //   });
  //   const prDiff = diffResponse.data;
  const parsedDiff = parseGithubDiffCombine(prDiff);
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: `Given the following PR diff:${parsedDiff} Please review the changes and provide feedback. Answer in markdown format and only.`,
      },
    ],
    model: "gpt-4-0125-preview",
  });

  return chatCompletion;
}

export {
  addSchemaToLLM,
  addPrDataToLLM,
  getGithubData,
  generatePrEval,
  readObject,
  createPrFromDiff,
};
