# Commit messages

- Follow the [conventional commit message](https://www.conventionalcommits.org/en/v1.0.0/) format.
- Capitalize the first word of the description.
- Prefer explaining WHY over HOW.

Example:

```
fix: Prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are obsolete now.
```
