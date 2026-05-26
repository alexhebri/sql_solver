(function () {
  "use strict";

  var apiKeyInput = document.getElementById("apiKey");
  var modelInput = document.getElementById("model");
  var userInput = document.getElementById("userInput");
  var runBtn = document.getElementById("runBtn");
  var modePreview = document.getElementById("modePreview");
  var statusText = document.getElementById("statusText");
  var outputArea = document.getElementById("outputArea");
  var statusArea = document.getElementById("statusArea");

  var DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
  var SCHEMA_STORAGE_KEY = "sql_schema_text";

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

  function getSchemaText() {
    return localStorage.getItem(SCHEMA_STORAGE_KEY) || "";
  }

  function buildPrompt(inputText, mode, schemaText) {
    var schemaBlock = schemaText
      ? "Schema (Oracle SQL):\n" + schemaText
      : "Schema (Oracle SQL): [not provided yet]";

    var system =
      "You are a senior Oracle SQL expert. You generate or fix SQL based on user intent.\n" +
      "Rules:\n" +
      "- If the input is a requirement in natural language, generate the correct SQL.\n" +
      "- If the input is already SQL, correct or improve it while preserving the intent.\n" +
      "- Use the schema if provided. If schema is missing, do your best and keep it generic.\n" +
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

      var mode = isLikelySql(inputText) ? "sql" : "requirement";
      modePreview.textContent = mode;

      var prompt = buildPrompt(inputText, mode, getSchemaText());
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
  apiKeyInput.addEventListener("change", saveSettings);
  modelInput.addEventListener("change", saveSettings);

  loadSettings();
})();
