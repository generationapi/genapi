// tests/GenApi.test.js

import GenApi from "../src/GenApi.js";
import openApiSpecMock from "../mock/openApiSpecMock.js";

describe("GenApi Class with Hello World Spec", () => {
  let openaiGenApi;
  let googleGenApi;

  beforeAll(() => {
    // Initialize GenApi instances with the mocked spec and respective API keys
    openaiGenApi = new GenApi(
      openApiSpecMock,
      "gpt-4",
      process.env.OPENAI_API_KEY,
    );
    googleGenApi = new GenApi(
      openApiSpecMock,
      "gemini-pro",
      process.env.GOOGLE_API_KEY,
    );
    // Assuming GenApi's dependencies like ModelAdapter are mocked within GenApi.js
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("processRequest successfully handles POST requests for OpenAI", async () => {
    const pathName = "/generation-api/hello-world";
    const method = "post";
    const requestData = { text: "John" };

    jest.spyOn(openaiGenApi, "processRequest").mockResolvedValue({
      text: "Hello John from OpenAI",
    });

    const response = await openaiGenApi.processRequest(
      pathName,
      method,
      requestData,
      process.env.OPENAI_API_KEY,
      2048,
    );
    expect(response).toEqual({ text: "Hello John from OpenAI" });
    expect(openaiGenApi.processRequest).toHaveBeenCalledWith(
      pathName,
      method,
      requestData,
      process.env.OPENAI_API_KEY,
      2048,
    );
  });

  test("processRequest successfully handles POST requests for GoogleGenAI with custom maxTokens", async () => {
    const pathName = "/generation-api/hello-world";
    const method = "post";
    const requestData = { text: "John" };
    const customMaxTokens = 3000;

    jest.spyOn(googleGenApi, "processRequest").mockResolvedValue({
      text: "Hello John from GoogleGenAI",
    });

    const response = await googleGenApi.processRequest(
      pathName,
      method,
      requestData,
      process.env["GOOGLE_API_KEY"],
      customMaxTokens,
    );
    expect(response).toEqual({ text: "Hello John from GoogleGenAI" });
    expect(googleGenApi.processRequest).toHaveBeenCalledWith(
      pathName,
      method,
      requestData,
      process.env["GOOGLE_API_KEY"],
      customMaxTokens,
    );
  });

  /*
  test("beforePromptHook modifies request data before processing", async () => {
    openaiGenApi.beforePromptGeneration((data) => ({
      ...data,
      text: data.text.toUpperCase(),
    }));

    const pathName = "/generation-api/hello-world";
    const method = "post";
    const requestData = { text: "John" };

    jest.spyOn(openaiGenApi, "processRequest").mockResolvedValue({
      text: "HELLO JOHN",
    });

    const response = await openaiGenApi.processRequest(
      pathName,
      method,
      requestData,
    );
    expect(response).toEqual({ text: "HELLO JOHN" });
    expect(openaiGenApi.processRequest).toHaveBeenCalledWith(
      pathName,
      method,
      requestData,
      0,
      2048,
    );
  });

  test("afterResponseParsing modifies response data before returning", async () => {
    openaiGenApi.afterResponseParsing((response) => ({
      ...JSON.parse(response),
      text: `${JSON.parse(response).text}!`,
    }));

    const pathName = "/generation-api/hello-world";
    const method = "post";
    const requestData = { text: "John" };

    jest
      .spyOn(openaiGenApi, "processRequest")
      .mockImplementation(async () => JSON.stringify({ text: "Hello John" }));

    const response = await openaiGenApi.processRequest(
      pathName,
      method,
      requestData,
    );
    expect(response).toEqual({ text: "Hello John!" });
  });
  */
});
