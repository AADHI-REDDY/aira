import { describe, expect, it } from 'vitest';
import { detectLanguage } from '../services/language/detectLanguage.js';
import { matchSkill } from '../services/skills/assistantSkills.js';
import { executeTool, groqToolSchemas } from '../services/assistant/toolRegistry.js';
import { getSpeechRecognitionLang, getLanguageLabel } from '../constants/languages.js';
import {
  classifyIntent,
  isFollowUp,
  resolveFollowUp,
  sessionPatchFromTurn,
  splitTasks,
} from '../services/assistant/intentService.js';
import { extractCity, extractEntity } from '../services/assistant/contextService.js';
import { asksCurrentLocation, namedPlaceInQuery, wantsDeviceLocation, weatherQuery } from '../services/tools/weather.js';
import { searchQuery } from '../services/tools/webSearch.js';

describe('language detection', () => {
  it('detects Telugu script', () => {
    const result = detectLanguage('నమస్తే వాతావరణం ఎలా ఉంది');
    expect(result.id).toBe('te');
    expect(result.script).toBe('Telugu');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('returns low confidence for empty text', () => {
    const result = detectLanguage('');
    expect(result.confidence).toBe(0);
    expect(result.reason).toBe('empty');
  });
});

describe('BCP-47 mapping', () => {
  it('maps Telugu recognition to te-IN', () => {
    expect(getSpeechRecognitionLang('te')).toBe('te-IN');
    expect(getLanguageLabel('ta')).toBe('Tamil');
  });
});

describe('local skills', () => {
  it('calculates times expressions', () => {
    const skill = matchSkill('What is 48 times 25?');
    expect(skill.type).toBe('calc');
    expect(skill.reply).toContain('1200');
  });

  it('parses a timer', () => {
    const skill = matchSkill('Set a timer for 1 minute');
    expect(skill.type).toBe('timer');
    expect(skill.ms).toBe(60000);
  });
});

describe('follow-up context', () => {
  it('resolves tomorrow to the previous weather city', () => {
    const resolved = resolveFollowUp('What about tomorrow?', {
      topic: 'weather',
      city: 'Vijayawada',
    });
    expect(resolved.toLowerCase()).toContain('weather');
    expect(resolved.toLowerCase()).toContain('tomorrow');
    expect(resolved.toLowerCase()).toContain('vijayawada');
  });

  it('resolves make-it to a timer length', () => {
    const resolved = resolveFollowUp('Make it 20 minutes', { topic: 'timer' });
    expect(resolved.toLowerCase()).toContain('timer');
    expect(resolved).toMatch(/20/);
    const skill = matchSkill(resolved, { topic: 'timer' });
    expect(skill.type).toBe('timer');
    expect(skill.ms).toBe(20 * 60 * 1000);
  });

  it('attaches a person entity to pronoun follow-ups', () => {
    const resolved = resolveFollowUp('How old is he?', {
      topic: 'search',
      entity: 'the current president of India',
    });
    expect(resolved.toLowerCase()).toContain('president');
  });

  it('splits weather plus reminder', () => {
    const parts = splitTasks("What's the weather tomorrow and remind me at 8");
    expect(parts.length).toBe(2);
    expect(classifyIntent(parts[1]).name).toBe('reminder');
  });

  it('keeps language, location, and person context separate', () => {
    const weatherSession = { topic: 'weather', city: 'Vijayawada' };

    expect(extractCity("What's the weather in Vijayawada?")).toBe('Vijayawada');
    expect(resolveFollowUp('What about tomorrow?', weatherSession).toLowerCase()).toContain('vijayawada');

    expect(extractEntity('He is the President of India').toLowerCase()).toContain('president');
    expect(classifyIntent('He is the President of India', weatherSession).name).toBe('search');

    expect(isFollowUp('Speak in Telugu', weatherSession)).toBe(false);
    expect(resolveFollowUp('Speak in Telugu', weatherSession)).toBe('Speak in Telugu');
    expect(classifyIntent('Speak in Telugu', weatherSession)).toMatchObject({
      name: 'language',
      languageId: 'te',
    });
    expect(weatherQuery('Speak in Telugu', [])).toBe(false);
    expect(namedPlaceInQuery('Speak in Telugu')).toBe('');
    expect(namedPlaceInQuery('What is the weather in Telugu?')).toBe('');
    expect(extractCity('Speak in Hindi')).toBe('');
    expect(extractCity('Reply in Tamil')).toBe('');
    expect(extractCity('Talk in Hinglish')).toBe('');
    expect(extractCity('Use Tanglish')).toBe('');
    expect(extractCity('Speak in English')).toBe('');

    const skill = matchSkill('Speak in Telugu');
    expect(skill).toMatchObject({ type: 'speech', languageId: 'te' });
    const patch = sessionPatchFromTurn('Speak in Telugu', classifyIntent('Speak in Telugu'), skill);
    expect(patch.city).toBeUndefined();
    expect(patch.topic).toBeUndefined();
    expect(patch.responseLanguageId).toBe('te');

    const resolved = resolveFollowUp('How old is he?', {
      topic: 'search',
      entity: 'the President of India',
    });
    expect(resolved.toLowerCase()).toContain('president');
  });

  it('uses GPS intent for where I am now instead of weather or search', () => {
    const weatherSession = { topic: 'weather', city: 'Vijayawada' };
    expect(asksCurrentLocation('where i am now')).toBe(true);
    expect(asksCurrentLocation('Where am I?')).toBe(true);
    expect(asksCurrentLocation('Will it rain near me tomorrow?')).toBe(false);
    expect(classifyIntent('where i am now', weatherSession).name).toBe('location');
    expect(isFollowUp('where i am now', weatherSession)).toBe(false);
    expect(resolveFollowUp('where i am now', weatherSession)).toBe('where i am now');
    expect(searchQuery('where i am now')).toBe(false);
    expect(weatherQuery('where i am now')).toBe(false);
    expect(namedPlaceInQuery('where i am now')).toBe('');
    expect(wantsDeviceLocation('where i am now')).toBe(true);
    expect(wantsDeviceLocation('Will it rain near me tomorrow?')).toBe(true);
    expect(namedPlaceInQuery('Will it rain near me tomorrow?')).toBe('');
  });
});

describe('tool registry', () => {
  it('exposes Groq schemas', () => {
    const names = groqToolSchemas().map((item) => item.function.name);
    expect(names).toContain('get_weather');
    expect(names).toContain('web_search');
    expect(names).toContain('calculate');
  });

  it('runs calculate locally', async () => {
    const result = await executeTool('calculate', { expression: '12 * 4' });
    expect(result).toContain('48');
  });
});
