import './brand-logo.css';
const source='/brand/jyra-logo-approved.png';
// Viewports display the approved artwork without altering its pixels.
export default function BrandLogo(){return <span className="jy-brand-logo" role="img" aria-label="JYRA"><svg className="jy-brand-full" viewBox="340 125 1490 460" aria-hidden="true" focusable="false"><image href={source} width="2172" height="724"/></svg><svg className="jy-brand-mark" viewBox="340 125 450 460" aria-hidden="true" focusable="false"><image href={source} width="2172" height="724"/></svg></span>;}
