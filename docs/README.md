# Documentation

Deeper usage guides for the Route Reader extension. The root
[`README.md`](../README.md) is the quick overview; these pages go into
detail on specific topics.

| Guide | What it covers |
| --- | --- |
| [Getting started](./getting-started.md) | Install the extension, open the sidebar, run Auto-Detect, and understand what appears in the tree. |
| [Frameworks](./frameworks.md) | Per-framework detection rules, code shapes the parser recognises, and shapes it deliberately ignores. |
| [Configuration](./configuration.md) | Every setting, how `include`/`exclude` globs behave, and how Auto-Detect derives its suggestions. |
| [Annotations](./annotations.md) | JSDoc `@description` and `@param` reference with the exact grammar the parser expects. |
| [Troubleshooting](./troubleshooting.md) | Diagnostics, common "why is nothing showing up" causes, and how to read the Output channel. |

Working fixtures for every framework live in [`../examples/`](../examples/) —
open that folder in VS Code to see the tree populate against known-good
inputs.
