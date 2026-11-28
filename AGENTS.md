# Husanboy Teacher Official Website (`husanboy-teacher-site`) — Agent Rules

## 1. Live Production URLs & Repositories
- **Primary Live Site**: `https://qosimovxusanboy141-dev.github.io/husanboy-teacher-site/` (deployed from `main` branch).
- **Student Web Cabinet**: `https://qosimovxusanboy141-dev.github.io/husanboy-teacher-site/cabinet/` (synced from `C:\Users\i7\Desktop\Codify-main\dist`).
- **Audio CDN Repos (Read-Only Assets)**:
  - `qosimovxusanboy141-dev/husanboy-kurs-audio-core`
  - `qosimovxusanboy141-dev/husanboy-kurs-audio-sub`

## 2. Protected SEO & Verification Files (NEVER Delete or Overwrite)
- **`google9832dab250e3b8cb.html`** and `<meta name="google-site-verification" content="sO2urjTmA6-KKWd9LxEz38zNi8pJmRuShM8r5Jza-ZA" />` in `index.html` — active Google Search Console ownership verification.
- **`eb8a450husanboy2026f9a1c3d5e7b20.txt`** — active IndexNow key file for instant Bing/Yandex/IndexNow indexing.
- **`sitemap.xml` & `robots.txt`** — whenever adding or renaming pages in `library/`, regenerate `sitemap.xml` (keeping `<image:image>` tags for `teacher-photo.jpg` and `og-banner.png`) and ping IndexNow (`HTTP 200/202`).
- **Structured Data (`application/ld+json`)**:
  - Preserve valid `@graph` JSON-LD on `index.html` (`Person` with Uzbek Latin/Cyrillic/English name variants for Husanboy Qosimov / Хусанбой Косимов, `EducationalOrganization`, `Course`, `WebSite` with `?q=` `SearchAction`, `ItemList`, `FAQPage`) and on all 23 `library/**/*.html` pages (`LearningResource` + `BreadcrumbList`). Always `JSON.parse()` validate every JSON-LD block after edits.

## 3. Design, UX & Security Rules
- Maintain the **Baseline x Lumora** 120 FPS Light/Dark theme aesthetics, mobile responsiveness (`390x844`), and visible 23-book `.footer-catalog` internal links.
- **Web Cabinet Restriction**: `/cabinet/` on the website MUST NOT allow public registration (login + QR login + APK download prompt only).
- Never commit tokens, `.env` files, or temporary deploy scripts containing credentials.
