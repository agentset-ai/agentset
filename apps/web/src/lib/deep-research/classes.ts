/**
 * Data models for the Deep Research Cookbook
 */

/**
 * Structured representation of a research plan with search queries.
 * Used to parse the LLM's planning output into a structured format
 * that can be easily processed by the research pipeline.
 */
export interface ResearchPlan {
  queries: string[];
}

/**
 * Structured representation of filtered source indices.
 * Used to parse the LLM's source evaluation output into a structured
 * format that identifies which search results should be retained.
 */
export interface SourceList {
  sources: number[];
}

/**
 * Container for an individual search result with its metadata and content.
 * Holds both the original content and the filtered/processed content
 * that's relevant to the research topic.
 */
export class SearchResult {
  id: string;
  metadata?: Record<string, any>;
  content: string;

  constructor(params: {
    id: string;
    metadata?: Record<string, any>;
    content: string;
  }) {
    this.id = params.id;
    this.metadata = params.metadata;
    this.content = params.content;
  }

  /**
   * (For Report Generation and Completeness Evaluation) String representation with title, link and refined content.
   */
  toString(): string {
    return `ID: ${this.id}\nMetadata: ${JSON.stringify(this.metadata)}\nContent: ${this.content.substring(0, 1000)}`;
  }

  /**
   * (For Filtering ONLY) Abbreviated string representation with truncated raw content.
   */
  shortStr(): string {
    return `ID: ${this.id}\nMetadata: ${JSON.stringify(this.metadata)}\nContent: ${this.content.substring(0, 1000)}`;
  }
}

/**
 * Collection of search results with utilities for manipulation and display.
 * Provides methods for combining result sets, deduplication, and
 * different string representations for processing and display.
 */
export class SearchResults {
  results: SearchResult[];

  constructor(results: SearchResult[]) {
    this.results = results;
  }

  /**
   * Detailed string representation of all search results with indices.
   */
  toString(): string {
    return this.results
      .map((result, i) => `[${i + 1}] ${result.toString()}`)
      .join("\n\n");
  }

  /**
   * Combine two SearchResults objects by concatenating their result lists.
   */
  add(other: SearchResults): SearchResults {
    return new SearchResults([...this.results, ...other.results]);
  }

  /**
   * Abbreviated string representation of all search results with indices.
   */
  shortStr(): string {
    return this.results
      .map((result, i) => `[${i + 1}] ${result.shortStr()}`)
      .join("\n\n");
  }

  /**
   * Remove duplicate search results based on ID.
   * Returns a new SearchResults object with unique entries.
   */
  dedup(): SearchResults {
    const seenIds = new Set<string>();
    const uniqueResults: SearchResult[] = [];

    for (const result of this.results) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        uniqueResults.push(result);
      }
    }

    return new SearchResults(uniqueResults);
  }
}

/**
 * Return type for iterative research results containing final search results and used queries.
 */
export interface IterativeResearchResult {
  finalSearchResults: SearchResults;
  queriesUsed: string[];
}

/**
 * Return type for filtered results containing filtered search results and source indices.
 */
export interface FilteredResultsData {
  filteredResults: SearchResults;
  sourceIndices: number[];
}
