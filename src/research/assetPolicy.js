import { PUBLICATION_ASSETS } from './publicationAssets.js';
import editions from './public-editions.json' with { type: 'json' };

export const RESEARCH_ASSET_POLICY = {
  mode: typeof import.meta.env === 'object' ? import.meta.env.VITE_RESEARCH_ASSET_MODE || 'withheld' : 'withheld',
  baseUrl: typeof import.meta.env === 'object' ? import.meta.env.VITE_RESEARCH_ASSET_BASE_URL || '' : '',
};

const editionFiles = new Map(editions.files.map(asset => [asset.url, asset]));
const sourceEditions = new Map(editions.files.map(asset => [asset.sourceUrl, asset]));
export const PUBLIC_RESEARCH_EDITIONS = editions;

export function publicEditionAsset(reference) {
  validateReference(reference);
  const url = reference.split('#')[0];
  return editionFiles.get(url) ?? sourceEditions.get(url) ?? null;
}

export function researchAssetRecord(reference) {
  validateReference(reference);
  return PUBLICATION_ASSETS.assets.find(asset => asset.url === reference.split('#')[0]);
}

function validateReference(reference) {
  if (!/^\/research\/[a-z0-9/_-]+\.(?:pdf|tex|webp)(?:#page=[1-9]\d*)?$/i.test(reference)) throw Error('Invalid research source reference');
}

export function availableResearchHref(reference, policy = RESEARCH_ASSET_POLICY) {
  validateReference(reference);
  if (policy.mode === 'withheld') return null;
  if (policy.mode !== 'public-editions') throw Error('Unknown research availability mode');
  let base = '';
  if (policy.baseUrl) {
    const host = new URL(policy.baseUrl);
    if (host.protocol !== 'https:' || host.username || host.password || host.search || host.hash) throw Error('Research host must be an approved HTTPS base URL');
    base = host.href.replace(/\/$/, '');
  }
  const asset = publicEditionAsset(reference);
  if (!asset) return null;
  const anchor = reference.includes('#') ? '#' + reference.split('#')[1] : '';
  if (anchor && asset.kind !== 'notebook-pdf') throw Error('Page anchors require a notebook PDF');
  return base + asset.url + anchor;
}

export function researchLinkHref(reference, policy = RESEARCH_ASSET_POLICY) {
  return availableResearchHref(reference, policy) ?? '/research/availability.html?source=' + encodeURIComponent(reference);
}
