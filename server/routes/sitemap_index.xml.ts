// WordPress/Yoast used /sitemap_index.xml — keep the old URL answering with the same URL set.
export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=900')
  return await buildSitemapXml()
})
