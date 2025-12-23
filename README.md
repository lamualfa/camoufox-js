# camoufox-js

This is the JavaScript client for Camoufox. It is a port of the Python wrapper (doesn't call the original Python scripts).

## Installation

```bash
npm install camoufox-js
```

## Usage 

You can launch Playwright-controlled Camoufox using this package like this:

```javascript
import { Camoufox } from 'camoufox-js';

// you might need to run `npx camoufox-js fetch` to download the browser after installing the package

const browser = await Camoufox({
    // custom camoufox options
});
            
const page = await browser.newPage(); // `page` is a Playwright Page instance
```

### Custom Paths Configuration

You can customize the paths used by Camoufox by providing a `paths` configuration:

```javascript
import { Camoufox, type CamoufoxPaths } from 'camoufox-js';

const customPaths: CamoufoxPaths = {
  installationDirectory: '/custom/install/dir',    // Directory where Camoufox is installed
  dataDirectory: '/custom/data/dir',      // Directory containing local data files
  executableNames: {                       // Executable names for each OS
    win: 'custom.exe',
    mac: '../MacOS/custom',
    lin: 'custom-bin'
  }
};

const browser = await Camoufox({ paths: customPaths });
```

All paths are optional - if not provided, Camoufox will use sensible defaults.

Alternatively, if you want to use additional Playwright launch options, you can launch the Camoufox instance like this:

```javascript
import { launchOptions } from 'camoufox-js';
import { firefox } from 'playwright-core';

// you might need to run `npx camoufox-js fetch` to download the browser after installing the package

const browser = await firefox.launch({
    ...await launchOptions({ /* Camoufox options */ }),
    // other Playwright options, overriding the Camoufox options
});
            
const page = await browser.newPage(); // `page` is a Playwright Page instance
```

### Launching a Camoufox server

Camoufox can be ran as a remote websocket server. It can be accessed from other devices, and languages other than Python supporting the Playwright API.

```javascript
import { launchServer, type CamoufoxPaths } from 'camoufox-js';
import { firefox } from 'playwright-core';

// you might need to run `npx camoufox-js fetch` to download the browser after installing the package

const customPaths: CamoufoxPaths = {
  installationDirectory: '/custom/install/dir'
};

const server = await launchServer({
    port: 8888,
    ws_path: '/camoufox',
    paths: customPaths
});
const browser = await firefox.connect(server.wsEndpoint());

const page = await browser.newPage();

// ...
// Use your browser instance as usual
// ...

await browser.close();
await server.close(); // Close the server when done
```

## More info

See https://camoufox.com/ or https://github.com/daijro/camoufox for more information on Camoufox.


