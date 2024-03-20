// Import necessary modules and classes
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import OpenAPIParser from "@readme/openapi-parser";
import Ajv from "ajv";

// Define maximum number of retry attempts with a strategy to reduce query complexity on each retry
const MAX_RETRY_ATTEMPTS = 3;
const MAX_TOKENS = 2048;

/**
 * Removes Markdown code markup from a string. This includes both block and inline code elements.
 * Useful for cleaning up language model responses that may contain Markdown formatting.
 *
 * @param {string} str - The string to be processed.
 * @returns {string} The cleaned string with Markdown code markup removed.
 */
function removeMarkdownCodeMarkup(str) {
  return str
    .replace(/```[\s\S]*?\n```|`(.*?)`/g, (match, group1) =>
      group1 ? group1 : "",
    )
    .trim();
}

/**
 * Extracts the relevant part of the OpenAPI specification for a given API path and method.
 * This is used to narrow down the spec to the relevant sections for a particular request,
 * making it easier for the language model to generate accurate responses.
 *
 * @param {object} dereferencedSpec - The complete OpenAPI specification that has been dereferenced.
 * @param {string} path - The API endpoint path.
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
 * @returns {object} The relevant section of the OpenAPI specification.
 */
function extractRelevantSpec(dereferencedSpec, path, method) {
  const pathSpec = dereferencedSpec.paths[path];
  const methodSpec = pathSpec ? pathSpec[method] : null;

  if (!methodSpec) {
    throw new Error(
      `Path or method not found in OpenAPI specification: ${path}, ${method}`,
    );
  }

  return {
    openapi: dereferencedSpec.openapi,
    info: dereferencedSpec.info,
    paths: { [path]: { [method]: methodSpec } },
    components: dereferencedSpec.components,
  };
}

/**
 * ModelAdapter class translates API request data into a format suitable for language model processing.
 * It uses the OpenAPI specification to guide the generation of prompts that instruct the model on how to respond.
 */
class ModelAdapter {
  constructor(dereferencedOpenApiSpec) {
    this.dereferencedOpenApiSpec = dereferencedOpenApiSpec;
  }

  /**
   * Translates API request data into a language model query, using the relevant OpenAPI spec.
   * The method constructs a detailed prompt that encapsulates the API's behavior as described in the spec.
   *
   * @param {object} requestData - The request data to be sent to the API.
   * @param {string} path - The API endpoint path.
   * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
   * @returns {string} A prompt for the language model, instructing it on how to respond based on the OpenAPI spec.
   */
  translateRequestToLlmQuery(requestData, path, method) {
    const relevantSpec = extractRelevantSpec(
      this.dereferencedOpenApiSpec,
      path,
      method,
    );
    const stringSchema = JSON.stringify(relevantSpec, null, 2).replace(
      /[{}]/g,
      (match) => (match === "{" ? "{{" : "}}"),
    );

    const prompt = `Can you pretend to be the API in the following OpenAPI SPECIFICATION for all future requests and follow the INSTRUCTIONS below.
    
----------
SPECIFICATION:
${stringSchema}

----------
INSTRUCTIONS:
- ALWAYS respond in JSON
- ALWAYS be tolerant and try to return 200 status on requests
- ALWAYS only ever include data from the request data
- NEVER include data not in the request data
- NEVER use example data in your response.
- ALWAYS leave blank if no data is provided
- DO NOT INCLUDE BACKTICKS IN THE RESPONSE
`;

    return prompt;
  }
}

/**
 * Creates a model adapter instance based on the provided model name and API key.
 * This factory function abstracts away the details of instantiating specific model adapters,
 * making it easy to switch between different language models (e.g., GPT, Gemini) as needed.
 *
 * @param {string} modelName - The name of the language model to be used.
 * @param {string} apiKey - The API key for authenticating with the model provider.
 * @returns {object} An instance of the chosen model adapter.
 */
function createModelAdapter(modelName, apiKey, maxTokens) {
  const adapters = {
    gpt: () =>
      new ChatOpenAI({
        modelName,
        openAIApiKey: apiKey,
        maxTokens: maxTokens,
      }).bind({
        response_format: { type: "json_object" },
      }),
    gemini: () =>
      new ChatGoogleGenerativeAI({
        modelName,
        apiKey,
        maxOutputTokens: maxTokens,
      }),
    mistral: () =>
      new ChatMistralAI({
        modelName,
        apiKey,
        maxTokens: maxTokens,
      }),
    claude: () =>
      new ChatAnthropic({
        modelName,
        anthropicApiKey: apiKey,
        maxTokens: maxTokens,
      }),
  };

  const adapterKey = Object.keys(adapters).find((key) =>
    modelName.startsWith(key),
  );
  if (!adapterKey) throw new Error(`Unsupported model name: ${modelName}`);

  return adapters[adapterKey]();
}

/**
 * GenApi class orchestrates the process of handling API requests using language models.
 * It leverages the OpenAPI specification to ensure requests are processed accurately according to the API's definition.
 */
class GenApi {
  constructor(openApiSpec, modelName, apiKey, maxTokens = MAX_TOKENS) {
    this.ajv = new Ajv({ strict: false });
    this.specPromise = OpenAPIParser.dereference(openApiSpec).catch((error) => {
      console.error("Initialization error:", error);
      throw error;
    });
    this.llmService = createModelAdapter(modelName, apiKey, maxTokens);
  }

