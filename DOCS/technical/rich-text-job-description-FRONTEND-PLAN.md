# Rich-Text Job Description — Frontend Implementation Plan

**Goal:** Employer pastes formatted content (tables, bold/italic/underline, aligned
paragraphs) into the job *Description* field at creation/edit time, and the
candidate sees it rendered **exactly** as pasted.

**Status:** Backend done (HTML sanitization on save). Frontend = this plan.

---

## 1. Current state (what exists today)

| Concern | Location | Current behavior |
|---------|----------|------------------|
| Create/Edit input | `apps/job-board-web/src/app/components/common/JobForm.tsx:156` | HeroUI `<Textarea>` — plain text only |
| Candidate view | `apps/job-board-web/src/app/(main)/jobs/[id]/JobDetails.tsx:174` | `{job.description}` inside `<p whitespace-pre-wrap>` — keeps newlines only |
| Employer preview | `apps/job-board-web/src/app/(main)/employee/jobs/[id]/preview/page.tsx` | same flat render |
| Company "About" (related) | `JobDetails.tsx:318` | same flat render (out of scope unless requested) |
| Storage | `description` column = `text` (Drizzle) | now stores sanitized **HTML** |
| Validation | `CreateJobDto.description` `@IsString()` | accepts HTML string |

**Decision made:** store **HTML** (not JSON). Column already `text`, no migration.
Backend sanitizes on save via `sanitizeRichText()` (allowlist) in
`apps/job-service/src/utils/html-sanitizer.ts`.

---

## 2. Library choice

**Editor: TipTap** (`@tiptap/react`, ProseMirror-based).

Why: strong Word/Excel paste-table handling, React-19 compatible, free, modular,
outputs clean HTML. Alternatives (CKEditor heavy/licensed, Quill weak tables,
Lexical more setup) rejected.

**Render sanitizer: `isomorphic-dompurify`** — works in Next.js SSR + client.
(Defense-in-depth; backend already sanitizes, but never render unsanitized HTML.)

**Styling: `@tailwindcss/typography`** (`prose` class) for headings/lists/links,
plus explicit table CSS (Tailwind `prose` does not style table borders by default).

---

## 3. Packages to install

```bash
cd apps/job-board-web
npm i @tiptap/react @tiptap/pm @tiptap/starter-kit \
      @tiptap/extension-underline \
      @tiptap/extension-table @tiptap/extension-table-row \
      @tiptap/extension-table-cell @tiptap/extension-table-header \
      @tiptap/extension-text-align \
      @tiptap/extension-link \
      isomorphic-dompurify
npm i -D @tailwindcss/typography
```

Enable typography plugin in `tailwind.config.*`:
```ts
plugins: [require('@tailwindcss/typography'), /* existing */],
```

---

## 4. New components

### 4.1 `RichTextEditor` (input)
**File:** `apps/job-board-web/src/app/components/common/RichTextEditor.tsx`

Responsibilities:
- Wrap TipTap `useEditor` with StarterKit + Underline + Table(+Row/Cell/Header) +
  TextAlign + Link.
- Props mirror HeroUI field so it drops into RHF `Controller`:
  `value: string`, `onChange: (html: string) => void`, `label`, `placeholder`,
  `isInvalid`, `errorMessage`.
- `editorProps.attributes.class = 'prose max-w-none min-h-[12rem] ...'` so the
  editing surface looks like the candidate view (WYSIWYG parity).
- **Paste cleanup** — strip Word/Excel junk (`mso-*`, `<o:p>`, empty spans) via
  `transformPastedHTML`. Keep tables/bold/italic/underline/alignment.
- Toolbar (light): Bold, Italic, Underline, H2/H3, bullet list, ordered list,
  insert table, link, clear-format. Style buttons to match HeroUI look
  (rounded, `border`, active state highlight).
- Controlled-value sync guard: only `setContent` when incoming `value` differs
  from `editor.getHTML()` to avoid cursor jump / infinite loop.

### 4.2b `htmlToText` (snippet helper)  ← **required, easy-to-miss**
**File:** `apps/job-board-web/src/app/utils/htmlToText.ts`

List/card views show a **truncated plain-text snippet** of the description. Once
`description` is HTML, rendering it raw shows `<p>…</p>` tags, and slicing the
HTML string by char count breaks tags mid-way. Need a strip-to-text helper:

