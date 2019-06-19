import * as assert from 'assert';
import * as yamlparser from '../../src/parser/yamlParser'
import { YAMLTraversal, YamlNodeInfo, YamlNodePropertyValues } from '../../src/services/yamlTraversal';
import { TextDocument, Position } from 'vscode-languageserver-types';

suite("Yaml Traversal Service Tests", function () {
    this.timeout(20000);

    test('Empty file should have no results', async function () {
        const results = await findNodes("", "testnode");
        assert.equal(results.length, 0, "length");
    });

    test('find a node', async function () {
        const results = await findNodes("- testnode: test", "testnode");
        assert.equal(results.length, 1, "length");
        assert.equal(results[0].key, "testnode", "key");
        assert.equal(results[0].value, "test", "value");
        assert.equal(results[0].position.character, 2, "character");
        assert.equal(results[0].position.line, 0, "line");
    });

    test('find a node in the middle of the document', async function () {
        const results = await findNodes("- somecontent: content\n- testnode: test\n- morecontent: content", "testnode");
        assert.equal(results.length, 1, "length");
        assert.equal(results[0].key, "testnode", "key");
        assert.equal(results[0].value, "test", "value");
        assert.equal(results[0].position.character, 2, "character");
        assert.equal(results[0].position.line, 1, "line");
    });

    test('find multiple nodes', async function () {
        const results = await findNodes("- somecontent: content\n- testnode: test\n- morecontent: content\n- testnode: test2\n- testnode: test3", "testnode");
        assert.equal(results.length, 3, "length");
        assert.equal(results[0].key, "testnode", "key0");
        assert.equal(results[0].value, "test", "value0");
        assert.equal(results[0].position.character, 2, "character0");
        assert.equal(results[0].position.line, 1, "line0");
        assert.equal(results[1].key, "testnode", "key1");
        assert.equal(results[1].value, "test2", "value1");
        assert.equal(results[1].position.character, 2, "character1");
        assert.equal(results[1].position.line, 3, "line1");
        assert.equal(results[2].key, "testnode", "key2");
        assert.equal(results[2].value, "test3", "value2");
        assert.equal(results[2].position.character, 2, "character2");
        assert.equal(results[2].position.line, 4, "line2");
    });

    test('realistic example', async function () {
        const results = await findNodes(testYaml(), "task");
        assert.equal(results.length, 4, "length");
        assert.equal(results[0].key, "task", "key0");
        assert.equal(results[0].value, "DotNetCoreCLI@2", "value0");
        assert.equal(results[0].position.character, 8, "character0");
        assert.equal(results[0].position.line, 5, "line0");
        assert.equal(results[1].key, "task", "key1");
        assert.equal(results[1].value, "DotNetCoreCLI@2", "value1");
        assert.equal(results[1].position.character, 8, "character1");
        assert.equal(results[1].position.line, 13, "line1");
        assert.equal(results[2].key, "task", "key2");
        assert.equal(results[2].value, "PublishBuildArtifacts@1", "value2");
        assert.equal(results[2].position.character, 8, "character2");
        assert.equal(results[2].position.line, 19, "line2");
        assert.equal(results[3].key, "task", "key3");
        assert.equal(results[3].value, null);
        assert.equal(results[3].position.character, 8, "character3");
        assert.equal(results[3].position.line, 29, "line3");
    });

    test('get inputs', async function () {
        const results = findInputs(testYaml(), { line: 5, character: 8 });
        assert.equal(Object.keys(results.values).length, 4);
        assert.equal(results.values["command"], "test");
        assert.equal(results.values["projects"], "**/*Test*/*.csproj");
        assert.equal(results.values["arguments"], "--configuration $(BuildConfiguration)");
        assert.equal(results.values["publishTestResults"], true);
    });
    
    test('fail to get inputs', async function () {
      const results = findInputs(testYaml(), { line: 3, character: 2 });
      assert.equal(results.values, null);
  });
});

async function findNodes(content: string, key: string): Promise<YamlNodeInfo[]> {
    const schemaUri: string = "test/pipelinesTests/schema.json";
    const yamlTraversal = new YAMLTraversal(Promise);
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const yamlDoc = yamlparser.parse(content);
    return yamlTraversal.findNodes(textDocument, yamlDoc, key);
}

function findInputs(content: string, position: Position): YamlNodePropertyValues {
    const schemaUri: string = "test/pipelinesTests/schema.json";
    const yamlTraversal = new YAMLTraversal(Promise);
    const textDocument: TextDocument = TextDocument.create(schemaUri, "azure-pipelines", 1, content);
    const yamlDoc = yamlparser.parse(content);
    return yamlTraversal.getNodePropertyValues(textDocument, yamlDoc, position, "inputs");
}

function testYaml(): string {
    return `variables:
      BuildConfiguration: Release
    
    steps:
    
      - task: DotNetCoreCLI@2
        name: Test
        inputs:
          command: test
          projects: "**/*Test*/*.csproj"
          arguments: "--configuration $(BuildConfiguration)"
          publishTestResults: true
    
      - task: DotNetCoreCLI@2
        name: Publish
        inputs:
          command: publish
          arguments: "--configuration $(BuildConfiguration) --output $(Build.ArtifactStagingDirectory)"
    
      - task: PublishBuildArtifacts@1
        name: Artifacts
        inputs:
          PathToPublish: "$(Build.ArtifactStagingDirectory)"
          ArtifactType: Container
          ArtifactName: "drop"

      - script: '- task: fake'

    # incomplete task
      - task:

    #  - task: AzureRmWebAppDeployment@3
    #    name: Deploy
    #    inputs:
    #      ConnectedServiceName: "My Azure Sub"
    #      Package: "$(Build.ArtifactStagingDirectory)/**/*.zip"`
}
