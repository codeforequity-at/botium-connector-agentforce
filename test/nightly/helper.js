module.exports.readCaps = () => {
  let botiumJson
  try {
    botiumJson = require('./botium.json')
  } catch (err) {
  }
  const caps = botiumJson?.botium?.Capabilities || {}
  
  Object.keys(process.env).filter(e => e.startsWith('BOTIUM_')).forEach((element) => {
    const elementToMerge = element.replace(/^BOTIUM_/, '')
    caps[elementToMerge] = process.env[element]
  })

  Object.keys(process.env).filter(e => e.startsWith('AGENTFORCE_')).forEach((element) => {
    const elementToMerge = element.replace(/^AGENTFORCE_/, '')
    caps[elementToMerge] = process.env[element]
  })

  return caps
}
