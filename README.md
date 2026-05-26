# SQL Solver (Firefox Extension)

This is a Firefox extension that generates SQL from natural language requirements or improves existing SQL, using OpenRouter. It keeps the simple popup UX from the original quiz solver, but works with a single input textbox for SQL tasks.

## Features
- Detects whether the input is a requirement or existing SQL
- Generates or corrects SQL based on the detected mode
- Uses OpenRouter with a user-provided API key
- No database connection in the initial version

## How to run in Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` from this folder

## Schema
The database schema will be added later and used to guide SQL generation and correction. The SQL schema file lives in [SQL_Schema/SQL_Schema.sql](SQL_Schema/SQL_Schema.sql).
