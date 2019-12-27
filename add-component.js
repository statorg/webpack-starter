'use strict'

import fs from 'fs'
import path from 'path'
import { createInterface } from 'readline'
const rl = createInterface(process.stdin, process.stdout)

// folder with all blocks
const BLOCKS_DIR = path.join(__dirname, 'src/components')

// //////////////////////////////////////////////////////////////////////////////////////////////////

// default content for files in new block
const fileSources = {
  hbs: `<div is="{blockNameKebab}" inline-template>\n  <div class="{blockNameKebab}"></div>\n</div>`,
  vue: `<script>\nexport default {\n  name: '{blockName}'\n}\n</script>\n\n<style lang="scss">\n.{blockNameKebab} {}\n</style>\n`
}
// const fileSources = {
//   hbs: `<div class="{blockNameKebab}"></div>`,
//   scss: `.{blockNameKebab} {}`,
//   js: `import Vue from 'vue'\n\nexport default function () {\n  /* eslint-disable no-new */\n  new Vue({\n    el: '.{blockNameKebab}',\n    data: {}\n  })\n}\n`
// }

function validateBlockName (blockName) {
  return new Promise((resolve, reject) => {
    const isValid = /^(\d|\w|-)+$/.test(blockName)

    if (isValid) {
      resolve(isValid)
    } else {
      const errMsg = (
        `ERR>>> An incorrect block name '${blockName}'\n` +
				`ERR>>> A block name must include letters, numbers & the minus symbol.`
      )
      reject(errMsg)
    }
  })
}

function directoryExist (blockPath, blockName) {
  return new Promise((resolve, reject) => {
    fs.stat(blockPath, notExist => {
      if (notExist) {
        resolve()
      } else {
        reject(`ERR>>> The block '${blockName}' already exists.`)
      }
    })
  })
}

function createDir (dirPath) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirPath, err => {
      if (err) {
        reject(`ERR>>> Failed to create a folder '${dirPath}'`)
      } else {
        resolve()
      }
    })
  })
}

function createFiles (blocksPath, blockName) {
  const promises = []
  Object.keys(fileSources).forEach(ext => {
    const blockNameKebab = blockName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    const fileSource = fileSources[ext]
      .replace(/{blockName}/g, blockName)
      .replace(/{blockNameKebab}/g, blockNameKebab)
    const filename = `${blockName}.${ext}`
    const filePath = path.join(blocksPath, filename)

    promises.push(
      new Promise((resolve, reject) => {
        fs.writeFile(filePath, fileSource, 'utf8', err => {
          if (err) {
            reject(`ERR>>> Failed to create a file '${filePath}'`)
          } else {
            resolve()
          }
        })
      })
    )
  })

  return Promise.all(promises)
}

function getFiles (blockPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(blockPath, (err, files) => {
      if (err) {
        reject(`ERR>>> Failed to get a file list from a folder '${blockPath}'`)
      } else {
        resolve(files)
      }
    })
  })
}

function printErrorMessage (errText) {
  console.log(errText)
  rl.close()
}

// //////////////////////////////////////////////////////////////////////////

function initMakeBlock (candidateBlockName) {
  const blockNames = candidateBlockName.trim().split(/\s+/)

  const makeBlock = blockName => {
    const blockPath = path.join(BLOCKS_DIR, blockName)

    return validateBlockName(blockName)
      .then(() => directoryExist(blockPath, blockName))
      .then(() => createDir(blockPath))
      .then(() => createFiles(blockPath, blockName))
      .then(() => getFiles(blockPath))
      .then(files => {
        const line = '-'.repeat(48 + blockName.length)
        console.log(line)
        console.log(`The block has just been created in 'src/components/${blockName}'`)
        console.log(line)

        // Displays a list of files created
        files.forEach(file => console.log(file))

        rl.close()
      })
  }

  if (blockNames.length === 1) {
    return makeBlock(blockNames[0])
  }

  const promises = blockNames.map(name => makeBlock(name))
  return Promise.all(promises)
}

// //////////////////////////////////////////////////////////////////////////
//
// Start here
//

// Command line arguments
const blockNameFromCli = process.argv
  .slice(2)
// join all arguments to one string (to simplify the capture user input errors)
  .join(' ')

// If the user pass the name of the block in the command-line options
// that create a block. Otherwise - activates interactive mode
if (blockNameFromCli !== '') {
  initMakeBlock(blockNameFromCli).catch(printErrorMessage)
} else {
  rl.setPrompt('Block(s) name: ')
  rl.prompt()
  rl.on('line', (line) => {
    initMakeBlock(line).catch(printErrorMessage)
  })
}
