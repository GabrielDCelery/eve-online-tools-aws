export class EnvVariableRetriever {
    validateAndGetEnvVariable = ({ name }: { name: string }): string => {
        const variable = process.env[name];
        if (variable === undefined) {
            throw new Error(`Missing env variable ${name}`);
        }
        return variable;
    };
}
