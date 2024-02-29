// mock/openApiSpecMock.js

const openApiSpecMock = {
  openapi: "3.1.0",
  info: {
    title: "Hello World",
    version: "1.0.0",
    description:
      "Respond with Hello to the name input in a language other than English. Always use a random language.",
  },
  paths: {
    "/generation-api/hello-world": {
      post: {
        responses: {
          200: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                  },
                },
              },
            },
          },
        },
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: {
                    type: "string",
                    title: "User Name",
                    description: "The name of the user to be greeted.",
                  },
                },
              },
            },
          },
          required: true,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

module.exports = openApiSpecMock;