  beforePromptGeneration(callback) {
    this.beforePromptHook = callback;
  }

  afterResponseParsing(callback) {
    this.afterResponseHook = callback;
  }

  /**
   * Processes an API request through a language model, using the OpenAPI spec to guide response generation.
   * This method supports retrying requests with simplified queries to handle potential failures gracefully.
   *
   * @param {string} pathName - The API endpoint path.
   * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
   * @param {object} data - The request data.
   * @param {number} retryCount - The current retry attempt (used for recursive retries).
   * @returns {Promise<object>} The processed API response, structured according to the OpenAPI spec.
   */
  async processRequest(pathName, method, data, retryCount = 0) {
    console.log(
      `processRequest called with path: ${pathName}, method: ${method}, retryCount: ${retryCount}`,
    ); // Log method entry and retry count

    const spec = await this.specPromise;
    let requestData = this.beforePromptHook
      ? this.beforePromptHook(data)
      : data;
    requestData =
      typeof requestData === "string" ? JSON.parse(requestData) : requestData;

    const system_prompt = new ModelAdapter(spec).translateRequestToLlmQuery(
      requestData,
      pathName,
      method,
    );
    const outputParser = new StringOutputParser();

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", system_prompt],
      ["user", "{input}"],
    ]);
    const llmChain = prompt.pipe(this.llmService).pipe(outputParser);

    try {
      let response = await llmChain.invoke({
        input: JSON.stringify(requestData),
      });
      console.log(`Response received for path: ${pathName}, method: ${method}`); // Log successful response

      response = removeMarkdownCodeMarkup(response);
      response = this.afterResponseHook
        ? this.afterResponseHook(response)
        : response;
      this.validateData(spec, response, pathName, method, "response");

      const schema =
        spec.paths[pathName][method].responses["200"]?.content[
          "application/json"
        ].schema;
      let output = generateBlankJson(schema);

      deepMerge(output, JSON.parse(response));
      return output;
    } catch (error) {
      console.log(
        `Error encountered for path: ${pathName}, method: ${method}, retryCount: ${retryCount}`,
        error.message,
      ); // Log error encountered

      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const modifiedRequestData = this.modifyQueryForTailOff(
          requestData,
          retryCount,
        );
        console.log(
          `Retrying request with modified query (attempt ${retryCount + 1}):`,
          modifiedRequestData,
        ); // Log retry attempt

        return this.processRequest(
          pathName,
          method,
          modifiedRequestData,
          retryCount + 1,
        );
      } else {
        console.log(
          `Max retries reached for path: ${pathName}, method: ${method}. Throwing error.`,
        ); // Log max retries reached
        throw error;
      }
    }
  }

  /**
   * Modifies the request data based on the retry attempt count to simplify the query,
   * potentially increasing the chance of success in subsequent attempts.
   *
   * @param {object} data - The original request data.
   * @param {number} retryCount - The current retry attempt count.
   * @returns {object} The modified request data.
   */
  modifyQueryForTailOff(data, retryCount) {
    // Implement specific logic to simplify the query based on retryCount
    return { ...data };
  }

  /**
   * Validates the given data against the OpenAPI schema for the specified path and method.
   * This ensures that the data structure conforms to the API's expected input or output format.
   *
   * @param {object} spec - The OpenAPI specification.
   * @param {object|string} data - The data to validate, either as an object or a JSON string.
   * @param {string} path - The API endpoint path.
   * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
   * @param {string} type - The type of validation ('request' or 'response').
   */
  validateData(spec, data, path, method, type) {
    const schemaPath =
      type === "request"
        ? spec.paths[path][method].requestBody?.content["application/json"]
            .schema
        : spec.paths[path][method].responses["200"]?.content["application/json"]
            .schema;

    if (!schemaPath) {
      throw new Error(
        `Schema not found for ${type} in ${method.toUpperCase()} ${path}`,
      );
    }

    const jsonData = typeof data === "string" ? JSON.parse(data) : data;
    const validate = this.ajv.compile(schemaPath);

    if (!validate(jsonData)) {
      console.error(`Invalid ${type} data:`, validate.errors);
      throw new Error(
        `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } schema validation error for ${method.toUpperCase()} ${path}`,
      );
    }
  }
}

/**
 * Generates a blank JSON object based on a given schema, initializing properties according to their types.
 * This function is recursive for nested objects and arrays defined in the schema.
 *
 * @param {object} schema - The JSON schema definition.
 * @returns {object|array|string|number|boolean|null} A blank JSON object structured according to the schema.
 */
function generateBlankJson(schema) {
  if (!schema || typeof schema !== "object") return;

  switch (schema.type) {
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties || {}).map(([key, value]) => [
          key,
          generateBlankJson(value),
        ]),
      );
    case "array":
      return schema.items ? [generateBlankJson(schema.items)] : [];
    case "string":
      return "";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    default:
      return null;
  }
}

/**
 * Deeply merges the properties of the source object into the target object.
 * This function is used to combine response data structures with the language model's output.
 *
 * @param {object} target - The target object to merge into.
 * @param {object} source - The source object from which properties will be copied.
 */
function deepMerge(target, source) {
  Object.keys(source).forEach((key) => {
    if (source[key] && typeof source[key] === "object") {
      if (!target[key]) target[key] = Array.isArray(source[key]) ? [] : {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
}

// Export the GenApi class for use in other modules
export default GenApi;
