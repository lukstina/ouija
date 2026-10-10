const replies = [
  'A new door will open. Be ready.',
  'Trust your curiosity. Take the first step.',
  'The answer may come when you pause.',
  'Reach out to someone you miss.',
  'Something small will bring you joy.',
];
export function getDemoReply(question) {
  const text = question.trim();
  if (!text) throw new Error('Please enter a question.');
  const hash = [...text.toLowerCase()].reduce((sum, letter) => sum + letter.codePointAt(0), 0);
  return replies[hash % replies.length];
}
