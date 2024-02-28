# GenAPI - the fastest and best way to build AI-backed APIs

## Introduction
This project provides a framework for quickly and easily building AI-backed API endpoints on top of LLMs. By leveraging the OpenAPI specification, the system ensures accurate and context-aware responses, making it an ideal solution for testing and rapid prototyping.

## Installation

### Prerequisites
- Node.js (version 12.x or higher recommended)
- npm (bundled with Node.js) or Yarn

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   ```
2. Navigate to the project directory:
   ```bash
   cd your-repo-name
   ```
3. Install dependencies:
   ```bash
   npm install
   # or, if you're using Yarn:
   yarn install
   ```

## Usage

### Basic Usage
To start processing requests, you need to initialize the `GenerationApi` class with your OpenAPI specification, model name, and API key. Here's a simple example:

```javascript
import GenerationApi from './path-to-generation-api';

const openApiSpec = {/* Your OpenAPI Specification here */};
const modelName = 'gpt-3.5-turbo'; // or any other supported model
const apiKey = 'your-api-key';

const apiProcessor = new GenerationApi(openApiSpec, modelName, apiKey);

// Example request
const pathName = '/your/api/path';
const method = 'post';
const requestData = {/* Your request data here */};

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
- OpenAI for the GPT models
- Google for the Generative AI models
- Contributors and maintainers of the `@langchain/*` libraries

For more details on usage, configuration, and customization, please refer to the detailed documentation (link to detailed documentation).