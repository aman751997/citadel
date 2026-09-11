import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/lessons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    module: z.number(),
    order: z.number(),
    minutes: z.number(),
  }),
});

const dsa = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/dsa-lessons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    minutes: z.number(),
  }),
});

const lld = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/lld-lessons' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    module: z.number(),
    order: z.number(),
    minutes: z.number(),
  }),
});

const war = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/war' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    minutes: z.number(),
  }),
});

// Mastery wing — project dossiers synced from Confluence via scripts/confluence-to-mdx.mjs.
// id = "<project>/<chapter-slug>"; project must match a slug in src/mastery-projects.ts.
const mastery = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/mastery' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    project: z.string(),
    order: z.number(),
    minutes: z.number(),
    source: z.string().url().optional(),
    synced: z.string().optional(),
  }),
});

export const collections = { lessons, dsa, lld, war, mastery };
