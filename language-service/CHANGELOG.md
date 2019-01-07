
#### 0.5.2
Fix a regression with YAML structure errors [#PR-49](https://github.com/Microsoft/azure-pipelines-language-server/pull/49)

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
