const fs = require('fs')
const path = require('path')

function getENV(env) {  
  const envPath = path.resolve(process.cwd(), `env/${env}.json`)
  const envStr = fs.readFileSync(envPath, 'utf-8')
  return JSON.parse(envStr)
}

module.exports = getENV
