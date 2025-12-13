import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const LOCK_PATH = path.join(ROOT, 'package-lock.json')
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json')

const OUTPUT_MD = path.join(ROOT, 'THIRD_PARTY_NOTICES.md')
const OUTPUT_JSON = path.join(ROOT, 'third-party-licenses.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function toStringLicense(license) {
  if (!license) return ''
  if (typeof license === 'string') return license.trim()
  return JSON.stringify(license)
}

function normalizeRepo(repo) {
  if (!repo) return ''
  if (typeof repo === 'string') return repo
  if (typeof repo === 'object' && repo.url) return repo.url
  return ''
}

function findLicenseFile(dir) {
  const candidates = [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'LICENCE',
    'LICENCE.md',
    'LICENCE.txt',
    'COPYING',
    'COPYING.md',
    'COPYING.txt'
  ]

  for (const name of candidates) {
    const filePath = path.join(dir, name)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return name
  }
  return ''
}

function mdEscape(text) {
  return String(text).replaceAll('|', '\\|')
}

function buildDirectDepsTable(rootPkg) {
  const out = []
  const groups = [
    ['dependencies', rootPkg.dependencies || {}],
    ['devDependencies', rootPkg.devDependencies || {}]
  ]

  for (const [group, deps] of groups) {
    for (const [name, range] of Object.entries(deps)) {
      const pkgJsonPath = path.join(ROOT, 'node_modules', name, 'package.json')
      let version = ''
      let license = ''
      try {
        const pkg = readJson(pkgJsonPath)
        version = pkg.version || ''
        license = toStringLicense(pkg.license)
      } catch {
        // ignore
      }
      out.push({ group, name, range, version, license })
    }
  }

  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

function main() {
  if (!fs.existsSync(LOCK_PATH)) {
    console.error('Missing package-lock.json; run npm i to generate it.')
    process.exit(1)
  }
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    console.error('Missing package.json')
    process.exit(1)
  }

  const lock = readJson(LOCK_PATH)
  const rootPkg = readJson(PACKAGE_JSON_PATH)
  const lockPackages = lock.packages || {}

  const entries = []
  for (const key of Object.keys(lockPackages)) {
    if (!key.startsWith('node_modules/')) continue

    const pkgDir = path.join(ROOT, key)
    const pkgJsonPath = path.join(pkgDir, 'package.json')
    if (!fs.existsSync(pkgJsonPath)) continue

    try {
      const pkg = readJson(pkgJsonPath)
      const name = pkg.name || key.replace(/^node_modules\//, '')
      const version = pkg.version || lockPackages[key]?.version || ''
      const license = toStringLicense(pkg.license)
      const repository = normalizeRepo(pkg.repository)
      const licenseFile = findLicenseFile(pkgDir)
      entries.push({
        name,
        version,
        license,
        repository,
        licenseFile: licenseFile ? path.posix.join(key, licenseFile) : ''
      })
    } catch {
      // ignore broken package.json
    }
  }

  const uniq = new Map()
  for (const e of entries) {
    const id = `${e.name}@${e.version}`
    if (!uniq.has(id)) uniq.set(id, e)
  }
  const list = [...uniq.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version)
  )

  const licenseCounts = new Map()
  for (const e of list) {
    const key = e.license || '(missing)'
    licenseCounts.set(key, (licenseCounts.get(key) || 0) + 1)
  }

  const countsSorted = [...licenseCounts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0])
  })

  const direct = buildDirectDepsTable(rootPkg)

  const json = {
    generatedBy: 'scripts/generate-third-party-notices.mjs',
    packageName: rootPkg.name || '',
    packageVersion: rootPkg.version || '',
    dependencyCount: list.length,
    licenses: countsSorted.map(([license, count]) => ({ license, count })),
    dependencies: list
  }
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(json, null, 2) + '\n', 'utf8')

  const md = []
  md.push('# Third-Party Notices')
  md.push('')
  md.push(
    'This project uses third-party open-source packages installed via npm. This file lists their declared licenses.'
  )
  md.push('')
  md.push('Regenerate:')
  md.push('')
  md.push('```bash')
  md.push('node scripts/generate-third-party-notices.mjs')
  md.push('```')
  md.push('')

  md.push('## Summary')
  md.push('')
  md.push(`Total unique packages: ${list.length}`)
  md.push('')
  md.push('| License | Count |')
  md.push('|---|---:|')
  for (const [license, count] of countsSorted) {
    md.push(`| ${mdEscape(license)} | ${count} |`)
  }
  md.push('')

  md.push('## Direct Dependencies')
  md.push('')
  md.push('| Group | Package | Range | Installed | License |')
  md.push('|---|---|---|---|---|')
  for (const d of direct) {
    md.push(
      `| ${d.group} | ${mdEscape(d.name)} | ${mdEscape(d.range)} | ${mdEscape(d.version)} | ${mdEscape(d.license)} |`
    )
  }
  md.push('')

  md.push('## Full Dependency List')
  md.push('')
  md.push(
    'For license texts, see each package’s license file under `node_modules/` (when available).'
  )
  md.push('')
  for (const e of list) {
    const lic = e.license || '(missing)'
    const parts = [`- ${e.name}@${e.version} — ${lic}`]
    if (e.repository) parts.push(`(${e.repository})`)
    if (e.licenseFile) parts.push(`[license text: \`${e.licenseFile}\`]`)
    md.push(parts.join(' '))
  }
  md.push('')

  fs.writeFileSync(OUTPUT_MD, md.join('\n'), 'utf8')
}

main()

