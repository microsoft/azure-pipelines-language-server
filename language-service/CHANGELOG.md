#### 0.6.9
- Fixed loops crashing the language server when the first key/value pair had a dynamic expression as the key [#PR-130](https://github.com/microsoft/azure-pipelines-language-server/pull/116)

#### 0.6.8
- Updated dependencies

#### 0.6.7
- Support emojis [#PR-115](https://github.com/microsoft/azure-pipelines-language-server/pull/116) - thanks @PaulTaykalo!

#### 0.6.6
- Fixed property autocomplete adding unnecessary colons [#PR-113](https://github.com/microsoft/azure-pipelines-language-server/pull/113)
- More conditional expression fixes [#PR-114](https://github.com/microsoft/azure-pipelines-language-server/pull/114)

#### 0.6.5
- Conditional variable fixes - thanks @50Wliu

#### 0.6.4
- Handle dynamic variables - thanks @50Wliu

#### 0.6.3
- Add basic support for expressions

#### 0.6.2
- Dependency updates

#### 0.6.1
- Webpack

#### 0.6.0
- Improved debuggability - thanks @50Wliu
- Several security fixes as recommended by dependabot

#### 0.5.10
Update dependencies for a security issue[#PR-72](https://github.com/microsoft/azure-pipelines-language-server/pull/72)

#### 0.5.9
Update dependencies for a security issue[#PR-68](https://github.com/microsoft/azure-pipelines-language-server/pull/68)

#### 0.5.8
Extending language service to make task codelens possible [#PR-66](https://github.com/microsoft/azure-pipelines-language-server/pull/66)
Yaml traversal: export interfaces and return both the start and end positions [#PR-67](https://github.com/microsoft/azure-pipelines-language-server/pull/67/files)

#### 0.5.7
Allow boolean values to validate against string schema [#PR-62](https://github.com/microsoft/azure-pipelines-language-server/pull/62)
Remove consideration of firstProperty schema element when generating errors [#PR-63](https://github.com/microsoft/azure-pipelines-language-server/pull/63)
Improve positioning of unexpected property errors [#PR-64](https://github.com/microsoft/azure-pipelines-language-server/pull/64)

#### 0.5.6
Cache schemas when using a custom schema provider to improve performance [#PR-60](https://github.com/Microsoft/azure-pipelines-language-server/pull/60)
update dependencies for security fixes [#PR-61](https://github.com/Microsoft/azure-pipelines-language-server/pull/61)

#### 0.5.5
Better handling of YAML structure errors [#PR-58](https://github.com/Microsoft/azure-pipelines-language-server/pull/58)
Cache schemas to improve performance [#PR-59](https://github.com/Microsoft/azure-pipelines-language-server/pull/59)

#### 0.5.4
Change schema service to use a schema object instead of a JSON string [#PR-53](https://github.com/Microsoft/azure-pipelines-language-server/pull/53)

#### 0.5.3
Improve performance [#PR-51](https://github.com/Microsoft/azure-pipelines-language-server/pull/51)
Improve error messages and suggestions [#PR-52](https://github.com/Microsoft/azure-pipelines-language-server/pull/52)

#### 0.5.2
Fix a regression with YAML structure errors [#PR-49](https://github.com/Microsoft/azure-pipelines-language-server/pull/49)
Improve performance [#PR-50](https://github.com/Microsoft/azure-pipelines-language-server/pull/50)

#### 0.5.1
version 0.5.0 was not built correctly

#### 0.5.0
Add support for property aliases [#PR-33](https://github.com/Microsoft/azure-pipelines-language-server/pull/33)
Improve auto-complete suggestions [#PR-44](https://github.com/Microsoft/azure-pipelines-language-server/pull/44)
Reject multi-document files [#PR-46](https://github.com/Microsoft/azure-pipelines-language-server/pull/46)

#### 0.4.1
Fix bug where enums that looked like numbers would be marked invalid [#PR-29](https://github.com/Microsoft/azure-pipelines-language-server/pull/29)
do not suggest case insensitive properties when a matching property is present [#PR-28](https://github.com/Microsoft/azure-pipelines-language-server/pull/28)
Allow empty strings to be validated [#PR-30](https://github.com/Microsoft/azure-pipelines-language-server/pull/30)
Fix issue with trailing space when auto-completing [#PR-32](https://github.com/Microsoft/azure-pipelines-language-server/pull/32)

#### 0.4.0
introduce the "ignoreCase" schema option that can be used to turn off case sensitivity for property keys and/or values
    [#PR-22](https://github.com/Microsoft/azure-pipelines-language-server/pull/22)
    [#PR-23](https://github.com/Microsoft/azure-pipelines-language-server/pull/23)
use "firstProperty" to improve validation errors and auto-complete suggestions [#PR-26](https://github.com/Microsoft/azure-pipelines-language-server/pull/26)
Always add colon to the completion text for properties [#PR-25](https://github.com/Microsoft/azure-pipelines-language-server/pull/25)

#### 0.3.0
introduce the "firstProperty" schema option that indicates which property must be listed first in the object [#PR-19](https://github.com/Microsoft/azure-pipelines-language-server/pull/19)

#### 0.2.3
Fix data returned by findDocumentSymbols [#PR-14](https://github.com/Microsoft/azure-pipelines-language-server/pull/14)
Update to coveralls@3.0.2 to get rid of [cryptiles vulenerability](https://github.com/hapijs/cryptiles/issues/34)
Fix the completion suggestions on file with LF line endings [#13](https://github.com/Microsoft/azure-pipelines-language-server/issues/13)

#### 0.2.2
Fix the completion suggestions on empty line bug [#PR-12](https://github.com/Microsoft/azure-pipelines-language-server/pull/12)

#### 0.2.1
Fixes to use consistent types in language-service, added webpack to generate UMD bundle [#PR-9](https://github.com/Microsoft/azure-pipelines-language-server/pull/9)

#### 0.2.0
azure-pipelines-language-service was split from azure-pipelines-language-server to promote reusability [#PR-4](https://github.com/Microsoft/azure-pipelines-language-server/pull/4)
