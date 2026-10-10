import './style.css';
import { getReply } from './oracle.js';
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
  const boardLetter = character.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  activeLetter = [...letters.querySelectorAll('span')].find(cell => cell.dataset.letter === boardLetter);
  if (activeLetter) {
    activeLetter.classList.add('active');
    const rect = activeLetter.getBoundingClientRect();
    const base = board.getBoundingClientRect();
    pointer.style.left = `${rect.left - base.left + rect.width / 2}px`;
    pointer.style.top = `${rect.top - base.top + rect.height / 2}px`;
  }
  answer.textContent = current.slice(0, index);
  timer = setTimeout(spell, /[\p{L}\p{N}]/u.test(character) ? 200 : 80);
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const question = document.querySelector('#question');
  if (!question.value.trim() || ask.disabled) return;
  ask.disabled = true;
  ask.textContent = 'Listening…';
  answer.textContent = '';
  announcement.textContent = 'The oracle is listening.';
  current = await getReply(question.value.trim());
  ask.textContent = 'Ask the board';
  index = 0;
  announcement.textContent = 'The board is spelling your answer.';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
  else spell();
});
