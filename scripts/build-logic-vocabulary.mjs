// Run after extracting the pinned archives documented in Scoped-Compilation.md.
import {BASE_LEXICON} from '../src/logic-vocabulary.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('.parser-cache',{recursive:true});await writeFile('.parser-cache/logic-operators.json',JSON.stringify(BASE_LEXICON));
const child=spawnSync('python3',['scripts/build-logic-vocabulary.py',...process.argv.slice(2)],{stdio:'inherit'});process.exitCode=child.status??1;
