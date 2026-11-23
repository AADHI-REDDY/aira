import { matchSkill } from '../skills/assistantSkills.js';
import { generateReply } from '../ai/aiClient.js';
import { assistantLog } from './assistantLogger.js';
import {
  classifyIntent,
  resolveFollowUp,
  sessionPatchFromTurn,
  splitTasks,
} from './intentService.js';
import { isLanguageSwitch, loadSession, resetSession, updateSession } from './contextService.js';

export { resetSession };

const ONLINE_HINT = /\b(weather|rain|forecast|search|news|translate|wikipedia|who is|what happened)\b/i;

function applyLocalSkill(skill, runtime) {
  if (!skill || !runtime) return;
  if (skill.type === 'stop') runtime.cancelSpeech?.();
  if (skill.type === 'timer' && skill.ms) runtime.startTimer?.(skill.ms, 'Timer');
  if (skill.type === 'reminder' && skill.ms) runtime.addReminder?.(skill.ms, skill.note);
  if (skill.type === 'speech') runtime.applySpeechCommand?.(skill);
}

export async function runAssistantTurn({
  userText,
  history,
  settings,
  detectedLanguageId,
  runtime,
}) {
  const original = (userText || '').trim();
  const session = loadSession();
  const languageTurn = isLanguageSwitch(original);
  const resolved = languageTurn ? original : resolveFollowUp(original, session);
  const intent = classifyIntent(resolved, session);

  assistantLog('turn', {
    text: original,
    resolved: resolved === original ? undefined : resolved,
    intent: intent.name,
    language: detectedLanguageId,
    topic: session.topic,
  });

  const parts = splitTasks(resolved);
  const localHits = [];
  let needsOnline = parts.length === 0;

  parts.forEach((part) => {
    const skill = matchSkill(part, session);
    if (skill) {
      applyLocalSkill(skill, runtime);
      localHits.push(skill);
      if (ONLINE_HINT.test(part) && (skill.type === 'ask' || skill.type === 'remember')) {
        needsOnline = true;
      }
    } else {
      needsOnline = true;
    }
  });

  const onlyLocal = localHits.length
    && localHits.every((hit) => hit.type !== 'ask')
    && !needsOnline
    && localHits.length === parts.length
    && intent.name !== 'weather'
    && intent.name !== 'search'
    && intent.name !== 'news'
    && intent.name !== 'translate';

  const patch = sessionPatchFromTurn(resolved, intent, localHits[0]);
  const responseLanguageId = patch.responseLanguageId
    || (settings.responseLanguage && settings.responseLanguage !== 'auto'
      ? settings.responseLanguage
      : detectedLanguageId);

  let nextSession = updateSession(session, {
    ...patch,
    inputLanguageId: detectedLanguageId,
    responseLanguageId,
  });

  if (onlyLocal) {
    const reply = localHits.map((hit) => hit.reply).filter(Boolean).join(' ');
    nextSession = updateSession(nextSession, sessionPatchFromTurn(resolved, intent, localHits[0]));
    assistantLog('local-complete', { types: localHits.map((hit) => hit.type) });
    return {
      text: reply,
      source: 'skill',
      toolsUsed: localHits.map((hit) => hit.type),
      usedFallback: false,
      skipSpeak: localHits.some((hit) => hit.type === 'stop' || hit.action === 'repeat'),
      resolvedText: resolved,
      intent: intent.name,
    };
  }

  const reply = await generateReply({
    userText: original,
    resolvedUserText: resolved,
    history,
    detectedLanguageId,
    settings,
    runtime,
    session: nextSession,
  });

  if (reply?.text && /live weather for\s+([^:]+):/i.test(reply.text)) {
    const city = reply.text.match(/live weather for\s+([^:]+):/i)[1].split(',')[0].trim();
    updateSession(nextSession, { topic: 'weather', city, lastTool: 'get_weather' });
  }

  if (localHits.length && reply?.text) {
    const localText = localHits.map((hit) => hit.reply).filter(Boolean).join(' ');
    if (localText && !reply.text.toLowerCase().includes(localHits[0].reply.slice(0, 18).toLowerCase())) {
      return {
        ...reply,
        text: `${localText} ${reply.text}`.trim(),
        toolsUsed: [...localHits.map((hit) => hit.type), reply.source],
        resolvedText: resolved,
        intent: intent.name,
      };
    }
  }

  return { ...reply, toolsUsed: reply.toolsUsed || [reply.source], resolvedText: resolved, intent: intent.name };
}
