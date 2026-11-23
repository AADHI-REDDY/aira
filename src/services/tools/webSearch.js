import { ddgBase, googleApiBase, tavilyBase, wikiBase } from './endpoints.js';
import { asksCurrentLocation, weatherQuery } from './weather.js';

const SMALL_TALK = /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|please|hmm|wow|how are you|what's up|good morning|good night)[\s!.]*$/i;
const LOCAL_ONLY = /\b(summarize this (chat|conversation)|translate my last|who are you|what is your name|your name)\b/i;
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'is', 'are', 'was', 'were', 'does', 'do', 'did', 'have', 'has', 'about', 'tell', 'me', 'please', 'what', 'where', 'who', 'when', 'why', 'how', 'today', 'there']);

export function searchQuery(text, history = []) {
  const t = (text || '').trim();
  if (!t || SMALL_TALK.test(t)) return false;
  if (asksCurrentLocation(t) || weatherQuery(t, history)) return false;
  if (LOCAL_ONLY.test(t)) return false;
  if (/\b(date|time)\b/i.test(t) && t.split(/\s+/).length <= 8 && !/\b(founded|born|released|established)\b/i.test(t)) {
    return false;
  }
  if (t.split(/\s+/).length >= 3) return true;
  return /[?]/.test(t);
}

function searchTerms(text) {
  return (text || '')
    .replace(/^(please\s+)?(search(?:\s+for)?|google|look up|lookup|find(?:\s+out)?|tell me about|tell me)\s+/i, '')
    .replace(/[?!.]+$/g, '')
    .trim();
}

function wikiRelevant(query, wiki) {
  if (!wiki) return false;
  const tokens = (query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u0dff\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && (token.length > 2 || /^[a-z]{2}$/i.test(token)) && !STOP.has(token));
  if (!tokens.length) return true;
  const hay = `${wiki.title} ${wiki.description} ${wiki.extract}`.toLowerCase();
  const hits = tokens.filter((token) => hay.includes(token));
  return hits.length >= Math.min(2, tokens.length) || hay.includes(tokens[0]);
}

function compactNotes(search) {
  const lines = [];
  if (search.wiki) {
    lines.push(`WIKIPEDIA (${search.wiki.title}): ${search.wiki.extract}`);
    if (search.wiki.description) lines.push(`WIKIPEDIA SHORT: ${search.wiki.description}`);
  }
  if (search.answer && !search.wiki) {
    lines.push(`SEARCH ANSWER: ${search.answer}`);
  } else if (search.answer && search.wiki) {
    lines.push(`WEB NOTES (ignore if they contradict Wikipedia): ${search.answer}`);
  }
  (search.results || []).slice(0, 5).forEach((item, index) => {
    const snippet = (item.snippet || '').replace(/\s+/g, ' ').slice(0, 280);
    lines.push(`${index + 1}. ${item.title} — ${snippet}`);
  });
  return lines.join('\n');
}

async function fetchWikipedia(query) {
  const searchUrl = `${wikiBase()}/w/api.php?${new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '1',
    format: 'json',
    origin: '*',
  }).toString()}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const title = searchData?.query?.search?.[0]?.title;
  if (!title) return null;

  const summaryUrl = `${wikiBase()}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) return null;
  const summary = await summaryRes.json();
  const extract = (summary.extract || '').trim();
  if (!extract) return null;
  return {
    title: summary.title || title,
    description: summary.description || '',
    extract,
    url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

async function searchTavily(query, apiKey) {
  const response = await fetch(`${tavilyBase()}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      search_depth: 'advanced',
      include_answer: true,
    }),
  });
  if (!response.ok) throw new Error(`Tavily failed (${response.status})`);
  const data = await response.json();
  const results = (data.results || []).slice(0, 5).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.content,
  }));
  return { ok: true, source: 'Tavily', answer: data.answer || '', results };
}

async function searchGoogleCse(query, key, cx) {
  const url = `${googleApiBase()}/customsearch/v1?${new URLSearchParams({
    key,
    cx,
    q: query,
    num: '5',
  }).toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google CSE failed (${response.status})`);
  const data = await response.json();
  const results = (data.items || []).slice(0, 5).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
  }));
  return { ok: true, source: 'Google Custom Search', answer: '', results };
}

async function searchDuckDuckGo(query) {
  const url = `${ddgBase()}/?${new URLSearchParams({
    q: query,
    format: 'json',
    no_html: '1',
    skip_disambig: '1',
  }).toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`DuckDuckGo failed (${response.status})`);
  const data = await response.json();
  const related = (data.RelatedTopics || [])
    .flatMap((item) => (item.Topics ? item.Topics : [item]))
    .filter((item) => item.Text)
    .slice(0, 5)
    .map((item) => ({
      title: item.Text.slice(0, 80),
      url: item.FirstURL || '',
      snippet: item.Text,
    }));
  return {
    ok: true,
    source: 'DuckDuckGo',
    answer: data.AbstractText || data.Answer || '',
    results: related,
  };
}

export async function fetchSearch({ query, tavilyKey, googleCseKey, googleCseId }) {
  const topic = searchTerms(query) || (query || '').trim();
  if (!topic) return { ok: false, reason: 'Empty search query.' };

  let wiki = null;
  try {
    wiki = await fetchWikipedia(topic);
  } catch {
    wiki = null;
  }
  if (wiki && !wikiRelevant(topic, wiki)) wiki = null;

  let web = { ok: false, source: '', answer: '', results: [] };
  if (tavilyKey) {
    try {
      web = await searchTavily(query || topic, tavilyKey);
    } catch {
      web = { ok: false, source: '', answer: '', results: [] };
    }
  }
  if (!web.ok && googleCseKey && googleCseId) {
    try {
      web = await searchGoogleCse(query || topic, googleCseKey, googleCseId);
    } catch {
      web = { ok: false, source: '', answer: '', results: [] };
    }
  }
  if (!web.ok) {
    try {
      web = await searchDuckDuckGo(query || topic);
    } catch (error) {
      web = { ok: false, reason: error.message || 'Search failed.', answer: '', results: [] };
    }
  }

  if (!wiki && !web.ok) {
    return { ok: false, reason: web.reason || 'No live sources found. Do not invent facts.' };
  }

  const packed = {
    ok: true,
    source: [wiki ? 'Wikipedia' : null, web.source].filter(Boolean).join(' + '),
    wiki,
    answer: web.answer || '',
    results: web.results || [],
  };
  packed.notes = compactNotes(packed);
  return packed;
}
