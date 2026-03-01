import { Template } from './types';

export const StaticTemplates: Template[] = [
  {
    id: 'tpl-1',
    title: 'Grade 1 Phonics Booklet',
    description: 'A comprehensive phonics booklet covering vowel sounds and simple consonant blends.',
    grade: '1',
    subject: 'Home Language',
    contentType: 'booklet-reading-handwriting-phonics',
    category: 'Foundation',
    content: `
      <div class="font-patrick-hand">
        <h1>Phonics Fun!</h1>
        <p>Let's learn our sounds today.</p>
        <hr />
        <h2>Vowel Sounds: a, e, i, o, u</h2>
        <p>Circle the words that start with 'a':</p>
        <ul>
          <li>Apple 🍎</li>
          <li>Bat 🦇</li>
          <li>Ant 🐜</li>
        </ul>
        <hr />
        <p>Practice writing your name:</p>
        <p>Name: ____________________</p>
      </div>
    `,
    rubric: 'Participation: 5 points. Correct identification: 5 points.',
  },
  {
    id: 'tpl-2',
    title: 'Grade 4 History: SA Heritage',
    description: 'A reading comprehension and worksheet about South African national symbols.',
    grade: '4',
    subject: 'Social Sciences',
    contentType: 'reading-comprehension',
    category: 'Intermediate',
    content: `
      <div>
        <h1>South African Heritage</h1>
        <p>South Africa is a beautiful country with many symbols. The flag has six colors.</p>
        <hr />
        <h2>Questions:</h2>
        <p>1. How many colors are in the SA flag?</p>
        <p>2. What is our national animal?</p>
      </div>
    `,
    rubric: 'Each question is worth 5 marks. Total: 10 marks.',
  },
  {
    id: 'tpl-3',
    title: 'Grade 10 Math: Functions Intro',
    description: 'A study guide and exercise set for linear and quadratic functions.',
    grade: '10',
    subject: 'Mathematics',
    contentType: 'study-guide-notes',
    category: 'FET',
    content: `
      <div>
        <h1>Introduction to Functions</h1>
        <p>A function is a rule that assigns each input to exactly one output.</p>
        <h3>Linear Functions: y = mx + c</h3>
        <p>m is the gradient, c is the y-intercept.</p>
        <hr />
        <h2>Exercises:</h2>
        <p>1. Find the gradient of y = 3x - 5.</p>
      </div>
    `,
    rubric: '10 marks for correct gradient and explanation.',
  }
];
