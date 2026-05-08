/**
 * Search Service
 * Handles ElasticSearch operations
 */

import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

let client = null;

/**
 * Connect to ElasticSearch
 */
export async function connectElasticSearch() {
    try {
        const node = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
        // Use auth if provided, otherwise assume local dev instance without auth or API key
        const auth = process.env.ELASTICSEARCH_USERNAME ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD
        } : undefined;

        client = new Client({
            node,
            auth,
            tls: {
                rejectUnauthorized: false // For self-signed certs in dev
            }
        });

        const health = await client.cluster.health();
        console.log(`✅ ElasticSearch connected: ${health.status}`);

        await ensureIndices();

        return client;
    } catch (error) {
        console.error('⚠️ ElasticSearch connection failed:', error.message);
        // Don't throw, just working without ES (fallback to DB search)
        client = null;
        return null;
    }
}

/**
 * Ensure required indices exist with proper mappings
 */
async function ensureIndices() {
    if (!client) return;

    try {
        // Medicines index
        const medicinesExists = await client.indices.exists({ index: 'medicines' });
        if (!medicinesExists) {
            await client.indices.create({
                index: 'medicines',
                body: {
                    mappings: {
                        properties: {
                            name: { type: 'text', analyzer: 'standard' },
                            description: { type: 'text', analyzer: 'standard' },
                            category: { type: 'keyword' },
                            price: { type: 'float' },
                            stock: { type: 'integer' }
                        }
                    }
                }
            });
            console.log('✅ Created medicines index with mappings');
        }

        // Doctors index
        const doctorsExists = await client.indices.exists({ index: 'doctors' });
        if (!doctorsExists) {
            await client.indices.create({
                index: 'doctors',
                body: {
                    mappings: {
                        properties: {
                            name: { type: 'text', analyzer: 'standard' },
                            specialization: { type: 'text', analyzer: 'standard' },
                            about: { type: 'text', analyzer: 'standard' },
                            experience: { type: 'text' },
                            rating: { type: 'float' }
                        }
                    }
                }
            });
            console.log('✅ Created doctors index with mappings');
        }
    } catch (error) {
        console.error('Error creating indices:', error.message);
    }
}

/**
 * Get ES Client
 */
export function getESClient() {
    return client;
}

/**
 * Index a document
 */
export async function indexDocument(index, id, body) {
    if (!client) return;
    try {
        await client.index({
            index,
            id,
            document: body
        });
    } catch (error) {
        console.error(`Error indexing document ${id} to ${index}:`, error.message);
    }
}

/**
 * Search documents with enhanced fuzzy matching and typo tolerance
 */
export async function searchDocuments(index, query, fields = ['name', 'description']) {
    if (!client) return null;

    try {
        const result = await client.search({
            index,
            body: {
                query: {
                    bool: {
                        should: [
                            // Exact match (highest priority)
                            {
                                multi_match: {
                                    query,
                                    fields,
                                    type: 'phrase',
                                    boost: 3.0
                                }
                            },
                            // Fuzzy match with typo tolerance
                            {
                                multi_match: {
                                    query,
                                    fields,
                                    fuzziness: 'AUTO',
                                    prefix_length: 2,
                                    boost: 2.0
                                }
                            },
                            // Partial word match
                            {
                                wildcard: {
                                    '*': `*${query.toLowerCase()}*`
                                }
                            }
                        ],
                        minimum_should_match: 1
                    }
                },
                size: 20 // Limit results
            }
        });

        return result.hits.hits.map(hit => ({
            _id: hit._id,
            _score: hit._score,
            ...hit._source
        }));
    } catch (error) {
        console.error('Search error:', error.message);
        return null;
    }
}
