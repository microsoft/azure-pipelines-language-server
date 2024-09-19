import { CompletionList, Range } from 'vscode-languageserver-types';
import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { caretPosition, SCHEMA_ID, setupLanguageService, setupSchemaIDTextDocument, TestCustomSchemaProvider } from '../utils/testHelper';
import { ServiceSetup } from '../utils/serviceSetup';
import { SettingsState, TextDocumentTestManager } from '../../src/yamlSettings';
import { LanguageService } from '../../src';
import { LanguageHandlers } from '../../src/languageserver/handlers/languageHandlers';

describe("Yaml Completion Service Tests", function () {
  this.timeout(20000);

  let languageSettingsSetup: ServiceSetup;
  let languageService: LanguageService;
  let languageHandler: LanguageHandlers;
  let yamlSettings: SettingsState;
  let schemaProvider: TestCustomSchemaProvider;

  before(() => {
    languageSettingsSetup = new ServiceSetup().withCompletion().withSchemaFileMatch({
      uri: SCHEMA_ID,
      fileMatch: ['azure-pipelines.yaml'],
    });
    const {
      languageService: langService,
      languageHandler: langHandler,
      yamlSettings: settings,
      schemaProvider: testSchemaProvider,
    } = setupLanguageService(languageSettingsSetup.languageSettings);
    languageService = langService;
    languageHandler = langHandler;
    yamlSettings = settings;
    schemaProvider = testSchemaProvider;
  });

  /**
   * Generates a completion list for the given document and caret (cursor) position.
   * @param content The content of the document.
   * @param position The position of the caret in the document.
   * Alternatively, `position` can be omitted if the caret is located in the content using `|` bookends.
   * For example, `content = 'ab|c|d'` places the caret over the `'c'`, at `position = 2`
   * @returns A list of valid completions.
   */
  async function parseSetup(content: string, position: number): Promise<CompletionList> {
    if (typeof position === 'undefined') {
      ({ content, position } = caretPosition(content));
    }

    schemaProvider.addSchema(SCHEMA_ID, JSON.parse(await fs.readFile(path.join(__dirname, 'schema.json'), 'utf8')));

    const testTextDocument = setupSchemaIDTextDocument(content, SCHEMA_ID);
    yamlSettings.documents = new TextDocumentTestManager();
    (yamlSettings.documents as TextDocumentTestManager).set(testTextDocument);
    return languageHandler.completionHandler({
      position: testTextDocument.positionAt(position),
      textDocument: testTextDocument,
    });
  }

  afterEach(() => {
    schemaProvider.deleteSchema(SCHEMA_ID);
    languageService.configure(languageSettingsSetup.languageSettings);
  });

  it('Given empty file completion should give suggestions', async function () {
    const content = '';
    const result = await parseSetup(content, 0);
    const labels = result.items.map(item => item.label);
       assert.equal(labels.filter(l => l === "name").length, 1);
       assert.equal(labels.filter(l => l === "steps").length, 1);
       assert.equal(labels.filter(l => l === "variables").length, 1);
       assert.equal(labels.filter(l => l === "server").length, 0, "obsolete should not be suggested");
    });

  it('Given steps context completion should give suggestions of possible steps', async function () {
    const content = 'steps:\n- ';
    const result = await parseSetup(content, 8);
    assert.equal(result.items.length, 7);
     });

  it('Given an already valid file with task name, autocomplete should still give all suggestions', async function () {
    const content = 'steps:\n- task: npmAuthenticate@0';
    const result = await parseSetup(content, 32);
    assert.ok(result.items.length >= 100);
    });

  it('Given a new file with steps and task, autocomplete should give suggestions', async function () {
    const content = 'steps:\n  - task: ';
    const result = await parseSetup(content, 17);
    assert.ok(result.items.length >= 100);
    });

  it('All completion text for properties should end with `:`', async function () {
    const content = '';
    const result = await parseSetup(content, 0);
    for (const item of result.items) {
      assert.equal(item.textEdit.newText.search(":") > 0, true, "new text should contain `:`");
    }
    });

  it('String properties with a colon should replace up to the colon', async function () {
    const content = 'steps:\n- scrip: ';
    const result = await parseSetup(content, 12);
    const expectedReplacementLength = "scrip".length;
    for (const item of result.items) {
      let actualRange: Range = item.textEdit['range'];
      let actualLength = actualRange.end.character - actualRange.start.character;
      assert.equal(actualLength, expectedReplacementLength);
      assert.ok(!item.insertText.includes(':'));
    }
    });

  it('trailing whitespace does not affect suggestions', async function () {
    const content = 'strategy:\n   ';
    const result = await parseSetup(content, 12);
    assert.equal(result.items.length, 3);
    });

    it('case insensitive matching keys are not suggested', async function() {
        //first make sure that the azureAppServiceManage is still in the schema and has an Action input
      {
        const content = 'steps:\n- task: azureAppServiceManage@0\n  inputs:\n    ';
        const result = await parseSetup(content, 53);
        assert.ok(result.items.length >= 6);
        const labels = result.items.map(item => item.label);
        assert.equal(labels.filter(l => l.toUpperCase() === "Action".toUpperCase()).length, 1);
        }

        //now make sure that it isn't suggested if an off-case version is present
      {
        const content = 'steps: \n- task: azureAppServiceManage @0\n  inputs: \n    ACTION: Restart Azure App Service\n    ';
        const result = await parseSetup(content, 94);
        assert.ok(result.items.length >= 6);
        const labels = result.items.map(item => item.label);
        assert.equal(labels.filter(l => l.toUpperCase() === "Action".toUpperCase()).length, 0);
        }
    });

    it('alias matching keys are not suggested', async function() {
        //first make sure that azureSubscription is still in the schema
      {
        const content = 'steps: \n- task: azureAppServiceManage @0\n  inputs: \n    ACTION: Restart Azure App Service\n    ';
        const result = await parseSetup(content, 94);
        assert.ok(result.items.length >= 6);
        const labels = result.items.map(item => item.label);
        assert.equal(labels.filter(l => l.toUpperCase() === "azureSubscription".toUpperCase()).length, 1);
        }

        //now make sure it is not suggested when an alias is present
      {
        const content = 'steps:\n- task: azureAppServiceManage@0\n  inputs:\n    ConnectedServiceName: some_service\n    ';
        const result = await parseSetup(content, 94);
        assert.ok(result.items.length >= 6);
        const labels = result.items.map(item => item.label);
        assert.equal(labels.filter(l => l.toUpperCase() === "azureSubscription".toUpperCase()).length, 0);
        }
    });

  it('suggests tasks under expressions', async function () {
    const content = `
steps:
- \${{ if succeeded() }}:
  - `;
    const result = await parseSetup(content, 38);
    assert.ok(result.items.length >= 7);
    const labels = result.items.map(item => item.label);
    assert.ok(labels.includes('task'));
    });

  it('suggests properties under expressions', async function () {
    const content = `
steps:
- task: azureAppServiceManage@0
  inputs:
    \${{ if succeeded() }}:
      a`;
    const result = await parseSetup(content, 85);
    assert.ok(result.items.length >= 1);
    const labels = result.items.map(item => item.label);
    assert.ok(labels.includes('azureSubscription'));
    });
});
