const { compileFromFile } = require('json-schema-to-typescript');
const path = require('path');
const fs = require('fs');

(async () => {
    const schemas = [
        {
            name: 'eve-api-market-order',
            version: '1.0.0',
        },
    ];

    for (let i = 0, iMax = schemas.length; i < iMax; i++) {
        const schema = schemas[i];
        const schemaPath = path.join(__dirname, '../../../schemas', `${schema.name}`, `${schema.name}-${schema.version}.json`);
        const ts = await compileFromFile(schemaPath, { additionalProperties: false });

        const outputDir = path.join(__dirname, '../src/data-types/generated', `${schema.name}`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(path.join(outputDir, `${schema.name}-${schema.version}.ts`), ts);
    }
})();

// or, compile a JS object
