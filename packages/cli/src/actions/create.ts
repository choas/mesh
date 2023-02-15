import got from 'got';
import prompts from 'prompts';
import { extract } from 'tar';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import {
  resolvePkgManager, setProjectName, tryGitInit,
} from '../helpers';
import { logError, logInfo } from '../utils';

export const create = async (name, options) => {
  const template =
    options.template ??
    (await askUser('What template do you want to use?', [
      { title: 'Starter Project', value: 'starter' },
      { title: 'Multi-Sig Minting', value: 'minting' },
      { title: 'Stake-Pool Website', value: 'staking' },
      { title: 'Cardano Sign-In', value: 'signin' },
      { title: 'E-Commerce Store', value: 'ecommerce' },
    ]));

  const stack =
    options.stack ??
    (await askUser('What Stack do you want to use?', [
      { title: 'Next.js', value: 'next' },
    ]));

  const language =
    options.language ??
    (await askUser('What language do you want to use?', [
      { title: 'TypeScript', value: 'ts' },
    ]));

  console.log('\n');

  try {
    createDirectory(name);

    logInfo('📡 - Downloading files..., This might take a moment.');
    await fetchRepository(template, stack, language);

    logInfo('🏠 - Starting a new git repository...');
    setNameAndCommitChanges(name);

    logInfo('🧶 - Installing project dependencies...');
    installDependencies();
  } catch (error) {
    logError(error);
    process.exit(1);
  }
};

const askUser = async (question, choices) => {
  const response = await prompts(
    {
      type: 'select',
      message: question,
      name: 'selection',
      choices,
    },
    {
      onCancel: () => process.exit(0),
    }
  );

  return response.selection;
};

const createDirectory = (name) => {
  const path = `${process.cwd()}/${name}`;

  if (existsSync(path)) {
    logError(`❗ A directory with name: "${name}" already exists.`);
    process.exit(1);
  }

  if (mkdirSync(path, { recursive: true }) === undefined) {
    logError('❌ Unable to create a project in current directory.');
    process.exit(1);
  }

  logInfo('🏗️ - Creating a new mesh dApp in current directory...');
  process.chdir(path);
};

const fetchRepository = async (template, stack, language) => {
  const pipe = promisify(pipeline);
  const name = `${template}-${stack}-${language}-template`;
  const link = `https://codeload.github.com/MeshJS/${name}/tar.gz/main`;

  await pipe(
    got.stream(link),
    extract(
      { strip: 1 },
      [`${name}-main`]
    )
  );
};

const setNameAndCommitChanges = (name) => {
  try {
    setProjectName(process.cwd(), name);
  } catch (_) {
    logError('🚫 Failed to re-name package.json, continuing...');
  }

  tryGitInit();
};

const installDependencies = () => {
  try {
    const pkgManager = resolvePkgManager();
    execSync(`${pkgManager} install`, { stdio: [0, 1, 2] });
  } catch (_) {
    logError('🚫 Failed to install project dependencies, continuing...');
  }
}
