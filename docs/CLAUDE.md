# Agentset documentation (powered by Mintlify)

## Project context
- Format: MDX files with YAML frontmatter
- Config: docs.json for navigation, theme, settings
- Components: Mintlify components

## Product context
- Agentset is RAG-as-a-service for developers building AI apps
- Target audience: developers who want to add retrieval-augmented generation to their applications without building the infrastructure themselves

## Content strategy
- Document just enough for user success - not too much, not too little
- Prioritize accuracy and usability
- Make content evergreen when possible
- Search for existing content before adding anything new. Avoid duplication unless it is done for a strategic reason
- Check existing patterns for consistency
- Start by making the smallest reasonable changes

## docs.json
- Refer to the [docs.json schema](https://mintlify.com/docs.json) when building the docs.json file and site navigation

## Frontmatter requirements for pages
- title: Clear, descriptive page title (don't change the page title unless instructed)
- description: Concise summary for SEO/navigation (150-160 characters)

## Writing principles
- **Be concise.** Cut unnecessary words. Users want to achieve a goal, not read prose.
- **Clarity over cleverness.** Use simple, direct language. Avoid jargon and complex sentence structures.
- **Use active voice.** Write "Create a configuration file" instead of "A configuration file should be created."
- **Write in second person.** Address the reader as "you" to make content feel personalized.
- **Make content skimmable.** Use headings to orient structure. Break up text-heavy paragraphs.
- Prerequisites at start of procedural content
- Test all code examples before publishing
- Match style and formatting of existing pages
- Include both basic and advanced use cases
- Language tags on all code blocks
- Alt text on all images
- Relative paths for internal links

## Common mistakes to avoid
- **Inconsistent terminology.** Don't call something an "API key" in one place and "API token" in another.
- **Product-centric language.** Orient language around what users are trying to achieve, not internal product terminology.
- **"Duh" documentation.** Don't state the obvious (e.g., "Click Save to save"). Add value.
- **Colloquialisms.** These hurt clarity, especially for international audiences.

## Content types (Diataxis Framework)

Before writing, identify which content type you're creating:

### Tutorials (Learning-oriented)
- **Goal:** Help users learn through step-by-step instructions
- **Audience:** Beginners with no prior knowledge
- **Approach:**
  - Set expectations of what users will achieve
  - Use clear, incremental steps
  - Minimize choices users need to make
  - Point out milestones ("You will notice that..." or "If this doesn't show, you probably forgot to...")
  - Focus on actions, not theory

### How-To Guides (Problem-oriented)
- **Goal:** Help users perform a specific task
- **Audience:** Users with some prior knowledge
- **Approach:**
  - Write from the user's perspective, not the product's
  - Describe logical sequences without stating the obvious
  - Minimize context beyond what's necessary

### Reference (Information-oriented)
- **Goal:** Provide details about functionality
- **Audience:** Experienced users looking for specifics
- **Approach:**
  - Be scannable and concise
  - Prioritize consistency (tables, naming conventions, API specs)
  - Focus on examples that are easy to copy and modify
  - Avoid explanatory content

### Explanation (Understanding-oriented)
- **Goal:** Deepen understanding of concepts or complex features
- **Audience:** Any level seeking conceptual understanding
- **Approach:**
  - Provide background context (design decisions, technical constraints)
  - Acknowledge opinions and alternatives
  - Draw connections to other product areas or industry concepts

## Know your audience

Each piece of content should target one specific user persona:

- **Technical decision makers** — want architecture overviews and high-level details
- **End users** — may not be technical, looking to get started or complete tasks
- **Developers integrating the product** — need clear, concise instructions

### User research
- Talk directly to users to understand how they describe your product
- Get embedded in support to see pain points caused by documentation gaps
- Incorporate feedback mechanisms (thumbs up/down, text fields)
- Use analytics (page views, search queries, bounce rates) to guide priorities

## Using media

Use screenshots, GIFs, and videos selectively—they require ongoing maintenance.

| Media Type | When to Use | Update Time |
|------------|-------------|-------------|
| Screenshots | Tasks difficult to explain with words; hidden UI elements | ~5 min |
| GIFs | Promotional content; short, complex workflows | ~1 hour |
| Videos | Abstract concepts; long workflows; tutorials | Several hours |

- Media should be supplementary—if text is clear enough, skip the visual
- Always add alt text for images and subtitles/transcripts for videos
- Balance clarity with maintainability (UI changes make visuals outdated quickly)

## Organizing navigation

Navigation serves as a mental model for how users think about your product.

- Avoid overloaded categories (too many top-level sections overwhelm users)
- Don't bury essential content—prioritize frequently accessed information
- Use intuitive section names that match how users naturally think
- Track real user journeys with analytics or session replays
- Test with new team members before they're familiar with the product

## SEO basics
- **Headings:** Use clear H1, H2, H3 structure with relevant keywords
- **Short paragraphs:** Break text into digestible sections with bullet points
- **Internal linking:** Use descriptive anchor text ("Learn more about rate limiting" not "Click here")

## Maintenance

### Prevent documentation rot
- Track stale content (flag docs not updated in X days)
- Detect product changes that affect documentation
- Use linters to enforce standards on every pull request

### Review strategically
- Trigger reviews based on relevance (usage, search demand, product changes), not just time
- Focus extra attention on high-impact pages (top 10 most viewed)
- Empower users to flag issues via feedback mechanisms or pull requests

### Know when to rewrite
- Plan periodic resets every 1-2 years for major cleanup
- Start with a structured audit (support interviews, user feedback)
- Tackle rewrites in focused sprints, prioritizing highest-impact sections

> Wrong documentation is worse than no documentation. If content is completely inaccurate and unfixable short-term, remove it.

## Do not
- Skip frontmatter on any MDX file
- Use absolute URLs for internal links
- Include untested code examples
- Make assumptions - always ask for clarification

---

## Mintlify-specific tooling

### Prerequisites
- Node.js version 19 or higher
- `docs.json` configuration file (delete legacy `mint.json` if present)

### Local development

**Run local preview:**

```bash
# Navigate to docs directory (where docs.json is located)
mintlify dev
```


### Validating links

Check for broken links before publishing:

```bash
mintlify broken-links
```

### CardGroups

Avoid using cardgroups unless they come at the end of the page.