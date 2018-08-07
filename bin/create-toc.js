const path = require('path')
const globby = require('globby')
const { markdown: md } = require('markdown')
const fs = require('fs-extra')

async function getHeader(file) {
  let source = await fs.readFile(file, 'utf8')
  let tree = md.parse(source)
  for (let i = 1, len = tree.length; i < len; i++) {
    if (tree[i][0] === 'header') return tree[i][2]
  }
  return path.basename(file)
}

// [text, href, children]
async function parse(cwd, tocDir) {
  let mdPaths = await globby('**/*.md', { cwd })
  let headers = {}
  await Promise.all(mdPaths.map(async function (file) {
    let isFolder = false
    do {
      if (headers[file]) return
      headers[file] = {
        link: path.relative(tocDir, path.resolve(cwd, file)),
        level: file.split(path.sep).length,
        isHeader: isFolder
      }
      if (!isFolder) {
        headers[file].text = await getHeader(path.join(cwd, file))
        isFolder = true
      } else {
        headers[file].text = path.basename(file)
      }
      file = path.dirname(file)
    } while (file !== '.')
  }))
  return Object.values(headers)
}

function toMarkdown(tree, limit = 2) {
  return tree.filter(o => !o.isHeader || o.level < 3)
    .sort((a, b) => a.link < b.link ? -1 : 1)
    .map(({isHeader, level, text, link}) => {
      let res = '-'
      if (isHeader && level <= limit) {
        res = '\n' + '#'.repeat(level + 1)
      }
      res += ` [${text}](${link})`
      if (level === 1) res += '\n---'
      return res
    })
    .join('\n')
}

async function main () {
  let tocDir = path.resolve(__dirname, '..')
  let docRoot = path.resolve(__dirname, '../docs')
  let toc = await parse(docRoot, tocDir)
  console.log(toMarkdown(toc))
}

main()
