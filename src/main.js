import './style.css';
import { getDemoReply } from './replies.js';
const letters = document.querySelector('#letters');
for (const row of ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', '1234567890']) {
  const line = document.createElement('div');
  line.className = 'letter-row';
  for (const letter of row) {
    const cell = document.createElement('span');
    cell.textContent = letter;
    cell.dataset.letter = letter;
    line.append(cell);
  }
  letters.append(line);
}
const form = document.querySelector('form');
const answer = document.querySelector('#answer');
const announcement = document.querySelector('#announcement');
const ask = document.querySelector('#ask');
const pointer = document.querySelector('#planchette');
const board = document.querySelector('.board');
let timer;
let current = '';
let index = 0;
let activeLetter;
function finish() {
  clearTimeout(timer);
  answer.textContent = current;
  announcement.textContent = current;
  ask.disabled = false;
  activeLetter?.classList.remove('active');
}
function spell() {
  if (index >= current.length) return finish();
  const character = current[index++];
  activeLetter?.classList.remove('active');
  activeLetter = [...letters.querySelectorAll('span')].find(cell => cell.dataset.letter === character.toUpperCase());
  if (activeLetter) {
    activeLetter.classList.add('active');
    const rect = activeLetter.getBoundingClientRect();
    const base = board.getBoundingClientRect();
    pointer.style.left = `${rect.left - base.left + rect.width / 2}px`;
    pointer.style.top = `${rect.top - base.top + rect.height / 2}px`;
  }
  answer.textContent = current.slice(0, index);
  timer = setTimeout(spell, /[a-z0-9]/i.test(character) ? 420 : 180);
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const question = document.querySelector('#question');
  if (!question.value.trim() || ask.disabled) return;
  current = getDemoReply(question.value);
  index = 0;
  answer.textContent = '';
  announcement.textContent = 'The board is spelling your answer.';
  ask.disabled = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
  else spell();
});
