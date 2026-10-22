// Frontend contract: the CMS publishes sanitized node JSON, never executable HTML.
const tags = new Set(['p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'br', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'img'])
const typography = {
  p: 'margin:0 0 16px;line-height:1.8;word-break:break-word;',
  h2: 'font-size:20px;line-height:1.5;margin:20px 0 12px;',
  h3: 'font-size:17px;line-height:1.6;margin:16px 0 10px;',
  img: 'display:block;max-width:100%;height:auto;margin:12px auto;',
  blockquote: 'margin:12px 0;padding-left:12px;border-left:3px solid #8793b0;',
}
export const emptyContent = () => ({ version: 1, format: 'nodes', nodes: [] })
export const isMediaUrl = value => typeof value === 'string' && /^https:\/\/[^\s<>"'\\]+$/i.test(value)

/** Allowlisted node schema. The backend must also sanitize and authorize media. */
export function normalizeContent(content) {
  if (content == null) return emptyContent()
  if (content.version !== 1 || content.format !== 'nodes' || !Array.isArray(content.nodes)) {
    throw new Error('内容格式暂不支持，请稍后重试')
  }
  let count = 0
  function clean(nodes, depth = 0) {
    if (depth > 16) throw new Error('内容层级过深')
    return nodes.flatMap(node => {
      if (++count > 2000) throw new Error('内容过长')
      if (!node || typeof node !== 'object') return []
      if (node.type === 'text') return typeof node.text === 'string' ? [{ type: 'text', text: node.text }] : []
      if (!tags.has(node.name)) return []
      if (node.name === 'img' && !isMediaUrl(node.attrs?.src)) return []
      const attrs = { style: typography[node.name] || 'word-break:break-word;' }
      if (node.name === 'img') { attrs.src = node.attrs.src; attrs.alt = String(node.attrs.alt || '') }
      return [{ name: node.name, attrs, children: clean(Array.isArray(node.children) ? node.children : [], depth + 1) }]
    })
  }
  return { version: 1, format: 'nodes', nodes: clean(content.nodes) }
}
