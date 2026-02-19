# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured yet.

## Architecture

This is a **Next.js 16** app using the **App Router** with **TypeScript**, **Tailwind CSS v4**, and **React 19**.

- `app/layout.tsx` — Root layout with global font and HTML shell
- `app/page.tsx` — Home page (entry point for the app)
- `app/globals.css` — Global styles (Tailwind base)
- `@/*` path alias maps to the project root

Tailwind is configured via PostCSS (`postcss.config.mjs`). TypeScript strict mode is enabled.

## Design

All UI implementation must follow the design system defined in `.claude/design_system.md`. Key rules:

- Use **Tailwind CSS utility classes only** — no custom CSS for colors
- Primary color: `blue-500` / hover: `blue-600` / text on white: `blue-700` or darker
- Text colors: `gray-900` (main), `gray-700` (sub), `gray-600` (caption)
- Border radius: `rounded-lg` (inputs/small buttons), `rounded-xl` (standard buttons), `rounded-2xl` (cards), `rounded-3xl` (modals)
- All interactive elements must have a shadow; hover states must strengthen the shadow
- Minimum touch target: 44px × 44px
- Button text: `font-semibold` or heavier
- Cards: `bg-white border border-gray-300 shadow-md rounded-2xl`
- Transitions: `transition-all duration-200 ease-in-out`
- WCAG 2.1 contrast compliance required (4.5:1 for normal text, 3:1 for large text)
