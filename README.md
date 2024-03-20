# GenAPI - the fastest and best way to build AI-backed APIs

## Introduction
This project provides a framework for quickly and easily building AI-backed API endpoints with LLMs. By leveraging the OpenAPI 3.1.0 specification, the system ensures accurate and context-aware responses, making it an ideal solution for testing and rapid prototyping.

##### Features:
* **Multi LLM Support**: Choose from a range of leading AI language models including OpenAI, Google Generative AI, MistralAI, and Anthropic. Our unified interface ensures seamless integration, giving you the freedom to select the best model for your unique needs.
* **OpenAPI Specification Compliance**: With full support for the OpenAPI specification, our framework guarantees that your API requests and responses are meticulously structured and validated. Say goodbye to guesswork and enjoy interactions that just work.
* **Guaranteed JSON Response**: Our robust retry mechanism intelligently modifies and simplifies queries in the event of failures, ensuring you always get a JSON response. This enhances the reliability of your API requests, even under challenging conditions.
* **Response Validation and Formatting**: Trust in the accuracy and conformity of your API responses with our thorough validation process. Responses are automatically formatted according to your API's specified structure, ensuring consistency and reliability.
* **Extensibility through Hooks**: Tailor the framework to your project's specific needs with customizable hooks for both prompt generation and response parsing. This allows for unparalleled flexibility in how you process requests and handle responses.

## Installation

### Prerequisites
- Node.js (version 18.x or higher recommended)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/generationapi/genapi
   ```
2. Navigate to the project directory:
   ```bash
   cd genapi
   ```
3. Install dependencies:
   ```bash
   npm install
   # or, if you're using Yarn:
   yarn install
   ```

## Usage

### Basic Usage
To start processing requests, you need to initialize the `GenApi` class with your OpenAPI specification, model name, and API key. Here's a simple example:

```javascript
import GenApi from '@generationapi/genapi';

const openApiSpec = {
  "openapi": "3.1.0",
  "info": {
    "title": "Hello World",
    "version": "1.0.0",
    "description": "Respond with Hello to the name input in a language other than English. Always use a random language."
  },
  "paths": {
    "/hello-world": {
      "post": {
        "tags": [],
        "summary": "Hello World",
        "description": "Respond with Hello to the name input in a language other than English. Always use a random language.",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "text": {
                    "type": "string",
                    "title": "User Name",
                    "description": "The name of the user to be greeted."
                  }
                }
              },
              "examples": {
                "Request": {
                  "value": {
                    "text": "John"
                  },
                  "summary": "Simple text submission"
                }
              }
            }
          },
          "required": true
        },
        "x-prompt": "Given a text input, respond with &#x27;Hello&#x27; followed by the name in a random non-English language. Ensure the output is in the format specified by the &#x60;response_schema&#x60;.",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "text": {
                      "type": "string"
                    }
                  }
                }
              }
            },
            "description": "Successfully processed the request, returning a structured response from the model."
          },
          "400": {
            "description": "Invalid input, e.g., missing or invalid `modelId` or data."
          },
          "401": {
            "description": "Authentication information is missing or invalid."
          },
          "404": {
            "description": "The specified `modelId` was not found."
          }
        }
      }
    }
  }
};

const modelName = 'model-id'; // "google-gemini, gpt-4, gpt-3.5-turbo, mistral-large-latest, claude-3-sonnet"
const apiKey = 'your-api-key';

const apiProcessor = new GenApi(openApiSpec, modelName, apiKey);

// Example request
const pathName = '/hello-world';
const method = 'post';
const requestData = {
  "text": "Paul"
};

apiProcessor.processRequest(pathName, method, requestData)
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

### Advanced Configuration
You can customize the request processing by using the `beforePromptGeneration` and `afterResponseParsing` hooks:

```javascript
apiProcessor.beforePromptGeneration((data) => {
  // Modify the request data before generating the prompt
  return modifiedData;
});

apiProcessor.afterResponseParsing((response) => {
  // Process the response data after parsing
  return modifiedResponse;
});
```

## Configuration
The system is highly configurable to suit various use cases. Key configuration options include:
- **Model Name**: Choose between different language models like GPT or Gemini based on your needs.
- **API Key**: Securely provide your API key for model access.
- **Retry Strategy**: Customize the retry logic for handling request failures.

## Contributing
We welcome contributions from the community! Please check out our [contributing guidelines](CONTRIBUTING.md) for more information on how to get involved.

## License
This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute the code as per the license terms.

## Acknowledgments
- Contributors and maintainers of langchain
- OpenAI, Google for the AI models

For more details on usage, configuration, and customization, please refer to the detailed documentation (link to detailed documentation).