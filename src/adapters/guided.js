// Clients whose provider settings cannot be written safely from a script.
// We still resolve the exact values and hand over a copy-paste card.

function card(ctx, extra = []) {
  const { resolved, model, provider } = ctx;
  const key = resolved.apiKey || (resolved.apiKeyEnv ? `$${resolved.apiKeyEnv}` : '(no key)');
  return [
    `Provider: ${provider.name || provider.id}  (protocol: ${provider.protocol})`,
    `Base URL: ${resolved.baseUrl}`,
    `API key:  ${key}`,
    `Model ID: ${model.id}`,
    ...extra,
  ];
}

function guided(def) {
  return {
    group: 'gui',
    writable: 'guided',
    accepts: ['openai-chat', 'anthropic', 'openai-responses', 'gemini'],
    baseStyle: 'v1',
    paths: () => [],
    detect: () => true,
    render(ctx) {
      return {
        files: [],
        warnings: [`${def.name}: no scriptable config file; follow the steps in the UI instead.`],
        guide: card(ctx, def.steps || []),
        guided: true,
      };
    },
    ...def,
  };
}

export const cursor = guided({
  id: 'cursor',
  name: 'Cursor',
  docs: 'https://cursor.com/docs/models-and-pricing',
  steps: [
    'Settings -> Models -> API Keys: paste the key, then enable "Override OpenAI Base URL".',
    'Base URL must stop at /v1 (Cursor appends /chat/completions).',
    'BYOK is unavailable on some plans; the panel shows nothing if the option is missing.',
  ],
});

export const cline = guided({
  id: 'cline-vscode',
  name: 'Cline (VS Code)',
  docs: 'https://docs.cline.bot/provider-config/openai-compatible',
  steps: [
    'Provider -> OpenAI Compatible -> Base URL / API Key / Model ID.',
    'The key lives in VS Code SecretStorage (DPAPI) and provider fields in globalState: files cannot be written safely.',
    'Do not paste the same value twice: Cline appends /v1/chat/completions itself.',
  ],
});

export const cherry = guided({
  id: 'cherry-studio',
  name: 'Cherry Studio',
  docs: 'https://docs.cherryai.com.cn/pre-basic/settings/data-settings/storage.md',
  steps: [
    'Settings -> Model Provider -> Add -> type OpenAI, then fill API host + key + model.',
    'Providers live in a SQLite DB plus IndexedDB: a script would desync the running app.',
  ],
});

export const trae = guided({
  id: 'trae',
  name: 'Trae',
  docs: 'https://docs.trae.cn/ide_custom-models',
  steps: ['Settings -> Models -> Add model -> Custom: pick API format, paste base URL, key, model ID.'],
});

export const windsurf = guided({
  id: 'windsurf',
  name: 'Windsurf',
  docs: 'https://windsurf.com',
  steps: [
    'BYOK is limited to models marked BYOK; there is no arbitrary OpenAI-compatible base URL entry.',
    'Nothing to configure here unless Windsurf adds one.',
  ],
});

export const claudeDesktop = guided({
  id: 'claude-desktop',
  name: 'Claude Desktop',
  docs: 'https://support.claude.com/en/articles/18466061-move-claude-code-cli-users',
  steps: [
    'The desktop app ignores ANTHROPIC_BASE_URL and ~/.claude/settings.json.',
    'It uses its own third-party configuration surface and passes it to the Code sessions it starts.',
  ],
});

export const rooCode = {
  id: 'roo-code',
  name: 'Roo Code',
  group: 'ide',
  docs: 'https://roocodeinc.github.io/Roo-Code/features/settings-management/',
  accepts: ['openai-chat', 'anthropic'],
  baseStyle: 'v1',
  writable: 'export',
  note: 'Write the export file, then point roo-cline.autoImportSettingsPath at it.',
  paths: () => [],
  detect: () => true,
  render(ctx) {
    const { resolved, model, provider } = ctx;
    const doc = {
      providerProfiles: {
        currentApiConfigName: 'aac',
        apiConfigs: {
          aac: {
            apiProvider: provider.protocol === 'anthropic' ? 'anthropic' : 'openai',
            openAiBaseUrl: resolved.baseUrl,
            openAiApiKey: resolved.apiKey || '',
            openAiModelId: model.id,
          },
        },
      },
    };
    return {
      files: [],
      warnings: ['Roo Code keeps keys in SecretStorage: we only emit the import file.'],
      guide: [
        'Save this JSON as roo-code-settings.json somewhere stable:',
        JSON.stringify(doc, null, 2),
        'Then add to VS Code settings.json: "roo-cline.autoImportSettingsPath": "<that path>"',
        'Or run the command palette entry "Roo-Code: Import Settings".',
      ],
      artifact: { name: 'roo-code-settings.json', content: JSON.stringify(doc, null, 2) + '\n' },
    };
  },
};

export default [cursor, cline, cherry, trae, windsurf, claudeDesktop];
