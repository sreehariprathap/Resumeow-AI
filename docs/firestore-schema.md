# Firestore Schema

## `users` (Collection)
Contains specific user data as subcollections/documents.
- `resumeProfile/data`: Contains `ResumeProfile` type (personal info, education, experience, etc.)
- `templates/data`: Contains custom prompts, resume templates, and cover letter templates
- `settings/data`: User application settings
- `resumes` (Subcollection):
  - ID: `{resumeId}`
  - Fields: `name` (string), `latex` (string), `templateId` (string), `templateLabel` (string), `createdAt` (number), `updatedAt` (number)

## `userProfiles` (Collection)
Stores top-level user account configuration.
- ID: `{uid}`
- Fields: `uid`, `email`, `displayName`, `plan`, `tokensAllocated`, `tokensUsed`, `tokensRemaining`, `isAdmin`, `createdAt`, `lastActiveAt`

## `tokenRequests` (Collection)
Stores requests from users to get more AI tokens.
- ID: Auto-generated
- Fields:
  - `uid` (string): User ID requesting tokens
  - `email` (string): User's email
  - `displayName` (string): User's display name
  - `requestedTokens` (number): Number of tokens requested
  - `reason` (string): User's justification for requesting more tokens
  - `status` (string): `'pending' | 'approved' | 'rejected'`
  - `createdAt` (number): Epoch timestamp
  - `resolvedAt` (number, optional): Epoch timestamp when resolved
  - `resolvedBy` (string, optional): Email of the admin who resolved the request
