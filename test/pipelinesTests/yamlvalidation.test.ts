import { Diagnostic } from 'vscode-languageserver-types';
import * as assert from 'assert';
import { ServiceSetup } from '../utils/serviceSetup';
import { ValidationHandler } from '../../src/languageserver/handlers/validationHandlers';
import { SettingsState, TextDocumentTestManager } from '../../src/yamlSettings';
import { setupLanguageService, setupSchemaIDTextDocument } from '../utils/testHelper';

describe('Yaml Validation Service Tests', function () {
  this.timeout(20000);

  const SCHEMA_URI = 'test/pipelinesTests/schema.json';

  let languageSettingsSetup: ServiceSetup;
  let validationHandler: ValidationHandler;
  let yamlSettings: SettingsState;
  before(() => {
    languageSettingsSetup = new ServiceSetup().withValidate();
    const { validationHandler: valHandler, yamlSettings: settings } = setupLanguageService(
      languageSettingsSetup.languageSettings
    );
    validationHandler = valHandler;
    yamlSettings = settings;
  });

  function parseSetup(content: string): Promise<Diagnostic[]> {
    const testTextDocument = setupSchemaIDTextDocument(content, SCHEMA_URI);
    yamlSettings.documents = new TextDocumentTestManager();
    (yamlSettings.documents as TextDocumentTestManager).set(testTextDocument);
    return validationHandler.validateTextDocument(testTextDocument);
  }

  it('validates empty files', async function () {
    const content = '';
    const result = await parseSetup(content);
    assert.equal(result.length, 0);
  });

  it('validates files with emojis', async function () {
    const content = `
steps:
- pwsh: Write-Output 😊
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 0);
  });

  it('rejects multi-document files with only one error', async function () {
    const content = `
---
jobs:
- job: some_job
  invalid_parameter: bad value
  invalid_parameter: duplicate key
  another_invalid_parameter: whatever
===
---
jobs:
- job: some_job
  invalid_parameter: bad value
  invalid_parameter: duplicate key
  another_invalid_parameter: whatever
===
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 1);
    assert.ok(result[0].message.indexOf('single-document') >= 0);
  });

  // In truth, these tests should probably all be rewritten to test parser/yamlParser,
  // not services/yamlValidation.
  it('validates pipelines with expressions', async function () {
    const content = `
steps:
- \${{ if succeeded() }}:
  - task: npmAuthenticate@0
    inputs:
      \${{ if ne(variables['Build.Reason'], 'PullRequest') }}:
        workingFile: .npmrc
      \${{ if eq(variables['Build.Reason'], 'PullRequest') }}:
        workingFile: .other_npmrc
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 0);
  });

  it('validates pipelines with dynamically-generated variables', async function () {
    const content = `
variables:
  \${{ parameters.environment }}Release: true
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 0);
  });

  it('validates pipelines with unfinished conditional variable checks', async function () {
    // Note: the real purpose of this test is to ensure we don't throw,
    // but I can't figure out how to assert that yet.
    // result.length can be whatever, as long as we get to that point :).
    const content = `
variables:
  \${{ if eq(variables['Build.SourceBranch'], 'main') }}:
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 0);
  });

  it('validates pipelines with unfinished conditionally-inserted variables', async function () {
    // Note: the real purpose of this test is to ensure we don't throw,
    // but I can't figure out how to assert that yet.
    // result.length can be whatever, as long as we get to that point :).
    const content = `
variables:
  \${{ if eq(variables['Build.SourceBranch'], 'main') }}:
    j
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 0);
  });

  it('validates pipelines with multiple levels of expression nesting', async function () {
    // Note: the real purpose of this test is to ensure we don't throw,
    // but I can't figure out how to assert that yet.
    // result.length can be whatever, as long as we get to that point :).
    const content = `
steps:
- \${{ each step in parameters.buildSteps }}:
  - \${{ each pair in step }}:
    \${{ if ne(pair.value, 'CmdLine@2') }}:
      \${{ pair.key }}: \${{ pair.value }}
    \${{ if eq(pair.value, 'CmdLine@2') }}:
      '\${{ pair.value }}': error
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 0);
  });

  it('validates pipelines that has an object with a dynamic key and scalar value as the first property', async function () {
    // Note: the real purpose of this test is to ensure we don't throw,
    // but I can't figure out how to assert that yet.
    // result.length can be whatever, as long as we get to that point :).
    const content = `
steps:
- \${{ each shorthand in parameters.taskShorthands }}:
  - \${{ shorthand }}: echo 'Hi'
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 2);
  });

  it('validates incorrectly-indented pipelines that look like they have an array property', async function () {
    // Note: the real purpose of this test is to ensure we don't throw,
    // but I can't figure out how to assert that yet.
    // result.length can be whatever, as long as we get to that point :).
    const content = `
steps:
- task: PowerShellOnTargetMachines@3
  inputs:
    Machines: EXAMPLE
    InlineScript: |
    [System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
    CommunicationProtocol: Http);
`;
    const result = await parseSetup(content);
    assert.equal(result.length, 4);
  });
});
