# n8n Workflows for Figma Sync

## Prerequisites

- n8n instance (self-hosted or cloud free tier at https://n8n.io)
- GitHub personal access token with `repo` scope
- Figma file open with the Compulocks Token Sync plugin installed

## Setup

### 1. Import Workflows

1. Open your n8n instance
2. Go to **Workflows → Import**
3. Import `workflow-a-code-to-figma.json` (Code → Figma)
4. Import `workflow-b-figma-to-code.json` (Figma → Code)

### 2. Set Environment Variables

In n8n Settings → Variables, add:

| Variable | Value |
|----------|-------|
| `GITHUB_OWNER` | Your GitHub username or org |
| `GITHUB_REPO` | `compulocks-brand-system` |
| `GITHUB_TOKEN` | Your GitHub personal access token |
| `GITHUB_BRANCH` | `master` |

### 3. Configure GitHub Webhook

In your GitHub repo → Settings → Webhooks → Add webhook:
- **Payload URL:** `https://your-n8n-instance/webhook/github-push`
- **Content type:** `application/json`
- **Events:** Just the push event

### 4. Get Your Webhook URLs

After activating both workflows in n8n, copy:
- **Pull URL** (from Workflow A): for the Figma plugin "Pull" button
- **Push URL** (from Workflow B): for the Figma plugin "Push" button

Enter these in the plugin UI as `https://your-n8n.../webhook/[pull|push]`

---

## Workflow A: Code → Figma

Triggered by GitHub push events. Transforms DTCG tokens to Figma format and stores them for the plugin to pull.

### Nodes

1. **GitHub Push Webhook** — Receives push events from GitHub
2. **Filter Token Changes** — Only proceeds if `tokens/` files were changed
3. **Fetch color.json** — GET raw file from GitHub API
4. **Fetch typography.json** — GET raw file from GitHub API
5. **Fetch spacing.json** — GET raw file from GitHub API
6. **Transform DTCG → Figma** — Code node: converts to Figma Variable/Style format (paste logic from `lib/dtcg-to-figma.mjs`)
7. **Store for Pull** — Saves transformed data in n8n static workflow data
8. **Pull Webhook** — Separate GET webhook endpoint: returns stored data to plugin

### Code Node Logic (paste into node 6)

The transformation logic is in `lib/dtcg-to-figma.mjs`. Copy the full file contents into the n8n Code node, then call:

```javascript
const color = JSON.parse(Buffer.from($node["Fetch color.json"].json.content, 'base64').toString());
const typography = JSON.parse(Buffer.from($node["Fetch typography.json"].json.content, 'base64').toString());
const spacing = JSON.parse(Buffer.from($node["Fetch spacing.json"].json.content, 'base64').toString());

// ... paste dtcg-to-figma.mjs functions here ...

const variables = dtcgToFigmaVariables({ color, spacing });
const textStyles = dtcgToFigmaTextStyles(typography);

return [{ json: { collections: variables.collections, textStyles } }];
```

---

## Workflow B: Figma → Code

Triggered by the Figma plugin Push button. Creates a PR with updated token files.

### Nodes

1. **Push Webhook** — Receives POST from Figma plugin with Variable/Style data
2. **Transform Figma → DTCG** — Code node: converts back to DTCG format (paste logic from `lib/figma-to-dtcg.mjs`)
3. **Fetch Current Files** — Gets current token files from GitHub to detect changes
4. **Diff Check** — Compares new vs current; stops if no changes
5. **Create Branch** — POST to GitHub API: creates `figma-sync/YYYY-MM-DD-HHMMSS` from master
6. **Commit color.json** — PUT to GitHub API: updates file on new branch
7. **Commit spacing.json** — PUT to GitHub API: updates file on new branch
8. **Create PR** — POST to GitHub API: opens PR from sync branch to master
9. **Respond** — Returns `{ prUrl }` to the Figma plugin

### Code Node Logic (paste into node 2)

```javascript
// Paste figma-to-dtcg.mjs functions here, then:
const figmaData = $input.first().json;
const tokenFiles = figmaToTokenFiles(figmaData);
return Object.entries(tokenFiles).map(([filename, content]) => ({
  json: { filename, content: JSON.stringify(content, null, 2) }
}));
```

### GitHub API: Create Branch

```
POST https://api.github.com/repos/{{$env.GITHUB_OWNER}}/{{$env.GITHUB_REPO}}/git/refs
Authorization: Bearer {{$env.GITHUB_TOKEN}}
Body: {
  "ref": "refs/heads/figma-sync/{{ new Date().toISOString().replace(/[:.]/g,'-').substring(0,19) }}",
  "sha": "{{ masterBranchSHA }}"
}
```

### GitHub API: Commit File

```
PUT https://api.github.com/repos/{{$env.GITHUB_OWNER}}/{{$env.GITHUB_REPO}}/contents/tokens/{{filename}}
Authorization: Bearer {{$env.GITHUB_TOKEN}}
Body: {
  "message": "figma sync: update {{filename}}",
  "content": "{{ base64(fileContent) }}",
  "branch": "{{branchName}}",
  "sha": "{{ currentFileSHA }}"
}
```

### GitHub API: Create PR

```
POST https://api.github.com/repos/{{$env.GITHUB_OWNER}}/{{$env.GITHUB_REPO}}/pulls
Authorization: Bearer {{$env.GITHUB_TOKEN}}
Body: {
  "title": "Figma token sync — {{ date }}",
  "body": "Automated sync from Figma plugin.\n\nChanged files:\n{{ changedFiles }}",
  "head": "{{branchName}}",
  "base": "master"
}
```
