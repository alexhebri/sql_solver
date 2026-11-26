# SQL Solver

SQL Solver is a lightweight browser extension for turning natural-language requirements into SQL and improving existing SQL queries. It sends requests to OpenRouter and uses the database schema to make its suggestions relevant to your tables and columns.

## Features

- Generate SQL from a written requirement or improve a SQL query.
- Start with the schema bundled at `SQL_Schema/SQL_Schema.sql`.
- Optionally load your own `.sql` schema. The selected schema is saved in this browser profile and stays active until you choose **Use bundled schema**.
- Choose an OpenRouter model and save your API key in the extension.
- Runs as a Manifest V3 extension in Chrome and Firefox.

SQL Solver does not connect to or execute queries against a database.

## Install for development

### Google Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select the folder containing this README and `manifest.json`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **This Firefox**.
3. Choose **Load Temporary Add-on…**.
4. Select the `manifest.json` file in this folder.

Firefox temporary add-ons are removed when the browser restarts.

## Configure and use

1. Open SQL Solver from the browser toolbar.
2. Enter your OpenRouter API key and, optionally, change the model.
3. Leave the schema setting alone to use the bundled SQL schema, or choose **Load SQL schema** and select a `.sql` file.
4. Enter a requirement or SQL query and choose **Generate / Improve**.
5. To return to the bundled schema, choose **Use bundled schema**.

The API key, selected model, and custom schema are stored in this extension's browser local storage. The active schema and your prompt are sent to OpenRouter with each request. Avoid using sensitive schemas or prompts unless you are comfortable sending them to that service.

## Troubleshooting

- **OpenRouter request fails:** Check your API key, selected model, and internet connection.
- **Bundled schema is unavailable:** Confirm `SQL_Schema/SQL_Schema.sql` is present in the extension folder, then reload the extension.
- **A custom schema is not accepted:** Choose a non-empty `.sql` file. If the file cannot be read or is empty, the active schema stays unchanged.

## Project files

- `manifest.json` — browser extension metadata and permissions.
- `popup.html` / `popup.js` — extension interface and SQL request flow.
- `SQL_Schema/SQL_Schema.sql` — bundled default schema.
- `content.js` — unused placeholder retained from the original project structure.
