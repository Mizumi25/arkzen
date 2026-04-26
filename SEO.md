# SEO Setup Guide — Arkzen Engine

> **Indexing 101**: You can't rank what Google doesn't know exists. This guide covers getting your pages **indexed**, not ranked.

---

## **What Happens Automatically**

Arkzen generates SEO essentials on every build:

- ✅ **`/sitemap.xml`** — Lists all your pages
- ✅ **`/robots.txt`** — Points crawlers to sitemap
- ✅ **Page structure** — Each tatemono gets its own route (`/portfolio-test`, `/auth-test`, etc.)

---

## **Step 1: Get Sitemap Generated**

### During Engine Development

The sitemap is auto-generated when you rebuild tatemonos:

```bash
node start.js
# [Arkzen Router] ✓ Sitemap generated: engine/frontend/public/sitemap.xml
```

Visit it locally:
```
http://localhost:3000/sitemap.xml
```

### During Export

Each exported project gets its own sitemap:

```bash
node export.js portfolio-test
# [Arkzen Router] ✓ Sitemap generated: projects/portfolio-test/frontend/public/sitemap.xml
```

---

## **Step 2: Submit to Google Search Console**

This is THE critical step. Here's exactly what you do:

### 2.1 Create/Add Property

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **"Add property"** (or select existing if you have one)
3. Choose **"URL prefix"** and enter your domain:
   ```
   https://your-domain.com
   ```
4. Verify ownership (typically via DNS record or HTML file)

### 2.2 Submit Sitemap

1. In left sidebar, go **Sitemaps**
2. Click **"Add/test sitemap"**
3. Enter the sitemap URL:
   ```
   https://your-domain.com/sitemap.xml
   ```
4. Click **Submit**

Google will now crawl and index all pages listed in your sitemap.

---

## **Step 3: Wait 24 Hours**

Google's crawlers need time to:
- Discover your sitemap
- Crawl each page
- Process content
- Add to index

**You'll see progress in Search Console:**
- Dashboard shows "Indexed pages" count (usually increases within 24h)
- Individual pages appear under "Coverage" → "Valid"

---

## **Step 4: Verify Indexing** (Optional)

Once indexed, you can verify with Google search:

```
site:your-domain.com
```

This shows **all pages Google has indexed** from your domain.

Example:
```
site:portfolio.com
# Results: / , /portfolio-test, /portfolio-test/dashboard, etc.
```

---

## **Common Issues & Fixes**

### Pages Not Indexed After 24h?

**Check 1: Sitemap valid?**
```bash
# During dev:
curl http://localhost:3000/sitemap.xml

# In production:
curl https://your-domain.com/sitemap.xml
```

Should return valid XML with `<urlset>` and `<url>` tags.

**Check 2: robots.txt allows indexing?**
```bash
curl https://your-domain.com/robots.txt
```

Should show:
```
User-agent: *
Allow: /
Sitemap: https://your-domain.com/sitemap.xml
```

**Check 3: Pages accessible?**
- No 404 errors on listed URLs
- No `noindex` meta tags
- No login walls before content

**Check 4: Google Search Console**
- Go to "Coverage" tab
- Look for errors (crawl errors, server errors, not found)
- Fix any issues, then request re-crawl

### Force Re-Crawl?

In Google Search Console:
1. Go **Sitemaps**
2. Click your sitemap
3. Click **Request indexing** (blue button)

Google will re-crawl within minutes.

---

## **What Gets Indexed?**

Your Arkzen tatemono pages:

```
✓ https://domain.com/                      (root)
✓ https://domain.com/portfolio-test        (tatemono index)
✓ https://domain.com/portfolio-test/...    (all pages)
✓ https://domain.com/auth-test
✓ https://domain.com/auth-test/login
✓ https://domain.com/auth-test/register
✓ https://domain.com/auth-test/dashboard
(and so on for every tatemono/page)
```

---

## **Best Practices**

| Do ✅ | Don't ❌ |
|------|---------|
| Keep sitemap up-to-date | Hide pages behind login in robots.txt |
| Update sitemap after new pages | Use `noindex` meta tags on purpose |
| Monitor Google Search Console | Ignore crawl errors |
| Use HTTPS in production | Block important pages in robots.txt |
| Fix broken links ASAP | Submit incomplete sitemaps |

---

## **Environment Variable**

If your domain is different from localhost:

```bash
# Set before building
export NEXT_PUBLIC_SITE_URL="https://your-domain.com"

# Or in .env.local
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Sitemap will use this domain instead of `localhost:3000`.

---

## **Timeline Expectations**

| Action | Time |
|--------|------|
| Submit sitemap | Immediate |
| First crawl | 5 min - 1 hour |
| Pages appear in Coverage | 1-24 hours |
| Full indexing | 24-72 hours |
| Search results show up | 1-2 weeks (depends on authority) |

**Remember:** We're talking about **indexing** (appearing in Google), not **ranking** (appearing first in results). Ranking takes weeks/months and requires quality content + backlinks.

---

## **Monitoring Tools**

Once indexed, track performance:

- **Google Search Console** — see which pages are indexed, click counts, impressions
- **Bing Webmaster Tools** — similar to GSC, covers Bing index
- `site:domain.com` search — quick manual check

---

## **Questions?**

This is the foundation. If pages aren't indexed:
1. Check sitemap is valid XML
2. Check robots.txt allows crawling
3. Check pages aren't 404 or behind login
4. Submit manually in Google Search Console
5. Wait 24h

Good luck! 🚀