```ts
export function htmlToText(html?: string | null): string {
  if (!html) return '';
  if (typeof window === 'undefined') {
    // SSR: regex strip + decode basic entities
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  }
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}
```
Use it for any `line-clamp` / `slice()` / `.length` snippet. Keep CSS
`line-clamp` for truncation (don't char-slice).

### 4.2 `RichTextView` (output)
**File:** `apps/job-board-web/src/app/components/common/RichTextView.tsx`

```tsx
import DOMPurify from 'isomorphic-dompurify';

export function RichTextView({ html, className }: { html?: string | null; className?: string }) {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return (
    <div
      className={`prose max-w-none prose-table:border prose-td:border prose-td:p-2
                  prose-th:border prose-th:p-2 prose-th:bg-gray-50 ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
```

---

## 5. Wiring changes (exact edits)

### 5.1 JobForm — swap input
`JobForm.tsx` ~line 156, replace the `<Controller name="description">` `<Textarea>`
body with `<RichTextEditor>`:
```tsx
<Controller
  name="description"
  control={control}
  render={({ field }) => (
    <RichTextEditor
      value={field.value ?? ''}
      onChange={field.onChange}
      label="Role Description"
      placeholder="Enter role description"
      isInvalid={!!errors.description}
      errorMessage={errors.description?.message}
      className="lg:col-span-2"
    />
  )}
/>
```

### 5.2 Candidate view — render HTML
`JobDetails.tsx` ~line 171-177, replace:
```tsx
<p className="text-gray-500 ... whitespace-pre-wrap ...">{job?.description}</p>
```
with:
```tsx
<RichTextView html={job?.description} className="text-gray-700" />
```

### 5.3 Employer preview page
`apps/job-board-web/src/app/(main)/employee/jobs/[id]/preview/page.tsx` — render
description through `<RichTextView>` too (preview must match candidate exactly).

### 5.4b Snippet / card / truncated views  ← **was missing, must fix**

Every place that shows a **short preview** of `job.description` must switch to
`htmlToText()` (full rich render only on detail/preview pages). Audited spots:

| File:line | Current | Fix |
|-----------|---------|-----|
| `components/cards/JobCard.tsx:238` | `{job.description}` in `line-clamp-2` | `{htmlToText(job.description)}` (keep line-clamp) |
| `components/home/PopularJobsSection.tsx:25` | `description={job?.description}` → JobCard | strip with `htmlToText` before passing, or strip inside JobCard |
| `(main)/employee/jobs/[id]/preview/page.tsx:340-341` | `job.description.slice(0,400)` + `.length>400` read-more | **breaks HTML mid-tag.** Replace whole block: render full via `<RichTextView>`, or base read-more on `htmlToText(job.description)` length, not raw HTML |

> Search-results job cards reuse `JobCard`, so fixing `JobCard` covers them.
> Re-grep `\.description` in `*.tsx` before sign-off to catch any new snippet
> usages (exclude profile/education/experience/plan/invoice — those are
> different `description` fields, not job description).

### 5.4 (Optional, confirm with client) Company "About"
`JobDetails.tsx:318` — only convert if employer company-description also becomes
rich-text. Needs matching backend sanitization in **user-service** (see §8).

---

## 6. Validation (Yup schema)

Description value is now HTML, so an empty editor returns `"<p></p>"` not `""`.
Update the form schema:
- Treat `<p></p>` / whitespace-only HTML as empty for the `required` check.
- Add a max-length guard on raw HTML (e.g. 20000 chars) to bound payload.

```ts
description: yup.string()
  .test('not-empty', 'Role description is required',
    v => !!v && v.replace(/<[^>]*>/g, '').trim().length > 0)
  .max(20000, 'Description too long'),
```

---

## 7. Design / UX changes

| Area | Change | Effort |
|------|--------|--------|
| Form field | Textarea → editor **with toolbar** (taller, formatting buttons styled to HeroUI) | Medium |
| Editor focus/error states | Mimic HeroUI: red border on `isInvalid`, outside label | Small |
| Candidate description | Flat gray `<p>` → `prose` block (headings, bold, lists visible) | Small |
| Tables | Borders + padding + header shading; **wrap in horizontal-scroll div for mobile** (`overflow-x-auto`) so wide pasted tables don't break layout | Small |
| Text color | desc moves `text-gray-500` → `text-gray-700` for hierarchy | Trivial |
| Card/list snippets | strip HTML → clean plain-text preview (no visible tags) | Small |
| Preview read-more | rebuild on plain-text length, not raw HTML slice | Small |

Not a redesign — localized to description blocks. Main new UI = editor toolbar.

---

## 8. Cross-service note (future)

If company "About"/other free-text fields also go rich-text, replicate the
**backend sanitizer** in the owning service (e.g. `user-service` for company
description). Consider promoting `sanitizeRichText()` into
`@ai-job-portal/common` so all services share one allowlist instead of copies.

---

## 9. Test checklist

- [ ] Paste a Word table → renders with borders on candidate side, identical layout.
- [ ] Paste Excel range → table preserved.
- [ ] Bold / italic / underline / alignment survive save→reload→candidate view.
- [ ] `<script>alert(1)</script>` pasted → stripped (verify via backend + DOMPurify).
- [ ] `<a href="javascript:...">` → neutralized.
- [ ] Empty editor → Yup "required" error fires (`<p></p>` not accepted).
- [ ] Edit existing plain-text job (legacy `description` w/o HTML) → still renders
      fine (plain text is valid HTML body).
- [ ] Mobile: wide table scrolls horizontally, no layout break.
- [ ] Preview page == candidate page rendering.
- [ ] **JobCard / list / search snippet shows clean text — no `<p>`/`<table>` tags.**
- [ ] **Preview read-more truncates cleanly (no broken mid-tag HTML).**
- [ ] Home PopularJobs card snippet clean.

---

## 10. Rollout order

1. Install packages (§3) + enable typography plugin.
2. Build `RichTextView` (output) + `htmlToText` helper — low risk, render-only.
3. Switch candidate view + preview to `RichTextView`; switch all snippet/card
   views (§5.4b) to `htmlToText` (legacy plain text still works in both).
4. Build `RichTextEditor` (input) + toolbar.
5. Swap into `JobForm`, update Yup schema.
6. Run test checklist (§9).
