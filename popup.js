(function () {
  "use strict";

  var apiKeyInput = document.getElementById("apiKey");
  var modelInput = document.getElementById("model");
  var userInput = document.getElementById("userInput");
  var runBtn = document.getElementById("runBtn");
  var loadSchemaBtn = document.getElementById("loadSchemaBtn");
  var schemaFileInput = document.getElementById("schemaFileInput");
  var resetSchemaBtn = document.getElementById("resetSchemaBtn");
  var schemaName = document.getElementById("schemaName");
  var modePreview = document.getElementById("modePreview");
  var statusText = document.getElementById("statusText");
  var outputArea = document.getElementById("outputArea");
  var statusArea = document.getElementById("statusArea");

  var DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
  var SCHEMA_STORAGE_KEY = "sql_schema_text";
  var SCHEMA_NAME_STORAGE_KEY = "sql_schema_filename";
  var bundledSchema = "";
  var bundledSchemaError = null;

  function setStatus(message, isError) {
    statusText.textContent = message || "";
    statusArea.classList.toggle("error", !!isError);
    if (isError) {
      outputArea.classList.add("error");
    } else {
      outputArea.classList.remove("error");
    }
  }

  function saveSettings() {
    localStorage.setItem("openrouter_api_key", apiKeyInput.value.trim());
    localStorage.setItem("openrouter_model", modelInput.value.trim());
  }

  function loadSettings() {
    var savedKey = localStorage.getItem("openrouter_api_key") || "";
    var savedModel = localStorage.getItem("openrouter_model") || DEFAULT_MODEL;
    apiKeyInput.value = savedKey;
    modelInput.value = savedModel;
  }

  function isLikelySql(text) {
    var t = String(text || "").trim();
    if (!t) {
      return false;
    }

    var startsWithSql = /^(select|with|insert|update|delete|merge|create|alter|drop|truncate)\b/i;
    if (startsWithSql.test(t)) {
      return true;
    }

    var hasSqlKeywords = /\b(select|from|where|join|group\s+by|order\s+by|insert\s+into|update|delete\s+from)\b/i;
    var hasSemicolon = /;\s*$/.test(t);
    return hasSqlKeywords.test(t) && (hasSemicolon || t.length > 30);
  }

  function getCustomSchema() {
    return localStorage.getItem(SCHEMA_STORAGE_KEY) || "";
  }

  function getSchemaText() {
    return getCustomSchema() || bundledSchema;
  }

  function updateSchemaLabel() {
    var customSchema = getCustomSchema();
    var savedName = localStorage.getItem(SCHEMA_NAME_STORAGE_KEY);
    resetSchemaBtn.disabled = !customSchema;
    if (customSchema) {
      schemaName.textContent = "Custom: " + (savedName || "uploaded schema");
    } else if (bundledSchema) {
      schemaName.textContent = "Bundled: SQL_Schema.sql";
    } else {
      schemaName.textContent = bundledSchemaError
        ? "Bundled schema unavailable"
        : "Loading bundled schema…";
    }
  }

  function buildPrompt(inputText, mode, schemaText) {
    var schemaBlock = schemaText
      ? "Database schema:\n" + schemaText
      : "Database schema: [not provided]";

    var system =
      "You are a senior SQL expert. You generate or fix SQL based on user intent.\n" +
      "Rules:\n" +
      "- If the input is a requirement in natural language, generate the correct SQL.\n" +
      "- If the input is already SQL, correct or improve it while preserving the intent.\n" +
      "- Use the schema if provided and follow the SQL dialect it indicates. If unclear, preserve the input query's dialect or use broadly compatible SQL.\n" +
      "- If the schema is missing, do your best and keep the SQL generic.\n" +
      "- Output ONLY SQL. No explanations, no markdown, no extra text.\n\n" +
      schemaBlock;

    var user = "Mode: " + mode + "\nInput:\n" + inputText;

    return { system: system, user: user };
  }

  function callOpenRouter(apiKey, model, prompt) {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": "https://localhost",
        "X-Title": "SQL Solver"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ],
        max_tokens: 1024,
        temperature: 0
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (text) {
          throw new Error("OpenRouter error: " + text);
        });
      }
      return res.json();
    });
  }

  function extractSql(result) {
    var content = result && result.choices && result.choices[0] && result.choices[0].message
      ? result.choices[0].message.content
      : "";

    var cleaned = String(content || "").trim();
    cleaned = cleaned.replace(/```[\s\S]*?```/g, function (block) {
      return block.replace(/```\w*\n?|```/g, "").trim();
    });

    return cleaned;
  }

  function setBusy(isBusy) {
    runBtn.disabled = isBusy;
  }

  async function loadBundledSchema() {
    var response = await fetch("SQL_Schema/SQL_Schema.sql");
    if (!response.ok) {
      throw new Error("Could not load the bundled SQL schema (" + response.status + ").");
    }

    var schema = await response.text();
    if (!schema.trim()) {
      throw new Error("The bundled SQL schema is empty.");
    }

    bundledSchema = schema;
  }

  async function onSchemaFileChange() {
    var file = schemaFileInput.files && schemaFileInput.files[0];
    if (!file) {
      return;
    }

    try {
      if (!/\.sql$/i.test(file.name)) {
        throw new Error("Choose a .sql file.");
      }

      var schema = await file.text();
      if (!schema.trim()) {
        throw new Error("The selected SQL schema is empty.");
      }

      localStorage.setItem(SCHEMA_STORAGE_KEY, schema);
      localStorage.setItem(SCHEMA_NAME_STORAGE_KEY, file.name);
      updateSchemaLabel();
      setStatus("Loaded schema: " + file.name, false);
    } catch (err) {
      setStatus(err.message || "Could not load the selected schema.", true);
    } finally {
      schemaFileInput.value = "";
    }
  }

  function resetSchema() {
    localStorage.removeItem(SCHEMA_STORAGE_KEY);
    localStorage.removeItem(SCHEMA_NAME_STORAGE_KEY);
    updateSchemaLabel();
    if (bundledSchema) {
      setStatus("Using bundled schema.", false);
    } else if (bundledSchemaError) {
      setStatus(bundledSchemaError.message, true);
    } else {
      setStatus("Loading bundled schema…", false);
    }
  }

  async function onRun() {
    try {
      setBusy(true);
      setStatus("Working...", false);
      outputArea.textContent = "";
      saveSettings();

      var apiKey = apiKeyInput.value.trim();
      var model = modelInput.value.trim() || DEFAULT_MODEL;
      var inputText = userInput.value.trim();

      if (!apiKey) {
        throw new Error("Please enter your OpenRouter API key.");
      }
      if (!inputText) {
        throw new Error("Please enter a requirement or SQL query.");
      }

      var schemaText = getSchemaText();
      if (!schemaText.trim()) {
        throw new Error(
          bundledSchemaError
            ? bundledSchemaError.message
            : "No SQL schema is available."
        );
      }

      var mode = isLikelySql(inputText) ? "sql" : "requirement";
      modePreview.textContent = mode;

      var prompt = buildPrompt(inputText, mode, schemaText);
      var result = await callOpenRouter(apiKey, model, prompt);
      var sql = extractSql(result);

      if (!sql) {
        throw new Error("Empty response from model.");
      }

      outputArea.textContent = sql;
      setStatus("Done", false);
    } catch (err) {
      setStatus(err.message || "Unexpected error.", true);
    } finally {
      setBusy(false);
    }
  }

  runBtn.addEventListener("click", onRun);
  loadSchemaBtn.addEventListener("click", function () {
    schemaFileInput.click();
  });
  schemaFileInput.addEventListener("change", onSchemaFileChange);
  resetSchemaBtn.addEventListener("click", resetSchema);
  apiKeyInput.addEventListener("change", saveSettings);
  modelInput.addEventListener("change", saveSettings);

  loadSettings();
  updateSchemaLabel();
  loadBundledSchema()
    .then(function () {
      updateSchemaLabel();
    })
    .catch(function (err) {
      bundledSchemaError = err;
      updateSchemaLabel();
      if (!getCustomSchema()) {
        setStatus(err.message || "Could not load the bundled schema.", true);
      }
    });
})();
