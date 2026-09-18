# Hackathon Web Client

Frontend dashboard for Hackathon Core built with Next.js 16 (App Router), React 19, Tailwind CSS, and shadcn/ui.

## Adding Components

To add shadcn/ui components, run:

```bash
bun x --bun shadcn@latest add <component>
```

This will place components into the `components/ui/` directory.

## Using Components

Import components directly using the path alias:

```tsx
import { Button } from "@/components/ui/button"
```
