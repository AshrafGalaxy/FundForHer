git add android/app/google-services.json .gitignore
git commit -m "chore(security): remove google-services.json from tracking"

git add next.config.ts src/app/api/inngest/route.ts
git commit -m "fix(build): add inngest to server external packages and force dynamic"

git add package.json package-lock.json
git commit -m "chore(deps): update inngest SDK to fix vulnerability"

git add src/features/auth/LoginForm.tsx src/features/auth/RegisterForm.tsx
git commit -m "fix(auth): dynamic import capacitor-firebase auth to resolve SSR crashes"

git add src/components/ui/smart-external-link.tsx
git commit -m "feat(ui): add smart external link component with capacitor fallback"

git add src/app/authenticated/scholarship/[id]/ScholarshipDetailsClient.tsx src/app/api/ai/check-odds/ src/components/scholarships/
git commit -m "feat(ai): add Explainable AI rejection predictor Check My Odds"

git add src/app/page.tsx
git commit -m "fix(landing): use firestore aggregation query for accurate stats"

git add src/server/db/scholarship-firestore.ts
git commit -m "fix(jobs): batch expired scholarships update safely and sync to algolia"

git add src/app/authenticated/dashboard/page.tsx
git commit -m "feat(dashboard): filter out expired scholarships from live view"

git add .
git commit -m "chore(android): update capacitor android build settings"

git push
