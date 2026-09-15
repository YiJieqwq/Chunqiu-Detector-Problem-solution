/** Structured build-time model: page -> items -> labelled blocks.
 * Inspired by Yuki's content/component separation. No runtime DOM wrapping.
 * Original Markdown tokens are retained for VitePress anchors/search/code rendering.
 */
export function parseItems(tokens) {
  const heading = (t, level) => t?.type === 'heading_open' && t.tag === `h${level}`
  const boundary = t => t?.type === 'html_block' && /class=["'][^"']*\bcq-(copyright|chapters)\b/.test(t.content)
  const nodes = []
  for (let i = 0; i < tokens.length;) {
    if (!heading(tokens[i], 3)) { nodes.push({ type: 'raw', tokens: [tokens[i++]] }); continue }
    const title = tokens.slice(i, i + 3)
    i += 3
    const blocks = []
    let block = { title: [], tokens: [] }
    while (i < tokens.length && !boundary(tokens[i]) && ![1, 2, 3].some(n => heading(tokens[i], n))) {
      if (heading(tokens[i], 4)) {
        if (block.title.length || block.tokens.length) blocks.push(block)
        block = { title: tokens.slice(i, i + 3), tokens: [] }
        i += 3
      } else block.tokens.push(tokens[i++])
    }
    if (block.title.length || block.tokens.length) blocks.push(block)
    nodes.push({ type: 'item', title, blocks })
  }
  return nodes
}
export default function nativeItems(md) {
  md.core.ruler.push('cq_structured_items', state => {
    const tokens = state.tokens
    const pageTitle = tokens.findIndex(t => t.type === 'heading_open' && t.tag === 'h1')
    const isItems = /^(检测项正文|Detection Items)$/.test(tokens[pageTitle + 1]?.content?.trim() || '')
    const isPrologue = /^(前言|序章|Prologue)$/.test(tokens[pageTitle + 1]?.content?.trim() || '')
    const html = content => {
      const t = new state.Token('html_block', '', 0)
      t.content = content + '\n'; t.block = true
      return t
    }
    const out = []
    for (const node of parseItems(tokens)) {
      if (node.type === 'raw') { out.push(...node.tokens); continue }
      out.push(html(isItems ? '<details class="cq-entry" open><summary class="cq-entry-title">' : '<section class="cq-static-entry">'))
      out.push(...node.title)
      if (isItems) out.push(html('</summary>'))
      out.push(html(isPrologue ? '<div class="cq-prologue-content">' : '<div class="cq-entry-card">'))
      for (const block of node.blocks) {
        out.push(html('<section class="cq-entry-block">'), ...block.title)
        out.push(html('<div class="cq-block-text">'), ...block.tokens, html('</div></section>'))
      }
      out.push(html(isItems ? '</div></details>' : '</div></section>'))
    }
    state.tokens = out
  })
}
