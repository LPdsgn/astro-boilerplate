import expressiveCode from 'satteri-expressive-code';
import { ecRenderer } from './config';
import { inlineExpressiveCode } from './inline';

/** Fenced code blocks, rendered with the renderer shared with inline code. */
export const blockExpressiveCode = expressiveCode({ customCreateRenderer: () => ecRenderer });

export { inlineExpressiveCode };
