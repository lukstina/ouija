const replies = [
  'A new signal stirs. Something curious is calling.',
  'Trust your curiosity. Even ghosts take the first step.',
  'The spirits are roaming. Your answer may arrive after midnight.',
  'Beware the meeting that could have been an email.',
  'A small surprise awaits beyond the next dead zone.',
];
export function getDemoReply(question) {
  const text = question.trim();
  if (!text) throw new Error('Please enter a question.');
  const hash = [...text.toLowerCase()].reduce((sum, letter) => sum + letter.codePointAt(0), 0);
  return replies[hash % replies.length];
}
