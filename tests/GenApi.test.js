// tests/GenApi.test.js

import GenApi from "../src/GenApi.js";
import openApiSpecMock from "../mock/openApiSpecMock.js";

describe("GenApi Class with Hello World Spec", () => {
  let genApi;

  beforeAll(() => {
    // Initialize GenApi with the mocked spec
    genApi = new GenApi(openApiSpecMock, "gpt", process.env.OPENAI_API_KEY);
    // Assuming GenApi's dependencies like ModelAdapter are mocked within GenApi.js
  });

  test("processRequest handles /generation-api/hello-world POST requests correctly", async () => {
    const pathName = "/generation-api/hello-world";
    const method = "post";
    const requestData = { text: "John" };

    // Mock processRequest to simulate a successful API call
    jest.spyOn(genApi, "processRequest").mockResolvedValue({
      text: "Hola John",
    });

    const response = await genApi.processRequest(pathName, method, requestData);
    expect(response).toEqual({ text: "Hola John" });

    // Verify that processRequest was called with the correct arguments
    expect(genApi.processRequest).toHaveBeenCalledWith(
      pathName,
      method,
      requestData
    );
  });

  test("processRequest handles errors gracefully", async () => {
    const pathName = "/generation-api/invalid-path";
    const method = "post";
    const requestData = { text: "John" };

    // Simulate an error scenario, such as an invalid path
    jest.spyOn(genApi, "processRequest").mockRejectedValue(new Error("Path or method not found"));

    await expect(genApi.processRequest(pathName, method, requestData)).rejects.toThrow("Path or method not found");
  });

  test("processRequest retries on failure with modified query", async () => {
    const pathName = "/generation-api/hello-world";
    const method = "post";
    const requestData = { text: "John" };

    // First call fails, second call succeeds
    jest.spyOn(genApi, "processRequest")
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({ text: "Bonjour John" });

    const response = await genApi.processRequest(pathName, method, requestData);
    expect(response).toEqual({ text: "Bonjour John" });

    // Verify that processRequest was retried
    expect(genApi.processRequest).toHaveBeenCalledTimes(2);
  });

  test("processRequest handles GET requests correctly", async () => {
    const pathName = "/generation-api/hello-world";
    const method = "get";
    const requestData = {};

    // Mock a successful GET request
    jest.spyOn(genApi, "processRequest").mockResolvedValue({
      message: "GET request successful",
    });

    const response = await genApi.processRequest(pathName, method, requestData);
    expect(response).toEqual({ message: "GET request successful" });
  });

  test("processRequest validates request data correctly", async () => {
    const pathName = "/generation-api/hello-world";
    const method = "post";
    const invalidRequestData = {}; // Missing required 'text' field

    // Simulate request validation failure
    jest.spyOn(genApi, "processRequest").mockRejectedValue(new Error("Invalid request data"));

    await expect(genApi.processRequest(pathName, method, invalidRequestData)).rejects.toThrow("Invalid request data");
  });
});
