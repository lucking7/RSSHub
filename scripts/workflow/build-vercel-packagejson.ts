import packageJson from '../../package.json';
import fs from 'node:fs';

packageJson.name = 'rsshub-vercel';
// @ts-ignore
delete packageJson.scripts;
// @ts-ignore
delete packageJson.main;
// @ts-ignore
delete packageJson.files;
// @ts-ignore
delete packageJson['lint-staged'];

// Ensure the directory exists
if (!fs.existsSync('rsshub-vercel')) {
    fs.mkdirSync('rsshub-vercel', { recursive: true });
}

fs.writeFileSync('rsshub-vercel/package.json', JSON.stringify(packageJson, null, 4));
