# Figma Sync Guide

This guide explains how to use the custom Figma plugin and n8n workflows to keep `tokens/*.json` and Figma in sync.

## Overview

Two-way sync between this repo and Figma:

- **Code → Figma (Pull):** When tokens change in the repo, open the Figma plugin and click "Pull from Repo". Variables and Text Styles update automatically.
- **Figma → Code (Push):** When you change tokens in Figma, click "Push to Repo". n8n creates a PR for review before merging.

## Setup

### 1. Install the Figma Plugin

1. Open Figma
2. Go to **Plugins → Development → Import plugin from manifest**
3. Select `figma-plugin/manifest.json` from this repo
4. The plugin appears as "Compulocks Token Sync" in your Development plugins

### 2. Set Up n8n

See `n8n/README.md` for full instructions. Summary:

1. Import `n8n/workflow-a-code-to-figma.json` and `n8n/workflow-b-figma-to-code.json` into n8n
2. Set environment variables: `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN`, `GITHUB_BRANCH`
3. Activate both workflows
4. Copy the webhook URLs (Pull and Push endpoints)

### 3. Configure the Plugin

1. Open your Figma file
2. Run **Plugins → Development → Compulocks Token Sync**
3. Paste your n8n base webhook URL into the input field
4. You're ready to sync

---

## Usage

### Pull (Code → Figma)

Use this after merging token changes in the repo.

1. Click **"Pull from Repo"** in the plugin
2. The plugin fetches the latest tokens from n8n
3. Figma Variables (colors, spacing) and Text Styles (typography) are created or updated
4. Check the status message for confirmation

### Push (Figma → Code)

Use this after changing variables/styles directly in Figma.

1. Click **"Push to Repo"** in the plugin
2. The plugin reads all Variables and Text Styles from your file
3. Data is sent to n8n, which transforms it back to DTCG format
4. n8n creates a branch `figma-sync/YYYY-MM-DD-HHMMSS` and opens a PR
5. Copy the PR URL from the status message and review/merge on GitHub

---

## Token Mapping

| Token Group | Figma Feature | Collection / Group |
|-------------|---------------|--------------------|
| `color.*` | Variables (COLOR) | "Brand" collection |
| `spacing.*` | Variables (FLOAT) | "Spacing" collection |
| `font.family.*` | Text Styles | "Typography" group |
| `textStyle.*` | Text Styles | "Text Styles" group |

## Notes

- Typography uses Figma Text Styles (not Variables — Figma doesn't support font Variables yet)
- The plugin requires the fonts Barlow and Barlow Condensed to be available in your Figma account
- The Push flow creates a PR, not a direct commit — always review before merging
- After merging a Figma sync PR, run `npm run build` locally to regenerate CSS/SCSS/TS outputs
