/**
 * RAG (Retrieval-Augmented Generation) Knowledge Base System
 *
 * Enables AI to search company knowledge bases and generate
 * contextually accurate responses based on retrieved documents.
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    title?: string;
    category?: string;
    createdAt?: Date;
    url?: string;
  };
  embedding?: number[];
}

interface SearchResult {
  document: Document;
  score: number;
}

interface KnowledgeBase {
  id: string;
  name: string;
  documents: Document[];
  userId: string;
  createdAt: Date;
}

export class RAGService {
  private openai: OpenAI;
  private knowledgeBases: Map<string, KnowledgeBase> = new Map();
  private embeddingModel = 'text-embedding-3-small';

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text.slice(0, 8000), // Token limit
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error({ msg: 'Failed to generate embedding', error });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Create a new knowledge base
   */
  async createKnowledgeBase(userId: string, name: string): Promise<KnowledgeBase> {
    const kb: KnowledgeBase = {
      id: `kb_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      documents: [],
      userId,
      createdAt: new Date(),
    };
    this.knowledgeBases.set(kb.id, kb);
    logger.info({ msg: 'Knowledge base created', kbId: kb.id, name });
    return kb;
  }

  /**
   * Add document to knowledge base with automatic embedding
   */
  async addDocument(
    kbId: string,
    content: string,
    metadata: Document['metadata']
  ): Promise<Document> {
    const kb = this.knowledgeBases.get(kbId);
    if (!kb) {
      throw new Error('Knowledge base not found');
    }

    // Split into chunks if content is too long
    const chunks = this.chunkText(content, 1000);
    const documents: Document[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.generateEmbedding(chunks[i]);
      const doc: Document = {
        id: `doc_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
        content: chunks[i],
        metadata: {
          ...metadata,
          title: metadata.title ? `${metadata.title} (Part ${i + 1})` : undefined,
        },
        embedding,
      };
      kb.documents.push(doc);
      documents.push(doc);
    }

    logger.info({ msg: 'Documents added', kbId, count: documents.length });
    return documents[0];
  }

  /**
   * Split text into chunks for processing
   */
  private chunkText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * Search knowledge base using semantic similarity
   */
  async search(kbId: string, query: string, topK: number = 5): Promise<SearchResult[]> {
    const kb = this.knowledgeBases.get(kbId);
    if (!kb) {
      throw new Error('Knowledge base not found');
    }

    const queryEmbedding = await this.generateEmbedding(query);

    const results: SearchResult[] = kb.documents
      .filter(doc => doc.embedding)
      .map(doc => ({
        document: doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    logger.debug({ msg: 'RAG search completed', kbId, query, resultsCount: results.length });
    return results;
  }

  /**
   * Generate response using RAG
   */
  async generateWithRAG(params: {
    kbId: string;
    query: string;
    emailContext?: string;
    systemPrompt?: string;
  }): Promise<{ response: string; sources: Document[] }> {
    const { kbId, query, emailContext, systemPrompt } = params;

    // Search for relevant documents
    const searchResults = await this.search(kbId, query, 5);
    const relevantDocs = searchResults.filter(r => r.score > 0.7);

    // Build context from retrieved documents
    const context = relevantDocs
      .map(r => `[Source: ${r.document.metadata.source}]\n${r.document.content}`)
      .join('\n\n---\n\n');

    // Generate response with context
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt || `You are a helpful email assistant with access to a knowledge base.
Use the provided context to give accurate, relevant responses.
Always cite your sources when using information from the knowledge base.
If the context doesn't contain relevant information, say so and provide general guidance.`,
        },
        {
          role: 'user',
          content: `## Knowledge Base Context:
${context || 'No relevant documents found.'}

${emailContext ? `## Email Context:\n${emailContext}\n` : ''}
## User Query:
${query}

Please provide a helpful response based on the available information.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return {
      response: response.choices[0]?.message?.content || '',
      sources: relevantDocs.map(r => r.document),
    };
  }

  /**
   * Import documents from various sources
   */
  async importFromURL(kbId: string, url: string): Promise<Document> {
    // In production, use a proper web scraper
    const metadata: Document['metadata'] = {
      source: 'web',
      url,
      title: url,
    };

    // Placeholder - in production, fetch and parse the URL
    return this.addDocument(kbId, `Content from ${url}`, metadata);
  }

  /**
   * Import from Notion (placeholder for actual integration)
   */
  async importFromNotion(kbId: string, notionPageId: string, notionToken: string): Promise<Document[]> {
    // In production, use Notion API
    logger.info({ msg: 'Importing from Notion', pageId: notionPageId });

    // Placeholder
    const doc = await this.addDocument(kbId, `Notion content from ${notionPageId}`, {
      source: 'notion',
      title: `Notion Page ${notionPageId}`,
    });

    return [doc];
  }

  /**
   * Get all knowledge bases for a user
   */
  getKnowledgeBases(userId: string): KnowledgeBase[] {
    return Array.from(this.knowledgeBases.values())
      .filter(kb => kb.userId === userId);
  }

  /**
   * Delete knowledge base
   */
  deleteKnowledgeBase(kbId: string): boolean {
    return this.knowledgeBases.delete(kbId);
  }
}

export const ragService = new RAGService();
