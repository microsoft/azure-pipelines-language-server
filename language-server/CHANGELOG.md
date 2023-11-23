### 0.7.0
- Added support for using expressions as values [#PR-138](https://github.com/microsoft/azure-pipelines-language-server/pull/138)
- Fixed badly-indented files crashing the language server [#PR-141](https://github.com/microsoft/azure-pipelines-language-server/pull/141)

### 0.6.9
- Fixed loops crashing the language server when the first key/value pair had a dynamic expression as the key [#PR-130](https://github.com/microsoft/azure-pipelines-language-server/pull/116)

### 0.6.8
- Updated dependencies

### 0.6.7
- Support emojis [#PR-115](https://github.com/microsoft/azure-pipelines-language-server/pull/116) - thanks @PaulTaykalo!

### 0.6.6
- Fixed property autocomplete adding unnecessary colons [#PR-113](https://github.com/microsoft/azure-pipelines-language-server/pull/113)
- More conditional expression fixes [#PR-114](https://github.com/microsoft/azure-pipelines-language-server/pull/114)

### 0.6.5
- Conditional variable fixes - thanks @50Wliu

### 0.6.4
- Handle dynamic variables - thanks @50Wliu

### 0.6.3
- Add basic support for expressions

### 0.6.2
- Dependency updates

### 0.6.1
- Webpack

### 0.6.0
- Improved debuggability - thanks @50Wliu
- Several security fixes as recommended by dependabot

**🚨 BREAKING CHANGE 🚨**: the internal directory structure has changed a bit in this release (hence the bump from 0.5.x -> 0.6.x).
Where you previously said `path.join('node_modules', 'azure-pipelines-language-server', 'server.js')`, you'll now need to say `path.join('node_modules', 'azure-pipelines-language-server', 'out', 'server.js')`.

### 0.5.10
- Update dependencies for a security issue[#PR-73](https://github.com/microsoft/azure-pipelines-language-server/pull/73)

### 0.5.9
- Consume version 0.5.9 of the language service [#PR-69](https://github.com/Microsoft/azure-pipelines-language-server/pull/69)

### 0.5.4
- Consume version 0.5.4 of the language service [#PR-54](https://github.com/Microsoft/azure-pipelines-language-server/pull/54)

### 0.5.2
- Consume version 0.5.2 of the language service [#PR-48](https://github.com/Microsoft/azure-pipelines-language-server/pull/48)

### 0.4.2
- Improve build/packaging process [#PR-41](https://github.com/Microsoft/azure-pipelines-language-server/pull/41)

### 0.4.1
- Consume version 0.4.1 of the language service [#PR-34](https://github.com/Microsoft/azure-pipelines-language-server/pull/34)

### 0.4.0
- Consume version 0.4.0 of the language service [#PR-27](https://github.com/Microsoft/azure-pipelines-language-server/pull/27)

### 0.2.1
- Update to coveralls@3.0.2 to get rid of [cryptiles vulenerability](https://github.com/hapijs/cryptiles/issues/34)

### 0.2.0
- Split the package into azure-pipelines-language-server and azure-pipelines-language-service to promote reusability [#PR-4](https://github.com/Microsoft/azure-pipelines-language-server/pull/4)

### 0.1.0
- Changed name to reflect fork

### 0.0.15

- Updated formatter to use prettier [#Commit](https://github.com/redhat-developer/yaml-language-server/commit/feb604c35b8fb11747dfcb79a5d8570bf81b8f67)
Fixed dynamic registration of formatter [#74](https://github.com/redhat-developer/yaml-language-server/issues/74)

### 0.0.14

- Bumped to fix jenkins errors

### 0.0.13

- Show errors if schema cannot be grabbed [#73](https://github.com/redhat-developer/yaml-language-server/issues/73)
- The validator should support null values [#72](https://github.com/redhat-developer/yaml-language-server/issues/72)
- Server returning nothing on things such as completion errors Eclipse Che [#66](https://github.com/redhat-developer/yaml-language-server/issues/66)
- Return promises that resolve to null [#PR-71](https://github.com/redhat-developer/yaml-language-server/pull/71)
- Remove unused dependency to deep-equal [#PR-70](https://github.com/redhat-developer/yaml-language-server/pull/70)
- Added custom tags to autocompletion [#Commit](https://github.com/redhat-developer/yaml-language-server/commit/73c244a3efe09ec4250def78068c54af3acaed58)

### 0.0.12

- Support for custom tags [#59](https://github.com/redhat-developer/yaml-language-server/issues/59)
- Incorrect duplicate key registered when using YAML anchors [#82](https://github.com/redhat-developer/vscode-yaml/issues/82)
- Automatically insert colon on autocomplete [#78](https://github.com/redhat-developer/vscode-yaml/issues/78)

### 0.0.11

- Fix for completion helper if it contains \r [#37](https://github.com/redhat-developer/yaml-language-server/issues/37)

### 0.0.10

- Programmatically associate YAML files with schemas by other extensions [#61](https://github.com/redhat-developer/vscode-yaml/issues/61)
- Autocompletion not triggered while typing [#46](https://github.com/redhat-developer/vscode-yaml/issues/46)

### 0.0.9

- Remove console.log from jsonSchemaService [#49](https://github.com/redhat-developer/yaml-language-server/issues/49)
- Change "Property {\$property_name} is not allowed" error message [#42](https://github.com/redhat-developer/yaml-language-server/issues/42)
- New Kubernetes Schema + Updated support for Kubernetes [#40](https://github.com/redhat-developer/yaml-language-server/issues/40)

### 0.0.8

- Added Kedge back in as one of the default schemas
- Added file watch for json schema files in the workspace [#34](https://github.com/redhat-developer/yaml-language-server/issues/34)
- Multi root settings [#50](https://github.com/redhat-developer/vscode-yaml/issues/50)
- Fix for crashing yaml language server when !include is present [#52](https://github.com/redhat-developer/vscode-yaml/issues/52)
- Update tests to work on windows [#30](https://github.com/redhat-developer/yaml-language-server/issues/30)

### 0.0.7

- Added validation toggle in settings [#20](https://github.com/redhat-developer/yaml-language-server/issues/20)
- YAML Schemas are pulled from JSON Schema Store [#15](https://github.com/redhat-developer/yaml-language-server/issues/15)
- YAML Diagnostics throw on a single line instead of the entire file [#19](https://github.com/redhat-developer/yaml-language-server/issues/19)
- Fix for getNodeFromOffset [#18](https://github.com/redhat-developer/yaml-language-server/issues/18)

### 0.0.6

- Hotfix for making multiple schemas in the settings work again

### 0.0.5

- Fixed Schema validation reports errors in valid YAML document [#42](https://github.com/redhat-developer/vscode-yaml/issues/42)
- Fixed Support for multiple YAML documents in single file [#43](https://github.com/redhat-developer/vscode-yaml/issues/43)

### 0.0.4

- Fixed support for kubernetes files
- Fixed boolean notation for validation [#40](https://github.com/redhat-developer/vscode-yaml/issues/40)
- Fixed autocompletion for first new list item [#39](https://github.com/redhat-developer/vscode-yaml/issues/39)

### 0.0.3

- Added new autocompletion service which is better for json schemas
- Added yamlValidation contribution point [#37](https://github.com/redhat-developer/vscode-yaml/issues/37)

### 0.0.1

- Initial release with support for hover, document outlining, validation and auto completion
