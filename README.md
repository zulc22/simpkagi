# simpkagi

Simple-HTML interface for Kagi Search designed for retro computing.

Requires a valid account to use; please respect Kagi's Terms of Service while using this application.

## How to use

1. Clone the repository.

2. Populate `config.ini`. Advisory from config.ts:

```
Along the lines of:

[listen]
port = default: 8080
host = default: 0.0.0.0 -- listen on all interfaces

[kagi]
private_link = private session link or token; tokens automatically get clipped out of links

(default values need not be specified.)
```

3. `yarn run start`

4. Test by visiting the site in your browser. (probably http://localhost:8080)
