# Contributing to Public Grievance Redressal System

Thank you for considering contributing to this project! Here's how you can help.

## Development Setup

### Prerequisites
- Node.js ≥ 18.x
- npm ≥ 9.x
- A [Supabase](https://supabase.com) project (free tier works)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/public-grievance.git
cd public-grievance

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run the development server
npm run dev
```

### Database Setup
Run the SQL files in the `supabase/` directory in the Supabase SQL Editor, in the order listed in the README.

---

## Coding Standards

### TypeScript
- Use strict TypeScript — avoid `any` where possible
- Define interfaces in `src/types/index.ts` for shared types
- Use descriptive variable names and JSDoc comments for complex logic

### React / Next.js
- Use functional components with hooks
- Client components must have `'use client'` directive
- Keep components focused — extract reusable logic into `src/lib/`
- Use `lucide-react` for icons (tree-shakable, consistent)

### Styling
- Use **Tailwind CSS** utility classes exclusively — no custom CSS unless absolutely necessary
- Follow mobile-first responsive design (`sm:`, `md:`, `lg:` breakpoints)
- Use consistent spacing, border-radius, and color tokens

### File Organization
```
src/
├── app/          → Route pages (Next.js App Router)
├── components/   → Reusable UI components
├── lib/          → Utility functions, API clients
└── types/        → TypeScript interfaces & type definitions
```

---

## Pull Request Guidelines

1. **Fork the repo** and create a feature branch from `main`
2. **Keep PRs focused** — one feature or fix per PR
3. **Write clear commit messages** — e.g., `feat: add complaint export`, `fix: SLA calculation for weekends`
4. **Test locally** — ensure `npm run build` passes without errors
5. **Update documentation** if your change affects README or setup steps

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use |
|--------|-----|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no code change |
| `refactor:` | Code restructure, no behavior change |
| `perf:` | Performance improvement |
| `chore:` | Build config, dependencies |

---

## Reporting Issues

- Use GitHub Issues to report bugs or request features
- Include steps to reproduce, expected vs actual behavior, and screenshots where possible
- Tag issues with appropriate labels: `bug`, `enhancement`, `question`

---

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
