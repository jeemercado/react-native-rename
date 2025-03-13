#!/usr/bin/env node
import { program } from 'commander';

import pjson from '../package.json';
import {
  bundleIDToPath,
  checkGitRepoStatus,
  checkPackageUpdate,
  cleanBuilds,
  getAndroidCurrentBundleID,
  getAndroidCurrentName,
  getIosCurrentName,
  getIosXcodeProjectPathName,
  gitStageChanges,
  renameAndroidBundleIDFolders,
  renameIosFoldersAndFiles,
  showSuccessMessages,
  updateAndroidFilesContent,
  updateAndroidFilesContentBundleID,
  updateAndroidNameInStringsXml,
  updateIosFilesContent,
  updateIosNameInInfoPlist,
  updateOtherFilesContent,
  validateCreation,
  validateGitRepo,
  validateNewBundleID,
  validateNewName,
  validateNewPathContentStr,
} from './utils';

program
  .name(pjson.name)
  .description(pjson.description)
  .version(pjson.version)
  .arguments('[newName]')
  .option(
    '-b, --bundleID [value]',
    'Set custom bundle identifier for both ios and android eg. "com.example.app" or "com.example".'
  )
  .option('--iosBundleID [value]', 'Set custom bundle identifier specifically for ios')
  .option('--androidBundleID [value]', 'Set custom bundle identifier specifically for android')
  .option(
    '-p, --pathContentStr [value]',
    `Path and content string that can be used in replacing folders, files and their content. Make sure it doesn't include any special characters.`
  )
  .option('--skipGitStatusCheck', 'Skip git repo status check')
  .option(
    '-e, --exclude [value]',
    'Comma-separated list of filenames to exclude from renaming operations'
  )
  .action(async newName => {
    validateCreation();
    validateGitRepo();

    const options = program.opts();

    if (!options.skipGitStatusCheck) {
      checkGitRepoStatus();
    }

    validateNewName(newName, options);

    const pathContentStr = options.pathContentStr;
    const newBundleID = options.bundleID;
    const newIosBundleID = options.iosBundleID;
    const newAndroidBundleID = options.androidBundleID;
    const excludeList = options.exclude ? options.exclude.split(',').map(item => item.trim()) : [];

    if (pathContentStr) {
      validateNewPathContentStr(pathContentStr);
    }

    if (newBundleID) {
      validateNewBundleID(newBundleID, ['ios', 'android']);
    }

    if (newIosBundleID) {
      validateNewBundleID(newIosBundleID, ['ios']);
    }

    if (newAndroidBundleID) {
      validateNewBundleID(newAndroidBundleID, ['android']);
    }

    const currentAndroidName = getAndroidCurrentName();
    const currentIosName = getIosCurrentName();
    const currentPathContentStr = getIosXcodeProjectPathName();
    const newPathContentStr = pathContentStr || newName;
    const currentAndroidBundleID = getAndroidCurrentBundleID();

    await renameIosFoldersAndFiles(newPathContentStr, excludeList);
    await updateIosFilesContent({
      currentName: currentIosName,
      newName,
      currentPathContentStr,
      newPathContentStr,
      newBundleID: newIosBundleID || newBundleID,
      excludeList,
    });

    await updateIosNameInInfoPlist(newName, excludeList);

    if (newAndroidBundleID || newBundleID) {
      await renameAndroidBundleIDFolders({
        currentBundleIDAsPath: bundleIDToPath(currentAndroidBundleID),
        newBundleIDAsPath: bundleIDToPath(newAndroidBundleID || newBundleID),
        excludeList,
      });
    }

    await updateAndroidFilesContent({
      currentName: currentAndroidName,
      newName,
      newBundleIDAsPath: bundleIDToPath(
        newAndroidBundleID || newBundleID || currentAndroidBundleID
      ),
      excludeList,
    });

    if (newAndroidBundleID || newBundleID) {
      await updateAndroidFilesContentBundleID({
        currentBundleID: currentAndroidBundleID,
        newBundleID: newAndroidBundleID || newBundleID,
        currentBundleIDAsPath: bundleIDToPath(currentAndroidBundleID),
        newBundleIDAsPath: bundleIDToPath(newAndroidBundleID || newBundleID),
        excludeList,
      });
    }

    await updateAndroidNameInStringsXml(newName, excludeList);
    await updateOtherFilesContent({
      newName,
      currentPathContentStr,
      newPathContentStr,
      currentIosName,
      newAndroidBundleID: newAndroidBundleID || newBundleID,
      newIosBundleID: newIosBundleID || newBundleID,
      excludeList,
    });

    cleanBuilds();
    showSuccessMessages(newName);
    gitStageChanges();
    checkPackageUpdate();
  });

// If no arguments are passed, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit();
}

program.parseAsync(process.argv);
