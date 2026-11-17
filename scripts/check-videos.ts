/**
 * Re-verifies every listed video against YouTube's oEmbed endpoint: it must still exist, be
 * embeddable, and be uploaded by the channel recorded in videos/index.json.
 *   npm run data:videos            — report only
 *   npm run data:videos -- --strict — exit non-zero on any problem
 */
import { readFileSync } from 'node:fs';
import { VideosFile } from '../src/types/schemas';
import { dataPath } from './lib';

const strict = process.argv.includes('--strict');
const { videos } = VideosFile.parse(JSON.parse(readFileSync(dataPath('videos/index.json'), 'utf8')));
let problems = 0;

for (const v of videos) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.id}&format=json`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} (removed, private or not embeddable)`);
    const j = (await res.json()) as { author_name?: string; title?: string };
    if (j.author_name !== v.channel) throw new Error(`uploader is now "${j.author_name}", expected "${v.channel}"`);
    if (j.title !== v.title) throw new Error(`title changed to "${j.title}"`);
    console.log(`✓ ${v.id} ${v.title.slice(0, 60)}`);
  } catch (e) {
    problems++;
    console.error(`✗ ${v.id} ${v.title.slice(0, 50)} — ${e instanceof Error ? e.message : e}`);
  }
}
console.log(`${videos.length - problems}/${videos.length} videos verified.`);
if (strict && problems) process.exit(1);
