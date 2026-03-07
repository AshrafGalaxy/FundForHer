import { algoliasearch } from 'algoliasearch';

const appId = process.env.ALGOLIA_APP_ID || '';
const apiKey = process.env.ALGOLIA_ADMIN_KEY || '';

// Initialize only if keys are present so it doesn't crash the server during development
export const algoliaClient = appId && apiKey ? algoliasearch(appId, apiKey) : null;
export const ALGOLIA_INDEX_NAME = 'scholarships_index';
