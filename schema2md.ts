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
  useTitle: boolean //
}

const TAB_SIZE = 2

export function joinStr(...sections: string[]): string {
  return sections.filter(Boolean).join('\n\n')
}

// 将 json schema 转为 markdown 格式描述
export function schemaToMarkdown(title: string, schema: JSONSchema, { level, keyPath, useTitle }: IExtraOptions): string {
  const indentLength = level <= 1 ? 0 : (level - 2) * TAB_SIZE
  const indent = level <= 1 ? '' : new Array(indentLength + TAB_SIZE * 2).fill(' ').join('')
  const decorator = `${new Array(indentLength).fill(' ').join('')}${level <= 1 ? new Array(level+1).fill('#').join('') : '-'}`

  const type = (
    schema.type === 'array'
    ? `${schema.items!.type}[]`
    : schema.type
  )
  const fullField = keyPath.join('.').replace(/`/g, '') || title
  const description = `${(schema.description || '').replace(/\\\"/g, "\"")}`

  const sectionTitle = `${decorator} **\`${useTitle ? title : fullField}\`**`
  const sectionType = `${indent}类型：${type}`
  const sectionDesc = description.split('\r\n').map(line => `${indent}${line}`).join('\n\n')

  if (schema.type === 'array') {
    // 若为 array 类型，且数组每一项的类型不为简单类型，则需要递归输出数组项的描述信息(暂时不考虑数组内的项类型不同的情况)
    const childSection = (
      (schema.items!.type === 'array' || schema.items!.type === 'object')
      ? schemaToMarkdown(`${fullField} 数组的 item`, schema.items!, { level: level + 1, useTitle: true, keyPath })
      : null as any
    )
    return joinStr(
      sectionTitle,
      sectionType,
      sectionDesc,
      childSection
    )
  }

  // 指定了类型且类型不为 object 或 array
  if (schema.type && schema.type !== 'object') {
    return joinStr(
      sectionTitle,
      sectionType,
      sectionDesc
    )
  }

  // 几种类型之一
  if ((schema as MultiTypeJSONSchema).oneOf) {
    return joinStr(
      sectionTitle,
      `${indent}\`${fullField}\` 类型为以下几种之一：`,
      ...(schema as MultiTypeJSONSchema).oneOf.map(
        typeSchema => schemaToMarkdown(`${typeSchema.type || ''}`, typeSchema, { level: level + 1, useTitle: true, keyPath })
      )
    )
  }

  // 指定字段 或 指定 pattern 字段
  if ((schema as ObjectJSONSchema).properties || (schema as ObjectJSONSchema).patternProperties) {
    const objectSchema = schema as ObjectJSONSchema

    return joinStr(
      sectionTitle,
      sectionType,
      sectionDesc,
      `${indent}\`${fullField}\` 的字段描述如下：`,
      ...Object.keys(objectSchema.properties || []).map(
        fieldName => schemaToMarkdown('', objectSchema.properties[fieldName], { level: level + 1, useTitle: false, keyPath: keyPath.concat([fieldName]) })
      ),
      ...Object.keys(objectSchema.patternProperties || []).map(
        pattern => schemaToMarkdown('', objectSchema.patternProperties[pattern], { level: level + 1, useTitle: false, keyPath: keyPath.concat([`(${pattern})`]) })
      )
    )
  }

  // 无其他信息
  return joinStr(
    sectionTitle,
    sectionType,
    sectionDesc,
  )
}

export default function main() {
  const schemaPath = path.join(__dirname, '../preset-configs/config.schema.json')
  console.log('schema path: ' + schemaPath)
  const schema = require(schemaPath)
  const markdown = schemaToMarkdown('Build Config', schema, { level: 0, useTitle: true, keyPath: [] })
  const arr = []
  for (var i = 0, j = markdown.length; i < j; ++i) {
    arr.push(markdown.charCodeAt(i))
  }

  const targetPath = path.join(__dirname, '../build-config.md')
  console.log('Markdown Output Path: ' + targetPath)

  try {
    fs.writeFileSync(targetPath, markdown)
    console.log('Markdown is generated!')
  } catch {
    console.error('Write markdown failed.')
  }
}

main()
