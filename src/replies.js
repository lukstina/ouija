const replies = [
  'Full coverage. Eternal retargeting. Roaming charges might apply.',
  'Even the undead clicked. Now haunt the conversion funnel.',
  'Your next brief arrives from the Other side.',
  'The approval chain only needs one more resurrection.',
  'Your leads crossed over. Try retargeting the Other side.',
];
export function getDemoReply(question) {
  const text = question.trim();
  if (!text) throw new Error('Please enter a question.');
  const hash = [...text.toLowerCase()].reduce((sum, letter) => sum + letter.codePointAt(0), 0);
  return replies[hash % replies.length];
}
