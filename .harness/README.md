# `.harness/` — Agent infrastructure

این پوشه زیرساخت agent برای این workspace هست. هر فایل/فولدر اینجا یه نقش داره:

| File / Folder | نقش |
|---|---|
| `HANDOFF.md` | source of truth — plan جاری، تصمیمات، چک‌لیست، design decisions |
| `CONVENTIONS.md` | قوانین همیشگی workspace (resume protocol, manual journal, RTL, ...) |
| `.journal.log` | خط زمانی real-time از تغییرات (auto یا manual) |
| `STATUS.md` (in `docs/`) | خلاصه‌ی backup از HANDOFF |
| `hooks/post-edit-journal.cjs` | script که با Edit/Write یه خط journal می‌نویسه |
| `skills/session-resume/SKILL.md` | skill mavis agent برای resume از HANDOFF |

## Status flow (HANDOFF.md و STATUS.md)
`PENDING` → `IN_PROGRESS` → `DONE`

وقتی تسک تموم شد، status رو در HANDOFF به‌روز کن. Agent بعدی از همون می‌خونه.

## Resume flow (چی می‌شه وقتی session جدید شدی)
1. agent جدید میاد سر کار
2. **اول چیزی**: `HANDOFF.md` رو می‌خونه (اگه status != DONE)
3. `.journal.log` رو browse می‌کنه (recent = چی شده)
4. خلاصه می‌گه → می‌پرسه از کجا ادامه بده → شروع می‌کنه

## Hook ها
دو hook سیستمی ثبت شدن از طریق `mavis hook create`:

- `journal-on-write` — matcher `[Ee]dit$`, priority 30
- `journal-on-write-write` — matcher `[Ww]rite$`, priority 30

هر دو body شون `node 'E:/.../post-edit-journal.cjs'` هست.
در session های تست فعلی trigger نشدن — manual contract در CONVENTIONS.md.

## Skill
- `session-resume` — skill mavis agent (load با `skill` tool یا "ادامه بده" گفتن)

اگه می‌خوای پاکش کنی یا عوضش کنی: `mavis skill delete session-resume --agent mavis` یا فایل `SKILL.md` رو edit کن.
