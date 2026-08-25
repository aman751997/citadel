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

const war = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/war' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    minutes: z.number(),
  }),
});

export const collections = { lessons, dsa, war };
