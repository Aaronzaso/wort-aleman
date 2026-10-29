import { checkAnswer } from './learning.js';

const integer = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const permutation = (value, original) => Array.isArray(value) && value.length === original.length && [...value].sort().every((item, i) => item === [...original].sort()[i]);
export const draftId = (session) => session.type === 'lesson' ? `lesson:${session.lesson.id}` : `review:${session.categoryIds?.slice().sort().join(',') || 'all'}`;

export function snapshotPractice(session, now = Date.now()) {
  if (!session || session.stage === 'done' || (session.type === 'review' && session.index >= session.items.length)) return null;
  const common = { version: 1, id: draftId(session), type: session.type, savedAt: now, index: session.index };
  if (session.type === 'review') return { ...common, itemIds: session.items.map(card => card.id), revealed: !!session.revealed, categoryIds: session.categoryIds || [] };
  return { ...common, lessonId: session.lesson.id, stage: session.stage, exerciseIndex: session.exerciseIndex,
    queue: session.queue.map(item => ({ key: item.key, options: item.options, tokens: item.tokens })),
    wrong: [...session.wrong], correct: session.correct, selected: session.selected,
    checked: !!session.checked, tokens: [...session.tokens], written: session.written || '' };
}

/** Resolve IDs against current authored content; never trust stored executable content. */
export function restorePractice(raw, lessons, cards) {
  try {
    if (!raw || raw.version !== 1 || !Number.isFinite(raw.savedAt) || raw.savedAt < 0) return null;
    if (raw.type === 'review') {
      if (!Array.isArray(raw.itemIds) || raw.itemIds.length < 1 || raw.itemIds.length > 200 || new Set(raw.itemIds).size !== raw.itemIds.length || !integer(raw.index, raw.itemIds.length - 1)) return null;
      const items = raw.itemIds.map(id => cards.find(card => card.id === id));
      if (items.some(item => !item)) return null;
      if (raw.id !== `review:${raw.categoryIds?.slice().sort().join(',') || 'all'}`) return null;
      return { type: 'review', items, index: raw.index, revealed: !!raw.revealed, categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds.filter(id => typeof id === 'string' && id.length < 100) : [] };
    }
    const lesson = lessons.find(item => item.id === raw.lessonId);
    if (raw.id !== `lesson:${lesson?.id}`) return null;
    if (raw.type !== 'lesson' || !lesson || !['study','exercise'].includes(raw.stage) || !integer(raw.index, lesson.cards.length - 1) || !Array.isArray(raw.queue) || raw.queue.length < lesson.exercises.length || raw.queue.length > lesson.exercises.length * 2 || !integer(raw.exerciseIndex, raw.queue.length - 1)) return null;
    const queue = raw.queue.map((item, index) => {
      if (!integer(item.key, lesson.exercises.length - 1) || (index < lesson.exercises.length && item.key !== index)) throw Error();
      const authored = lesson.exercises[item.key];
      if ((authored.options && !permutation(item.options, authored.options)) || (authored.tokens && !permutation(item.tokens, authored.tokens))) throw Error();
      return { ...authored, key: item.key, options: authored.options ? [...item.options] : undefined, tokens: authored.tokens ? [...item.tokens] : undefined };
    });
    const current = queue[raw.exerciseIndex];
    if (raw.selected !== null && !integer(raw.selected, (current.options?.length || 0) - 1)) return null;
    if (!Array.isArray(raw.tokens) || new Set(raw.tokens).size !== raw.tokens.length || raw.tokens.some(i => !integer(i, (current.tokens?.length || 0) - 1))) return null;
    if (!Array.isArray(raw.wrong) || raw.wrong.some(i => !integer(i, lesson.exercises.length - 1)) || !integer(raw.correct, lesson.exercises.length) || typeof raw.written !== 'string' || raw.written.length > 5000) return null;
    const repeats = queue.slice(lesson.exercises.length).map(item => item.key);
    if (new Set(repeats).size !== repeats.length || repeats.some(key => !raw.wrong.includes(key))) return null;
    const answer = current.options ? current.options[raw.selected] || '' : current.tokens ? raw.tokens.map(i => current.tokens[i]).join(' ') : raw.written;
    if (raw.checked && !answer.trim()) return null;
    return { type: 'lesson', lesson, stage: raw.stage, index: raw.index, exerciseIndex: raw.exerciseIndex, queue, wrong: new Set(raw.wrong), correct: raw.correct, selected: raw.selected, checked: !!raw.checked, tokens: [...raw.tokens], written: raw.written, result: raw.checked ? checkAnswer(answer, current.answer) : undefined };
  } catch { return null; }
}

export function createPracticeStore(storage, lessons, cards) {
  const key = owner => `wort-practices-v1:${owner || 'guest'}`;
  function read(owner) {
    try {
      const value = JSON.parse(storage.getItem(key(owner)) || '[]');
      return Array.isArray(value) ? value.filter(item => restorePractice(item, lessons, cards)).slice(0, 24) : [];
    } catch { return []; }
  }
  return {
    list: read,
    load(owner, id) { return restorePractice(read(owner).find(item => item.id === id), lessons, cards); },
    save(owner, session) {
      const id = draftId(session), snapshot = snapshotPractice(session);
      const list = read(owner).filter(item => item.id !== id);
      if (snapshot) list.unshift(snapshot);
      storage.setItem(key(owner), JSON.stringify(list.slice(0,24)));
    },
    clear(owner) { storage.removeItem(key(owner)); },
  };
}
