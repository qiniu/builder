/**
 * @file schema2md
 * @description 用于将描述 build config 的 json schema 文件转换为 markdown 文档
 * @author yaojingtian <yaojingtian@qiniu.com>
 */

import * as path from 'path'
import * as fs from 'fs'

// JSON Schema 的定义
// 这里根据实际情况做了更细化的定义，去掉了一些不太用得着的字段，增加了字段对应关系的限定
type JSONSchema = SimpleTypeJSONSchema | MultiTypeJSONSchema | ObjectJSONSchema | ArrayJSONSchema

type SimpleTypeJSONSchema = {
  type: 'string' | 'number' | 'integer' | 'boolean'
  description?: string
}

type MultiTypeJSONSchema = {
  type: 'null'
  description?: string
  oneOf: Array<JSONSchema>
}

type ObjectJSONSchema = {
  type: 'object'
  description?: string
  properties?: {
    [field: string]: JSONSchema
  }
  patternProperties?: {
    [pattern: string]: JSONSchema
  }
}

type ArrayJSONSchema = {
  type: 'array'
  description?: string
  items: JSONSchema
}

interface IExtraOptions {
  level: number // 层级
  keyPath: string[] // 字段的路径，例如 [a, b, c] 表示 a.b.c
  title?: string // 该层级的标题
}

const TAB_SIZE = 4

function joinLines(...lines: (string | null)[]): string {
  return lines.filter(Boolean).join('\n\n')
}

function getRepeatedText(text: string, times: number, seperator = ''): string {
  return new Array(times).fill(text).join(seperator)
}

function code(text: string) {
  return `\`${text}\``
}

function getTitle(text: string, level: number) {
  const indentLength = level <= 1 ? 0 : (level - 2) * TAB_SIZE
  const titleIndent = getRepeatedText(' ', indentLength)
  const decorator = level <= 1 ? getRepeatedText('#', level+1) : '-'
  return `${titleIndent}${decorator} **${code(text)}**`
}

function getType(text: string | undefined, indent: string) {
  return text ? `${indent}类型：${code(text)}` : null
}

function getDescription(text: string | undefined, indent: string): string | null {
  if (!text) {
    return null
  }

  return text.split('```') // 区分代码块
    .map((part, index) => (
      index % 2
      ? part.replace(/\n/g, `\n${indent}`) // 代码块内部只需要加 indent
      : part.split('\n').map(line => `${indent}${line}`).join('\n\n') // 其他部分需要两个换行 + indent
    )).join('```')
}

// 将 json schema 转为 markdown 格式描述
function schemaToMarkdown(schema: JSONSchema, { level, keyPath, title }: IExtraOptions): string {
  const type = (
    schema.type === 'array'
    ? `${schema.items!.type}[]`
    : schema.type
  )
  const fullField = keyPath.join('.')
  const contentIndent = level <= 1 ? '' : getRepeatedText(' ', (level - 1) * TAB_SIZE)

  const sectionTitle = getTitle(title || fullField, level)
  const sectionType = getType(type, contentIndent)
  const sectionDesc = getDescription(schema.description, contentIndent)

  if (schema.type === 'array') {
    // 若为 array 类型，且数组每一项的类型不为简单类型，则需要递归输出数组项的描述信息(暂时不考虑数组内的项类型不同的情况)
    const childSection = (
      (schema.items!.type === 'array' || schema.items!.type === 'object')
      ? schemaToMarkdown(schema.items!, { level: level + 1, keyPath, title: `${fullField} 数组的 item` })
      : null
    )
    return joinLines(
      sectionTitle,
      sectionType,
      sectionDesc,
      childSection
    )
  }

  // 指定了类型且类型不为 object 或 array
  if (schema.type && schema.type !== 'object') {
    return joinLines(
      sectionTitle,
      sectionType,
      sectionDesc
    )
  }

  // 几种类型之一
  if ((schema as any as MultiTypeJSONSchema).oneOf) {
    return joinLines(
      sectionTitle,
      sectionDesc,
      `${contentIndent}${code(fullField)} 类型为以下几种之一：`,
      ...(schema as any as MultiTypeJSONSchema).oneOf.map(
        typeSchema => schemaToMarkdown(typeSchema, { level: level + 1, keyPath, title: typeSchema.type || '' })
      )
    )
  }

  // 指定字段 或 指定 pattern 字段
  if ((schema as ObjectJSONSchema).properties || (schema as ObjectJSONSchema).patternProperties) {
    const objectSchema = schema as ObjectJSONSchema

    return joinLines(
      sectionTitle,
      sectionType,
      sectionDesc,
      `${contentIndent}${code(title || fullField)} 的字段描述如下：`,
      ...Object.keys(objectSchema.properties || []).map(
        fieldName => schemaToMarkdown(objectSchema.properties![fieldName], { level: level + 1, keyPath: keyPath.concat([fieldName]) })
      ),
      ...Object.keys(objectSchema.patternProperties || []).map(
        pattern => schemaToMarkdown(objectSchema.patternProperties![pattern], { level: level + 1, keyPath: keyPath.concat([`(${pattern})`]) })
      )
    )
  }

  // 无其他信息
  return joinLines(
    sectionTitle,
    sectionType,
    sectionDesc,
  )
}

export default function main() {
  const schema = require('./preset-configs/config.schema.json')
  const markdown = schemaToMarkdown(schema, { level: 0, keyPath: [], title: 'Build Config' })

  const targetPath = path.join(__dirname, './build-config.md')
  console.log('Markdown Output Path: ' + targetPath)

  try {
    fs.writeFileSync(targetPath, markdown)
    console.log('Markdown is generated!')
  } catch(err) {
    console.error('Write markdown failed: ', err)
  }
}

main()
