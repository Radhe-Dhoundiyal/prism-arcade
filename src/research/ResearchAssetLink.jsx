import { availableResearchHref, researchLinkHref, publicEditionAsset } from './assetPolicy.js';

export default function ResearchAssetLink({ href, children, download, ...props }) {
  const available = availableResearchHref(href);
  const edition = publicEditionAsset(href);
  return <a {...props} href={researchLinkHref(href)} download={available ? download : undefined}
    data-source-original={edition?.sourceUrl ?? href} data-source-edition={edition?.url} data-source-availability={available ? 'public-edition' : 'withheld'}>
    {children}{!available && <span className="source-caption"> (publication withheld)</span>}
  </a>;
}
