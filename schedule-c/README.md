# Receipt Jar (Schedule C expenses)

Private, cute expense tracker for three Schedule C businesses: anesthesia, mahjong, dōTERRA.
The owner dislikes spreadsheets: keep the app friendly and never show spreadsheet-style views.
Accountant files (Excel workbook + receipt PDF) are made by Claude in chat on request, not in the app.

- App: https://claude.ai/artifact/XSkeUmL1kPJaEPpdpwRVse (claude.ai Artifact, private to the owner)
- Source: `index.html` (republish to the same URL with the Artifact tool, passing `url`)

## How Claude adds entries from receipt photos

Write one document per receipt to the artifact's database with `ArtifactData`,
collection `expenses`, doc id like `e<yyyymmdd>-<vendor-slug>-<n>`:

| field | type | notes |
|---|---|---|
| date | "YYYY-MM-DD" | receipt date |
| vendor | string | store or payee |
| amount | number | total paid, full amount (meals are halved by the app) |
| business | "anesthesia" \| "mahjong" \| "doterra" | |
| line | string | Schedule C line: 8, 9, 10, 11, 13, 14, 15, 16a, 16b, 17, 18, 19, 20a, 20b, 21, 22, 23, 24a, 24b, 25, 26, 27b, 30, or 36 (Part III purchases for resale) |
| memo | string | what it was for |
| payment | string | card, e.g. "Visa ••1234" |
| miles | number \| null | line 9 only |
| receipt | string | asset id (32 hex) from uploading the photo with `Artifact` `asset: true` |
| needsReview | boolean | true when the business or line is a guess |
| reviewNote | string | why it needs review |
| source | "claude" | |
| addedBy | string | user id of the person who added it in the app (omit for Claude entries) |
| createdAt / updatedAt | ISO timestamp | |

Photos the owner sends in chat land in `/mnt/user-data/uploads`.
