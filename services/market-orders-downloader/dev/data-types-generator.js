import { compileFromFile } from 'json-schema-to-typescript';
const path = require('path');
const fs = require('fs');

(async () => {
    const fileNames = ['eve-api-market-order'];

    for (let i = 0, iMax = fileNames.length; i < iMax; i++) {
        const ts = await compileFromFile(path.join(__dirname, '../../../schemas', `${fileNames[i]}.json`), { additionalProperties: false });
        fs.writeFileSync(path.join(__dirname, '../src/data-types', `${fileNames[i]}.ts`), ts);
    }
})();

// or, compile a JS object
